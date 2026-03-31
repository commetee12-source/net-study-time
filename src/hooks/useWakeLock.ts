// Design Ref: §5.3 Study Page — Wake Lock API (화면 꺼짐 방지)

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isRequestedRef = useRef(false);

  const acquireLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
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

  const request = useCallback(async () => {
    isRequestedRef.current = true;
    await acquireLock();
  }, [acquireLock]);

  const release = useCallback(() => {
    isRequestedRef.current = false;
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setIsLocked(false);
  }, []);

  // 백그라운드 복귀 시 Wake Lock 자동 재요청
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isRequestedRef.current) {
        acquireLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [acquireLock]);

  return { isLocked, request, release };
}
