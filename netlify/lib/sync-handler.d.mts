export const LIMITS: {
  maxBytes: number;
  maxKeys: number;
  maxTracks: number;
  unplayedMs: number;
  unseenMs: number;
  seenEveryMs: number;
  sweepAbove: number;
};
export const KEY_PATTERN: RegExp;
export interface SyncStore {
  getWithMetadata(key: string, options?: { type: "text" }): Promise<{ data: string | null; etag: string; metadata: Record<string, any> } | null>;
  getMetadata(key: string): Promise<{ etag: string; metadata: Record<string, any> } | null>;
  set(key: string, value: string, options?: { metadata?: Record<string, any>; onlyIfNew?: boolean; onlyIfMatch?: string }): Promise<{ modified: boolean; etag?: string }>;
  delete(key: string): Promise<void>;
  list(): Promise<{ blobs: Array<{ key: string }> }>;
}
export function mintKey(random?: (n: number) => Uint8Array): string;
export function problemWith(text: string): string | null;
export function expired(meta: unknown, now: number): boolean;
export function sweep(store: SyncStore, now: number): Promise<number>;
export function handle(request: Request, store: SyncStore, now?: number): Promise<Response>;
