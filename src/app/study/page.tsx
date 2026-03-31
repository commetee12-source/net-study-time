"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Play,
  Square,
  RotateCcw,
  Camera,
  CameraOff,
  Pause,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Zap,
  TrendingUp,
  Flame,
  BarChart3,
} from "lucide-react";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { useStudyTimer, type SessionStats } from "@/hooks/useStudyTimer";
import { useStudySession } from "@/hooks/useStudySession";
import { useWakeLock } from "@/hooks/useWakeLock";
import type { StudyState, PoseAnalysisResult } from "@/lib/pose-analyzer";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTimeDetail(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}시간`);
  if (m > 0) parts.push(`${m}분`);
  parts.push(`${s}초`);
  return parts.join(" ");
}

const STATE_CONFIG: Record<StudyState, { label: string; color: string; dotColor: string; icon: React.ReactNode }> = {
  IDLE: { label: "대기", color: "text-slate-400", dotColor: "bg-slate-400", icon: <Pause className="w-4 h-4" /> },
  FOCUS: { label: "집중", color: "text-[#4be277]", dotColor: "bg-[#4be277]", icon: <Zap className="w-4 h-4" /> },
  DISTRACTED: { label: "딴짓 감지!", color: "text-[#ffb4ab]", dotColor: "bg-[#ffb4ab]", icon: <EyeOff className="w-4 h-4" /> },
  AWAY: { label: "자리 비움", color: "text-[#ffba61]", dotColor: "bg-[#ffba61]", icon: <Eye className="w-4 h-4" /> },
};

/* ── Session Report Modal (Stitch Style) ── */
function SessionReport({ stats, onClose }: { stats: SessionStats; onClose: () => void }) {
  const focusPercent = Math.round(stats.focusRate * 100);
  const distractedPercent = stats.totalElapsed > 0 ? Math.round((stats.distractedTime / stats.totalElapsed) * 100) : 0;
  const awayPercent = stats.totalElapsed > 0 ? Math.round((stats.awayTime / stats.totalElapsed) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-3">
      <div className="bg-[#131b2e] rounded-[1.5rem] border border-white/10 max-w-sm w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <h2 className="text-2xl font-extrabold text-white font-[Manrope] tracking-tight mb-1">세션 완료!</h2>
          <p className="text-slate-400 text-xs tracking-widest uppercase">수고하셨습니다</p>
        </div>

        {/* Focus Donut Chart */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#222a3d" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2d3449" strokeDasharray="100, 100" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ffb4ab" strokeDasharray={`${100 - awayPercent}, 100`} strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4be277" strokeDasharray={`${focusPercent}, 100`} strokeLinecap="round" strokeWidth="3" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-white font-[Manrope]">{focusPercent}%</span>
              <span className="text-[8px] text-[#4be277] uppercase tracking-widest font-bold">집중 상태</span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#4be277]" />
              <span className="text-[10px] text-slate-400">집중 {focusPercent}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
              <span className="text-[10px] text-slate-400">딴짓 {distractedPercent}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#2d3449]" />
              <span className="text-[10px] text-slate-400">비움 {awayPercent}%</span>
            </div>
          </div>
        </div>

        {/* Time Stats */}
        <div className="space-y-2 mb-4">
          <div className="bg-[#222a3d] rounded-xl p-3">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-[10px] font-bold text-[#4be277] tracking-tighter uppercase">순공 시간</span>
              <span className="text-lg font-extrabold text-white font-[Manrope]">{formatTimeDetail(stats.focusTime)}</span>
            </div>
            <div className="h-1.5 w-full bg-[#060e20] rounded-full overflow-hidden">
              <div className="h-full bg-[#4be277] rounded-full shadow-[0_0_8px_rgba(75,226,119,0.3)]" style={{ width: `${focusPercent}%` }} />
            </div>
          </div>
          <div className="bg-[#222a3d] rounded-xl p-3">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 tracking-tighter uppercase">전체 세션</span>
              <span className="text-base font-bold text-slate-300 font-[Manrope]">{formatTimeDetail(stats.totalElapsed)}</span>
            </div>
            <div className="h-1.5 w-full bg-[#060e20] rounded-full overflow-hidden">
              <div className="h-full bg-slate-600 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        {/* Detail Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#0b1326] rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-slate-500 mb-0.5">딴짓 횟수</p>
            <p className="text-base font-bold text-[#ffb4ab]">{stats.distractionCount}회</p>
          </div>
          <div className="bg-[#0b1326] rounded-lg p-2.5 text-center">
            <p className="text-[10px] text-slate-500 mb-0.5">자리비움</p>
            <p className="text-base font-bold text-[#ffba61]">{formatTimeDetail(stats.awayTime)}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-br from-[#4be277] to-[#22c55e] text-[#0b1326] rounded-xl font-bold text-base transition-all active:scale-95 shadow-xl shadow-[#4be277]/20"
        >
          다시 시작하기
        </button>
      </div>
    </div>
  );
}

/* ── Main Study Page ── */
export default function Home() {
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [isStarted, setIsStarted] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const finalStatsRef = useRef<SessionStats | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((freq: number, duration: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
    } catch { /* ignore audio errors */ }
  }, [soundEnabled]);

  const { startDbSession, updateStats, endDbSession } = useStudySession();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  const {
    focusTime,
    remaining,
    progress,
    isActive: timerActive,
    isCompleted,
    stats,
    startTimer,
    stopTimer,
    resetTimer,
    updateState: updateTimerState,
  } = useStudyTimer({
    targetMinutes,
    onTargetReached: () => {
      playBeep(880, 1);
      setTimeout(() => playBeep(1100, 0.8), 300);
    },
    onDistracted: () => {
      playBeep(300, 0.3);
    },
  });

  const {
    videoRef,
    canvasRef,
    isLoading,
    error,
    currentState,
    analysisResult,
    isRunning: cameraRunning,
    start: startCamera,
    stop: stopCamera,
  } = usePoseDetection();

  // 포즈 상태가 바뀔 때마다 타이머 상태 동기화
  useEffect(() => {
    if (isStarted && currentState !== "IDLE") {
      updateTimerState(currentState);
    }
  }, [isStarted, currentState, updateTimerState]);

  useEffect(() => {
    if (isStarted) updateStats(stats);
  }, [isStarted, stats, updateStats]);

  const handleStart = async () => {
    await startCamera();
    startTimer();
    await startDbSession();
    await requestWakeLock();
    setIsStarted(true);
  };

  const handleStop = async () => {
    finalStatsRef.current = stats;
    stopTimer();
    stopCamera();
    releaseWakeLock();
    await endDbSession();
    setIsStarted(false);
    setShowReport(true);
  };

  const handleReset = async () => {
    stopTimer();
    stopCamera();
    releaseWakeLock();
    await endDbSession();
    resetTimer();
    setIsStarted(false);
    setShowReport(false);
    finalStatsRef.current = null;
  };

  const stateConfig = STATE_CONFIG[currentState];
  const circumference = 2 * Math.PI * 90;
  const strokeOffset = circumference * (1 - progress);
  const focusPercent = stats.totalElapsed > 0 ? Math.round(stats.focusRate * 100) : 0;

  return (
    <main className="min-h-screen pb-24">
      {/* Main Content */}
      <div className="pt-3 px-3 max-w-lg mx-auto space-y-3">
        {/* Camera Section */}
        <div className="space-y-3">
          {/* Camera Preview - compact on mobile */}
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#060e20] shadow-[0_0_20px_2px_rgba(34,197,94,0.15)]">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="w-full h-full object-contain" />

            {!isStarted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#060e20] px-6">
                <Camera className="w-12 h-12 text-slate-600 mb-3" />
                <p className="text-[#dae2fd] text-base font-[Manrope] font-bold text-center">카메라를 시작하여 공부를 시작하세요</p>
                <p className="text-slate-500 text-xs mt-1.5 text-center">AI가 자세를 분석하여 순공부시간을 측정합니다</p>
              </div>
            )}

            {isLoading && isStarted && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#060e20]/80 backdrop-blur-md">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4be277] mx-auto mb-2" />
                  <p className="text-slate-300 font-[Manrope] font-bold text-sm">AI 모델 로딩 중...</p>
                </div>
              </div>
            )}

            {/* Status Badge Overlay */}
            {isStarted && !isLoading && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#2d3449]/60 backdrop-blur-2xl px-3 py-2 rounded-xl border border-[#4be277]/20">
                <div className={`w-2.5 h-2.5 rounded-full ${stateConfig.dotColor} ${currentState === "FOCUS" ? "animate-pulse shadow-[0_0_10px_#4be277]" : ""}`} />
                <span className={`font-[Manrope] font-extrabold tracking-widest text-sm ${stateConfig.color}`} style={currentState === "FOCUS" ? { textShadow: "0 0 10px rgba(75, 226, 119, 0.4)" } : {}}>
                  {stateConfig.label}
                </span>
              </div>
            )}

            {/* Session Controls In-Video */}
            {isStarted && !isLoading && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button onClick={handleStop} className="bg-gradient-to-br from-[#4be277] to-[#22c55e] text-[#0b1326] font-bold px-4 py-2 rounded-xl text-sm shadow-lg shadow-[#4be277]/20 active:scale-95 transition-all">
                  종료
                </button>
                <button onClick={handleReset} className="bg-[#222a3d]/80 backdrop-blur-md text-[#dae2fd] p-2 rounded-xl active:scale-90 transition-all">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}

            {error && (
              <div className="absolute bottom-3 left-3 right-3 bg-[#93000a]/80 backdrop-blur-md border border-[#ffb4ab]/30 rounded-xl p-2.5 flex items-center gap-2">
                <CameraOff className="w-4 h-4 text-[#ffb4ab] shrink-0" />
                <p className="text-[#ffb4ab] text-xs">{error}</p>
              </div>
            )}
          </div>

          {/* Timer Section */}
          <div className="bg-[#131b2e] p-5 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Progress bar at top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#2d3449]">
              <div className="h-full bg-[#4be277] shadow-[0_0_15px_#4be277] transition-all duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span className="text-[#bccbb9] text-[10px] uppercase tracking-[0.2em] mb-1">순공 시간</span>
            <h2 className="text-4xl font-[Manrope] font-extrabold text-white tracking-tighter">
              {formatTime(focusTime)}
            </h2>
            <div className="mt-2 flex gap-5 text-[#bccbb9] text-[10px] uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[#4be277]" />
                <span>생산성: {focusPercent}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Pause className="w-3 h-3 text-[#ffba61]" />
                <span>쉬는 시간: {formatTime(stats.awayTime)}</span>
              </div>
            </div>
          </div>

          {/* Debug Panel */}
          {showDebug && analysisResult && (
            <div className="bg-[#131b2e] rounded-2xl border border-white/5 p-4 font-mono text-xs">
              <h3 className="text-slate-400 mb-2 font-[Manrope] font-bold text-sm">자세 분석 데이터</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(analysisResult.details).map(([key, val]) => (
                  <div key={key} className="bg-[#0b1326] rounded-xl p-2">
                    <span className="text-slate-500">{key}</span>
                    <p className="text-[#4be277]">{typeof val === "number" ? val.toFixed(4) : String(val)}</p>
                  </div>
                ))}
                <div className="bg-[#0b1326] rounded-xl p-2">
                  <span className="text-slate-500">confidence</span>
                  <p className="text-[#4be277]">{analysisResult.confidence.toFixed(4)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls & Stats */}
        <div className="space-y-3">
          {/* Target Time & Start (Before Session) */}
          {!isStarted && (
            <div className="bg-[#131b2e] rounded-2xl p-5 border border-white/5">
              {/* Circular Timer Preview */}
              <div className="flex justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="#222a3d" strokeWidth="6" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[9px] text-[#bccbb9] uppercase tracking-[0.2em]">목표 시간</span>
                    <span className="text-2xl font-extrabold text-white font-[Manrope] tracking-tight">
                      {formatTime(targetMinutes * 60 * 1000)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-center flex-wrap mb-4">
                {[15, 25, 45, 60, 90, 120].map((min) => (
                  <button
                    key={min}
                    onClick={() => setTargetMinutes(min)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      targetMinutes === min
                        ? "bg-[#4be277] text-[#0b1326] shadow-[0_0_12px_rgba(75,226,119,0.3)]"
                        : "bg-[#222a3d] text-slate-400"
                    }`}
                  >
                    {min}분
                  </button>
                ))}
              </div>

              <button
                onClick={handleStart}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-br from-[#4be277] to-[#22c55e] text-[#0b1326] rounded-2xl font-bold text-base transition-all active:scale-95 shadow-xl shadow-[#4be277]/20"
              >
                <Play className="w-5 h-5" />
                세션 시작
              </button>
            </div>
          )}

          {/* Live Stats (During Session) */}
          {isStarted && (
            <>
              {/* Stats Cards - compact 2x2 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#222a3d] rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Eye className="w-3 h-3 text-[#4be277]" />
                    <span className="text-[9px] text-[#bccbb9] uppercase tracking-widest">집중</span>
                  </div>
                  <p className="text-lg font-bold text-white font-[Manrope]">{formatTime(focusTime)}</p>
                </div>
                <div className="bg-[#222a3d] rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <EyeOff className="w-3 h-3 text-[#ffb4ab]" />
                    <span className="text-[9px] text-[#bccbb9] uppercase tracking-widest">딴짓</span>
                  </div>
                  <p className="text-lg font-bold text-white font-[Manrope]">{formatTime(stats.distractedTime)}</p>
                </div>
                <div className="bg-[#222a3d] rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3 h-3 text-[#ffba61]" />
                    <span className="text-[9px] text-[#bccbb9] uppercase tracking-widest">딴짓 횟수</span>
                  </div>
                  <p className="text-lg font-bold text-white font-[Manrope]">{stats.distractionCount}회</p>
                </div>
                <div className="bg-[#222a3d] rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3 h-3 text-[#c4c1fb]" />
                    <span className="text-[9px] text-[#bccbb9] uppercase tracking-widest">남은 시간</span>
                  </div>
                  <p className="text-lg font-bold text-white font-[Manrope]">{formatTime(remaining)}</p>
                </div>
              </div>

              {/* State Message Card */}
              <div className={`rounded-xl p-3 border transition-all ${
                currentState === "FOCUS"
                  ? "bg-[#4be277]/5 border-[#4be277]/20"
                  : currentState === "DISTRACTED"
                    ? "bg-[#ffb4ab]/5 border-[#ffb4ab]/20"
                    : currentState === "AWAY"
                      ? "bg-[#ffba61]/5 border-[#ffba61]/20"
                      : "bg-[#222a3d] border-white/5"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${stateConfig.dotColor} ${currentState === "FOCUS" ? "shadow-[0_0_10px_#4be277]" : ""}`} />
                  <p className={`font-bold text-sm ${stateConfig.color}`}>{stateConfig.label}</p>
                  <p className="text-[10px] text-slate-500">
                    {currentState === "FOCUS" && "잘하고 있어요!"}
                    {currentState === "DISTRACTED" && "다시 집중해주세요!"}
                    {currentState === "AWAY" && "자리에 돌아와 주세요."}
                    {currentState === "IDLE" && "카메라를 확인해주세요."}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* How it works (Before Session) */}
          {!isStarted && (
            <div className="bg-[#222a3d] rounded-2xl border border-white/5 p-4">
              <h3 className="font-[Manrope] font-bold text-xs mb-3 text-white flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#4be277]" />
                작동 방식
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex gap-2">
                  <span className="text-[#4be277] font-bold shrink-0 font-[Manrope]">01</span>
                  웹캠으로 실시간 자세를 분석합니다
                </li>
                <li className="flex gap-2">
                  <span className="text-[#4be277] font-bold shrink-0 font-[Manrope]">02</span>
                  집중 자세일 때만 타이머가 흐릅니다
                </li>
                <li className="flex gap-2">
                  <span className="text-[#4be277] font-bold shrink-0 font-[Manrope]">03</span>
                  딴짓/자리비움 감지 시 즉시 멈춥니다
                </li>
                <li className="flex gap-2">
                  <span className="text-[#4be277] font-bold shrink-0 font-[Manrope]">04</span>
                  세션 종료 후 몰입도 리포트를 제공합니다
                </li>
              </ul>
            </div>
          )}

          {/* Utility Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${showDebug ? "bg-[#4be277]/10 text-[#4be277] border border-[#4be277]/20" : "bg-[#222a3d] text-slate-400"}`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              디버그
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${soundEnabled ? "bg-[#222a3d] text-slate-400" : "bg-[#ffba61]/10 text-[#ffba61] border border-[#ffba61]/20"}`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {soundEnabled ? "소리 켜짐" : "소리 꺼짐"}
            </button>
          </div>
        </div>
      </div>

      {/* Session Report Modal */}
      {showReport && finalStatsRef.current && (
        <SessionReport stats={finalStatsRef.current} onClose={handleReset} />
      )}
    </main>
  );
}
