# TypeScript crib (read once, 10 minutes)

[Back to the index](README.md)

- `interface X { a: number; b?: string }`: a record type; `?` means the field may be missing.
- `type T = A | B`, and `{ kind: "move"; ... } | { kind: "look"; ... }`: a sum type; `switch (op.kind) { case "move": ... }` narrows it.
- `Record<string, X>`: a dictionary. `Partial<T>`: all fields optional. `Omit<T, "zones">`: T without that field. `Pick<T, "a" | "b">`.
- `{ ...a, ...b }`: record merge, right side wins. `tasks.map((t) => ({ ...t, ...RULES[t.id] }))` in `tasks.ts` is a left-biased merge of two tables.
- `x!` asserts "not null/undefined"; `x ?? y` is `fromMaybe`; `x?.y` is safe access.
- `import type { X }` is erased at build time. `class A extends B` and `abstract` exist; `private` is compile-time only; `readonly` is shallow.
- `as const` freezes literal types; `as Record<string, string>` is a cast the compiler trusts you on.
- Tests are Vitest: `describe`, `it`, `expect(x).toBe(1)` / `.toEqual({...})` (deep) / `.toThrow(/text/)`.

---

[Back to the index](README.md)
