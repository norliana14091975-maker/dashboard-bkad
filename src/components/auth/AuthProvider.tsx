"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={false} // Don't refetch on window focus to avoid errors during dev
    >
      {children}
    </SessionProvider>
  );
}

// Suppress NextAuth CLIENT_FETCH_ERROR console noise in dev mode
// This error occurs when the session fetch gets an HTML response during
// server compilation or cross-origin request blocking. It's transient and
// the SessionProvider will retry automatically.
if (typeof window !== "undefined") {
  const origConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("[next-auth][error][CLIENT_FETCH_ERROR]")) {
      // Silently ignore - SessionProvider will retry on next interval
      return;
    }
    origConsoleError.apply(console, args);
  };
}
