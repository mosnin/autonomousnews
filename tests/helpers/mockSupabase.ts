// Minimal Supabase client mock factory used by /api/* tests.
//
// Each helper returns chainable mock builders that resolve to the values the
// route code under test expects. We don't aim for full fidelity — only the
// surface we actually use.

import { vi, type Mock } from "vitest";

type Resolved<T> = { data: T | null; error: { message: string } | null };

export type TableInteraction = {
  /** which table .from() was called with */
  table: string;
  /** named ops captured per chain leaf */
  ops: { op: string; args: unknown[] }[];
};

export function makeChainableQuery(result: Resolved<unknown>) {
  // A proxy-ish builder that records every called method, and a final
  // .then() / .maybeSingle() / .select() that resolves to `result`.
  const ops: { op: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {};

  const fns = [
    "select", "insert", "upsert", "update", "delete", "eq", "neq",
    "in", "gte", "lte", "lt", "gt", "or", "ilike", "is", "not",
    "contains", "order", "limit", "range", "single", "maybeSingle",
  ];

  for (const f of fns) {
    builder[f] = vi.fn(function (this: unknown, ...args: unknown[]) {
      ops.push({ op: f, args });
      return builder;
    });
  }

  // Make the builder awaitable.
  (builder as { then?: unknown }).then = (
    resolve: (v: Resolved<unknown>) => void
  ) => Promise.resolve(result).then(resolve);

  return { builder, ops };
}

export function makeSupabaseMock(opts: {
  // Provide responses keyed by `${table}.${operation}` or `${table}` (catch-all).
  responses?: Record<string, Resolved<unknown>>;
  rpc?: (name: string, args: Record<string, unknown>) => Resolved<unknown> | Promise<Resolved<unknown>>;
  storage?: {
    upload?: (path: string, body: ArrayBuffer | Uint8Array) => { error: { message: string } | null };
    getPublicUrl?: (path: string) => { data: { publicUrl: string } };
    getBucket?: (id: string) => Resolved<{ public: boolean }>;
  };
} = {}) {
  const interactions: TableInteraction[] = [];
  const from = vi.fn((table: string) => {
    const result = opts.responses?.[table] ?? { data: null, error: null };
    const { builder, ops } = makeChainableQuery(result);
    interactions.push({ table, ops });
    return builder;
  });

  const rpc: Mock = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (opts.rpc) return opts.rpc(name, args);
    return { data: null, error: null };
  });

  const storage = {
    from: vi.fn(() => ({
      upload: vi.fn(async (path: string, body: ArrayBuffer | Uint8Array) =>
        opts.storage?.upload?.(path, body) ?? { error: null }
      ),
      getPublicUrl: vi.fn((path: string) =>
        opts.storage?.getPublicUrl?.(path) ?? {
          data: { publicUrl: `https://cdn.example/${path}` },
        }
      ),
    })),
    getBucket: vi.fn(async (id: string) =>
      opts.storage?.getBucket?.(id) ?? { data: { public: true }, error: null }
    ),
  };

  return {
    client: { from, rpc, storage },
    interactions,
  };
}
