"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyState } from "@/lib/pose-analyzer";

export interface SessionStats {
  totalElapsed: number;    // 전체 경과 시간 (ms)
  focusTime: number;       // 실제 집중 시간 (ms)
  distractedTime: number;  // 딴짓 시간 (ms)
  awayTime: number;        // 자리비움 시간 (ms)
  focusRate: number;       // 집중도 (0~1)
  distractionCount: number; // 딴짓 횟수
}

interface UseStudyTimerOptions {
  targetMinutes: number;
  onTargetReached?: () => void;
  onDistracted?: () => void;
}

export function useStudyTimer(options: UseStudyTimerOptions) {
  const { targetMinutes, onTargetReached, onDistracted } = options;
  const targetMs = targetMinutes * 60 * 1000;

  const [focusTime, setFocusTime] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [distractedTime, setDistractedTime] = useState(0);
  const [awayTime, setAwayTime] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentStateRef = useRef<StudyState>("IDLE");
  const lastTickRef = useRef<number>(0);
  const wasDistractedRef = useRef(false);
  const isPageVisibleRef = useRef(true);
  const onDistractedRef = useRef(onDistracted);
  const onTargetReachedRef = useRef(onTargetReached);
  onDistractedRef.current = onDistracted;
  onTargetReachedRef.current = onTargetReached;

  // Page Visibility API: 앱이 백그라운드로 가면 순공시간 멈춤
  useEffect(() => {
    const handleVisibility = () => {
      isPageVisibleRef.current = document.visibilityState === "visible";
      if (isPageVisibleRef.current) {
        // 복귀 시 lastTick을 현재로 리셋하여 백그라운드 시간이 누적되지 않도록
        lastTickRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const tick = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;

    // 화면이 안 보이면 AWAY와 동일하게 처리
    if (!isPageVisibleRef.current) {
      setTotalElapsed((prev) => prev + delta);
      setAwayTime((prev) => prev + delta);
      wasDistractedRef.current = false;
      return;
    }

    const state = currentStateRef.current;

    setTotalElapsed((prev) => prev + delta);

    if (state === "FOCUS") {
      setFocusTime((prev) => {
        const next = prev + delta;
        if (next >= targetMs && prev < targetMs) {
          onTargetReachedRef.current?.();
          setIsCompleted(true);
        }
        return next;
      });
      wasDistractedRef.current = false;
    } else if (state === "DISTRACTED") {
      setDistractedTime((prev) => prev + delta);
      if (!wasDistractedRef.current) {
        wasDistractedRef.current = true;
        setDistractionCount((prev) => prev + 1);
        onDistractedRef.current?.();
      }
    } else if (state === "AWAY") {
      setAwayTime((prev) => prev + delta);
      wasDistractedRef.current = false;
    }
  }, [targetMs]);

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    lastTickRef.current = Date.now();
    intervalRef.current = setInterval(tick, 100); // 100ms 간격 업데이트
    setIsActive(true);
  }, [tick]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setFocusTime(0);
    setTotalElapsed(0);
    setDistractedTime(0);
    setAwayTime(0);
    setDistractionCount(0);
    setIsCompleted(false);
    currentStateRef.current = "IDLE";
    wasDistractedRef.current = false;
  }, [stopTimer]);

  const updateState = useCallback((state: StudyState) => {
    currentStateRef.current = state;
  }, []);

  const remaining = Math.max(0, targetMs - focusTime);
  const progress = targetMs > 0 ? Math.min(focusTime / targetMs, 1) : 0;

  const stats: SessionStats = {
    totalElapsed,
    focusTime,
    distractedTime,
    awayTime,
    focusRate: totalElapsed > 0 ? focusTime / totalElapsed : 0,
    distractionCount,
  };

  return {
    focusTime,
    totalElapsed,
    remaining,
    progress,
    isActive,
    isCompleted,
    stats,
    startTimer,
    stopTimer,
    resetTimer,
    updateState,
  };
}
