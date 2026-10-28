import type { SyncStore } from "./sync-handler.mjs";
export function memoryStore(): SyncStore & { map: Map<string, { data: string; etag: string; metadata: Record<string, any> }> };
