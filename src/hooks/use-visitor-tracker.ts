"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type VisitorStats = {
  online: number;
  today: number;
  total: number;
  thisWeek?: number;
  thisMonth?: number;
};

/**
 * Hook to track visitors in real-time and get visitor stats.
 * - Generates a persistent sessionId (stored in sessionStorage)
 * - Sends heartbeat every 30 seconds to keep session alive
 * - Polls for updated stats every 10 seconds
 */
export function useVisitorTracker(activeView?: string) {
  const [stats, setStats] = useState<VisitorStats>({
    online: 0,
    today: 0,
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
  });
  const [isTracking, setIsTracking] = useState(false);
  const sessionIdRef = useRef<string>("");
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeViewRef = useRef(activeView);

  // Keep activeViewRef in sync
  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Generate or retrieve a persistent session ID
    let sid = sessionStorage.getItem("visitor_sid");
    if (!sid) {
      sid = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("visitor_sid", sid);
    }
    sessionIdRef.current = sid;

    // Track visit (sends heartbeat)
    const doTrack = async () => {
      try {
        const res = await fetch("/api/pengunjung/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid!, halaman: activeViewRef.current || "dashboard" }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.stats) {
            setStats((prev) => ({
              ...prev,
              online: json.stats.online ?? prev.online,
              today: json.stats.today ?? prev.today,
              total: json.stats.total ?? prev.total,
            }));
          }
          setIsTracking(true);
        }
      } catch {
        // Silently fail — visitor tracking should not block the app
      }
    };

    // Fetch stats only (no tracking)
    const doFetchStats = async () => {
      try {
        const res = await fetch("/api/pengunjung/stats");
        if (res.ok) {
          const json = await res.json();
          setStats({
            online: json.online ?? 0,
            today: json.today ?? 0,
            total: json.total ?? 0,
            thisWeek: json.thisWeek ?? 0,
            thisMonth: json.thisMonth ?? 0,
          });
        }
      } catch {
        // Silently fail
      }
    };

    // Initial track
    doTrack();

    // Heartbeat every 30 seconds
    heartbeatRef.current = setInterval(doTrack, 30_000);

    // Poll stats every 10 seconds
    pollRef.current = setInterval(doFetchStats, 10_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Re-track when activeView changes
  useEffect(() => {
    if (!sessionIdRef.current || !isTracking) return;
    const doTrack = async () => {
      try {
        const res = await fetch("/api/pengunjung/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current, halaman: activeView || "dashboard" }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.stats) {
            setStats((prev) => ({
              ...prev,
              online: json.stats.online ?? prev.online,
              today: json.stats.today ?? prev.today,
              total: json.stats.total ?? prev.total,
            }));
          }
        }
      } catch {
        // Silently fail
      }
    };
    doTrack();
  }, [activeView, isTracking]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/pengunjung/stats");
      if (res.ok) {
        const json = await res.json();
        setStats({
          online: json.online ?? 0,
          today: json.today ?? 0,
          total: json.total ?? 0,
          thisWeek: json.thisWeek ?? 0,
          thisMonth: json.thisMonth ?? 0,
        });
      }
    } catch {
      // Silently fail
    }
  }, []);

  return { stats, isTracking, fetchStats };
}
