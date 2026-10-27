import { describe, expect, it, vi } from "vitest";
import { checkCore, loadCore, type Core } from "./core";
import { realBackend } from "./real";
import type { StudySession } from "./study";

const KEY = "abcdefghij0123456789abcdefghij01";
const ORIGIN = "https://palabras.test";
const URL = `${ORIGIN}/api/progress/${KEY}/es`;

// A tiny stand-in for the core with the same contract: progress is a JSON string
// {slug: seen}, merge keeps the higher count, the session is what is not yet seen.
function fakeCore(overrides: Partial<Core> = {}): Core & { calls: string[] } {
  const calls: string[] = [];
  const read = (p: string | null): Record<string, number> => (p ? JSON.parse(p) : {});
  return {
    calls,
    version: 1,
    session: (p) => {
      calls.push("session");
      return ["a", "b", "c"].filter((s) => !(s in read(p)));
    },
    card: (_p, slug) => {
      calls.push(`card:${slug}`);
      return { slug, prompt: slug.toUpperCase(), answers: [`${slug}1`, `${slug}2`], example: slug === "a" ? "ejemplo" : "", direction: "recognition" };
    },
    grade: (p, slug, gotIt) => {
      calls.push(`grade:${slug}:${gotIt}`);
      return JSON.stringify({ ...read(p), [slug]: (read(p)[slug] ?? 0) + 1 });
    },
    merge: (mine, theirs) => {
      calls.push("merge");
      const a = read(mine);
      const b = read(theirs);
      const out: Record<string, number> = { ...b };
      for (const [k, v] of Object.entries(a)) out[k] = Math.max(v, b[k] ?? 0);
      return JSON.stringify(out);
    },
    ipa: (slug, dialect) => {
      calls.push(`ipa:${slug}:${dialect}`);
      return slug === "c" ? null : `ˈ${slug}`;
    },
    requeue: (slug, position, queue) => [...queue.slice(0, position + 1), slug, ...queue.slice(position + 1)],
    ...overrides,
  };
}

// A server that is a blob store, as the app's is.
function fakeServer(initial: string | null = null) {
  const log: string[] = [];
  const state = { blob: initial, status: 0, putStatus: 0, down: false };
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    log.push(`${method} ${String(input)}`);
    if (state.down) throw new TypeError("Failed to fetch");
    if (method === "PUT") {
      if (state.putStatus) return new Response("no", { status: state.putStatus });
      state.blob = String(init!.body);
      return new Response('{"ok":true}');
    }
    if (state.status) return new Response("no", { status: state.status });
    return state.blob === null ? new Response("{}", { status: 404 }) : new Response(state.blob);
  }) as typeof fetch;
  return { state, log, fetch: fetchImpl };
}

const open = async (server: ReturnType<typeof fakeServer>, core: Core = fakeCore()) => {
  const backend = realBackend({ core: async () => core, fetch: server.fetch, origin: ORIGIN, now: () => 1000 });
  return backend.open(KEY);
};

describe("checkCore", () => {
  it("accepts the contract and refuses anything else, saying what is wrong", () => {
    expect(checkCore(fakeCore(), 1).version).toBe(1);
    expect(() => checkCore(null, 1)).toThrow(/module/);
    expect(() => checkCore({ ...fakeCore(), version: 2 }, 1)).toThrow(/version 2/);
    expect(() => checkCore({ ...fakeCore(), version: undefined }, 1)).toThrow(/version undefined/);
    for (const name of ["session", "card", "grade", "merge", "requeue"]) {
      expect(() => checkCore({ ...fakeCore(), [name]: undefined }, 1), name).toThrow(new RegExp(`no ${name}`));
    }
  });

  it("loads through an injected importer", async () => {
    const importer = vi.fn(async () => fakeCore());
    await loadCore("https://x/core.v1.js", 1, importer);
    expect(importer).toHaveBeenCalledWith("https://x/core.v1.js");
    await expect(loadCore("u", 1, async () => ({ version: 9 }))).rejects.toThrow(/version 9/);
    await expect(loadCore("u", 1, async () => Promise.reject(new Error("404")))).rejects.toThrow("404");
  });
});

// The proposed `core.overview`, as a stand-in over the fake core's {slug: seen} blob.
const standIn: NonNullable<Core["overview"]> = (p, now = 0) => {
  const seen = Object.keys(p ? JSON.parse(p) : {}).length;
  return { total: 3, seen, mastered: 0, dueNow: 0, dueTomorrow: 0, nextDueIn: seen > 0 ? 3600_000 + now * 0 : null };
};

describe("realBackend progress (the optional core.overview)", () => {
  it("has no figures when the core has no overview, and does not ask for one", async () => {
    const session = (await open(fakeServer(JSON.stringify({ a: 1 })))) as StudySession;
    expect(session.progress?.()).toBeNull();
  });

  it("reads the figures from the core, from the progress as it stands after an answer", async () => {
    const server = fakeServer(null);
    const session = (await open(server, fakeCore({ overview: standIn }))) as StudySession;
    expect(session.progress?.()).toEqual({ total: 3, seen: 0, mastered: 0, dueNow: 0, dueTomorrow: 0, nextDueInMs: null });
    expect(await session.grade("a", "gotit")).toBe(true);
    expect(session.progress?.()?.seen).toBe(1);
    expect(session.progress?.()?.nextDueInMs).toBe(3600_000);
  });

  it("shows nothing when the core throws or answers something that is not plain counts", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const throws = (await open(fakeServer(null), fakeCore({ overview: () => { throw new Error("boom"); } }))) as StudySession;
    expect(throws.progress?.()).toBeNull();
    for (const bad of [null, "x", { total: 3 }, { total: 3, seen: 9, mastered: 0, dueNow: 0, dueTomorrow: 0, nextDueIn: null }]) {
      const s = (await open(fakeServer(null), fakeCore({ overview: (() => bad) as never }))) as StudySession;
      expect(s.progress?.()).toBeNull();
    }
    warn.mockRestore();
  });

  it("is not required of a core", () => {
    expect(checkCore(fakeCore(), 1).overview).toBeUndefined();
    expect(checkCore(fakeCore({ overview: standIn }), 1).overview).toBe(standIn);
  });
});

describe("realBackend.open", () => {
  it("pays points and builds the session from what the server holds", async () => {
    const server = fakeServer(JSON.stringify({ a: 1 }));
    const backend = realBackend({ core: async () => fakeCore(), fetch: server.fetch, origin: ORIGIN });
    expect(backend.paysPoints).toBe(true);
    const session = (await backend.open(KEY)) as StudySession;
    expect(session.queue()).toEqual(["b", "c"]);
    expect(server.log).toEqual([`GET ${URL}`]);
  });

  it("starts from nothing when the server has no progress yet", async () => {
    const session = (await open(fakeServer(null))) as StudySession;
    expect(session.queue()).toEqual(["a", "b", "c"]);
  });

  it("maps a refused key, a down network, a server error and a bad core to the right results", async () => {
    const s400 = fakeServer();
    s400.state.status = 400;
    expect(await open(s400)).toBe("bad-key");
    const s500 = fakeServer();
    s500.state.status = 500;
    expect(await open(s500)).toBe("offline");
    const down = fakeServer();
    down.state.down = true;
    expect(await open(down)).toBe("offline");
    const backend = realBackend({ core: async () => Promise.reject(new Error("version")), fetch: fakeServer().fetch, origin: ORIGIN });
    expect(await backend.open(KEY)).toBe("offline");
  });

  it("says unreadable, and writes nothing, when the core refuses what the server holds", async () => {
    const server = fakeServer("garbage");
    const core = fakeCore({
      session: () => {
        throw new Error("newer version");
      },
    });
    expect(await open(server, core)).toBe("unreadable");
    expect(server.log).toEqual([`GET ${URL}`]);
    expect(server.state.blob).toBe("garbage");
  });

  it("trims a trailing slash from the origin", async () => {
    const server = fakeServer();
    await realBackend({ core: async () => fakeCore(), fetch: server.fetch, origin: `${ORIGIN}///` }).open(KEY);
    expect(server.log[0]).toBe(`GET ${URL}`);
  });
});

describe("a real session", () => {
  it("shows cards through the core: prompt, joined answers, example as the hint", async () => {
    const session = (await open(fakeServer())) as StudySession;
    // The fake's cards are recognition: the prompt is the Spanish, so it is spoken first.
    expect(session.card("a")).toEqual({ slug: "a", prompt: "A", answer: "a1, a2", hint: "ejemplo", spoken: "A", ipa: "ˈa", speaks: "front" });
    expect(session.card("b")).toEqual({ slug: "b", prompt: "B", answer: "b1, b2", spoken: "B", ipa: "ˈb", speaks: "front" });
  });

  it("speaks the answer, on turning over, when the card is in production", async () => {
    const core = fakeCore({ card: (_p, slug) => ({ slug, prompt: "dog", answers: ["perro"], example: "", direction: "production" }) });
    const session = (await open(fakeServer(), core)) as StudySession;
    expect(session.card("a")).toMatchObject({ prompt: "dog", answer: "perro", spoken: "perro", speaks: "back" });
  });

  it("asks the core for the card's own word's transcription, in the configured dialect, in both directions", async () => {
    const core = fakeCore();
    const session = (await open(fakeServer(), core)) as StudySession;
    core.calls.length = 0;
    session.card("a");
    expect(core.calls).toContain("ipa:a:es-MX");
    const production = fakeCore({ card: (_p, slug) => ({ slug, prompt: "dog", answers: ["perro", "can"], example: "", direction: "production" }) });
    const s2 = (await open(fakeServer(), production)) as StudySession;
    expect(s2.card("a").ipa).toBe("ˈa");
  });

  it("leaves the transcription out when the core has none, lacks the function or throws", async () => {
    const none = (await open(fakeServer(), fakeCore())) as StudySession;
    expect("ipa" in none.card("c")).toBe(false);
    const { ipa: _ipa, ...without } = fakeCore();
    const old = (await open(fakeServer(), without as Core)) as StudySession;
    expect("ipa" in old.card("a")).toBe(false);
    const throwing = fakeCore({
      ipa: () => {
        throw new Error("boom");
      },
    });
    const t = (await open(fakeServer(), throwing)) as StudySession;
    expect(t.card("a")).toMatchObject({ prompt: "A" });
    expect("ipa" in t.card("a")).toBe(false);
    for (const value of [5, true, {}, ["a"], "  "]) {
      const odd = fakeCore({ ipa: (() => value) as unknown as Core["ipa"] });
      const card = ((await open(fakeServer(), odd)) as StudySession).card("a");
      expect("ipa" in card, JSON.stringify(value)).toBe(false);
    }
    const empty = fakeCore({ ipa: () => "" });
    expect("ipa" in ((await open(fakeServer(), empty)) as StudySession).card("a")).toBe(false);
  });

  it("composes accents so the font sees one letter", async () => {
    const decomposed = "canción";
    const core = fakeCore({ card: (_p, slug) => ({ slug, prompt: "song", answers: [decomposed], example: "", direction: "production" }) });
    const session = (await open(fakeServer(), core)) as StudySession;
    expect(session.card("a").answer).toBe("canción");
  });

  it("grades like the app: grade, GET, merge, PUT, in that order, and keeps the result", async () => {
    const server = fakeServer(JSON.stringify({ z: 5 }));
    const core = fakeCore();
    const session = (await open(server, core)) as StudySession;
    server.log.length = 0;
    core.calls.length = 0;
    expect(await session.grade("a", "gotit")).toBe(true);
    expect(core.calls).toEqual(["grade:a:true", "merge"]);
    expect(server.log).toEqual([`GET ${URL}`, `PUT ${URL}`]);
    // An answer given on the phone meanwhile (z) is kept, and ours is in.
    expect(JSON.parse(server.state.blob!)).toEqual({ z: 5, a: 1 });
    // The next answer builds on the merged progress.
    await session.grade("b", "again");
    expect(JSON.parse(server.state.blob!)).toEqual({ z: 5, a: 1, b: 1 });
  });

  it("reports an undelivered answer and does not keep it", async () => {
    const server = fakeServer();
    const session = (await open(server)) as StudySession;
    server.state.putStatus = 500;
    expect(await session.grade("a", "gotit")).toBe(false);
    expect(server.state.blob).toBeNull();
    server.state.putStatus = 0;
    server.state.down = true;
    expect(await session.grade("a", "gotit")).toBe(false);
    server.state.down = false;
    expect(await session.grade("a", "gotit")).toBe(true);
    // Only the delivered one counted: seen is 1, not 3.
    expect(JSON.parse(server.state.blob!)).toEqual({ a: 1 });
  });

  it("does not write when the server's copy cannot be read or the core throws", async () => {
    const server = fakeServer();
    const core = fakeCore({
      merge: () => {
        throw new Error("newer version");
      },
    });
    const session = (await open(server, core)) as StudySession;
    server.log.length = 0;
    expect(await session.grade("a", "gotit")).toBe(false);
    expect(server.log).toEqual([`GET ${URL}`]);
    expect(server.state.blob).toBeNull();
  });

  it("requeues through the core", async () => {
    const session = (await open(fakeServer())) as StudySession;
    expect(session.requeue(["a", "b", "c"], 0, "a")).toEqual(["a", "a", "b", "c"]);
  });
});
