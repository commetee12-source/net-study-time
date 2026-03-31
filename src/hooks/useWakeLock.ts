// Design Ref: §5.3 Study Page — Wake Lock API (화면 꺼짐 방지)

"use client";

import { useCallback, useRef, useState } from "react";

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        setIsLocked(true);
        wakeLockRef.current.addEventListener("release", () => {
          setIsLocked(false);
        });
      }
    } catch {
      // Wake Lock request failed (e.g. low battery, not supported)
    }
  }, []);

  const release = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setIsLocked(false);
  }, []);

  return { isLocked, request, release };
}
