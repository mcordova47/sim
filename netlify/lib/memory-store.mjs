// An in-memory stand-in for the part of a Netlify Blobs store that sync-handler.mjs uses. The dev fake in
// vite.config.ts and the tests share it. It is not part of the Netlify Function.
export function memoryStore() {
  const map = new Map();
  let n = 0;
  return {
    map,
    async getWithMetadata(key) {
      const e = map.get(key);
      return e ? { data: e.data, etag: e.etag, metadata: { ...e.metadata } } : null;
    },
    async getMetadata(key) {
      const e = map.get(key);
      return e ? { etag: e.etag, metadata: { ...e.metadata } } : null;
    },
    async set(key, data, o = {}) {
      const have = map.get(key);
      if ((o.onlyIfNew && have) || (o.onlyIfMatch !== undefined && have?.etag !== o.onlyIfMatch)) return { modified: false };
      map.set(key, { data, etag: String(++n), metadata: o.metadata ?? {} });
      return { modified: true, etag: String(n) };
    },
    async delete(key) {
      map.delete(key);
    },
    async list() {
      return { blobs: [...map.keys()].map((key) => ({ key })) };
    },
  };
}
