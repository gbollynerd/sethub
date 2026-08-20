"use client";

import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let cached: BrowserClient | null = null;

function realClient(): BrowserClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment (locally in .env.local, " +
        "on Vercel under Project Settings → Environment Variables).",
    );
  }

  cached = createBrowserClient(url, key);
  return cached;
}

/**
 * Browser Supabase client, created lazily.
 *
 * Client components commonly grab this during render (`useMemo(() => createClient(), [])`),
 * and Next runs that same render on the server when it prerenders a page at build
 * time. Constructing the real client there would demand the public env vars during
 * the build and hard-fail if they were absent. So this hands back a proxy and only
 * builds the actual client when a property is first touched — which only ever
 * happens in an event handler or effect, i.e. in the browser.
 */
export function createClient(): BrowserClient {
  return new Proxy({} as BrowserClient, {
    get(_target, prop) {
      const client = realClient() as unknown as Record<string | symbol, unknown>;
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
    has(_target, prop) {
      return prop in (realClient() as unknown as object);
    },
  });
}
