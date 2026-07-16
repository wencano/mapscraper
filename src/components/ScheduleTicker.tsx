"use client";

import { useEffect } from "react";

/** Demo helper: ping cron tick every 60s so scheduled scrapes can fire. */
export function ScheduleTicker() {
  useEffect(() => {
    const tick = () => {
      void fetch("/api/cron/tick", { method: "POST" }).catch(() => {});
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
