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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#131b2e] rounded-[2rem] border border-white/10 max-w-md w-full p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-white font-[Manrope] tracking-tight mb-2">세션 완료!</h2>
          <p className="text-slate-400 text-sm tracking-widest uppercase">수고하셨습니다</p>
        </div>

        {/* Focus Donut Chart */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#222a3d" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2d3449" strokeDasharray="100, 100" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ffb4ab" strokeDasharray={`${100 - awayPercent}, 100`} strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4be277" strokeDasharray={`${focusPercent}, 100`} strokeLinecap="round" strokeWidth="3" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-white font-[Manrope]">{focusPercent}%</span>
              <span className="text-[10px] text-[#4be277] uppercase tracking-widest font-bold">집중 상태</span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#4be277] shadow-[0_0_8px_rgba(75,226,119,0.5)]" />
              <span className="text-xs text-slate-400">집중 {focusPercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffb4ab]" />
              <span className="text-xs text-slate-400">딴짓 {distractedPercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2d3449]" />
              <span className="text-xs text-slate-400">비움 {awayPercent}%</span>
            </div>
          </div>
        </div>

        {/* Time Stats */}
        <div className="space-y-4 mb-6">
          <div className="bg-[#222a3d] rounded-2xl p-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-[#4be277] tracking-tighter uppercase">순공 시간</span>
              <span className="text-2xl font-extrabold text-white font-[Manrope]">{formatTimeDetail(stats.focusTime)}</span>
            </div>
            <div className="h-1.5 w-full bg-[#060e20] rounded-full overflow-hidden">
              <div className="h-full bg-[#4be277] rounded-full shadow-[0_0_8px_rgba(75,226,119,0.3)]" style={{ width: `${focusPercent}%` }} />
            </div>
          </div>
          <div className="bg-[#222a3d] rounded-2xl p-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-slate-500 tracking-tighter uppercase">전체 세션</span>
              <span className="text-xl font-bold text-slate-300 font-[Manrope]">{formatTimeDetail(stats.totalElapsed)}</span>
            </div>
            <div className="h-1.5 w-full bg-[#060e20] rounded-full overflow-hidden">
              <div className="h-full bg-slate-600 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        {/* Detail Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#0b1326] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">딴짓 횟수</p>
            <p className="text-lg font-bold text-[#ffb4ab]">{stats.distractionCount}회</p>
          </div>
          <div className="bg-[#0b1326] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">자리비움</p>
            <p className="text-lg font-bold text-[#ffba61]">{formatTimeDetail(stats.awayTime)}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 bg-gradient-to-br from-[#4be277] to-[#22c55e] text-[#0b1326] rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-xl shadow-[#4be277]/20"
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
    <main className="min-h-screen pb-32">
      {/* Main Content */}
      <div className="pt-4 px-4 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Video Feed & Timer */}
        <div className="lg:col-span-8 space-y-5">
          {/* Camera Sanctuary */}
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-[#060e20] shadow-[0_0_20px_2px_rgba(34,197,94,0.15)]">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="w-full h-full object-contain" />

            {!isStarted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#060e20]">
                <Camera className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-[#dae2fd] text-lg font-[Manrope] font-bold">카메라를 시작하여 공부를 시작하세요</p>
                <p className="text-slate-500 text-sm mt-2">AI가 자세를 분석하여 순공부시간을 측정합니다</p>
              </div>
            )}

            {isLoading && isStarted && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#060e20]/80 backdrop-blur-md">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4be277] mx-auto mb-3" />
                  <p className="text-slate-300 font-[Manrope] font-bold">AI 모델 로딩 중...</p>
                </div>
              </div>
            )}

            {/* Status Badge Overlay */}
            {isStarted && !isLoading && (
              <div className="absolute top-4 left-4 flex items-center gap-3 bg-[#2d3449]/60 backdrop-blur-2xl px-5 py-3 rounded-2xl border border-[#4be277]/20">
                <div className={`w-3 h-3 rounded-full ${stateConfig.dotColor} ${currentState === "FOCUS" ? "animate-pulse shadow-[0_0_10px_#4be277]" : ""}`} />
                <span className={`font-[Manrope] font-extrabold tracking-widest text-lg ${stateConfig.color}`} style={currentState === "FOCUS" ? { textShadow: "0 0 10px rgba(75, 226, 119, 0.4)" } : {}}>
                  {stateConfig.label}
                </span>
              </div>
            )}

            {/* Session Controls In-Video */}
            {isStarted && !isLoading && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button onClick={handleStop} className="bg-gradient-to-br from-[#4be277] to-[#22c55e] text-[#0b1326] font-bold px-6 py-3 rounded-2xl shadow-xl shadow-[#4be277]/20 hover:brightness-110 active:scale-95 transition-all">
                  세션 종료
                </button>
                <button onClick={handleReset} className="bg-[#222a3d]/80 backdrop-blur-md text-[#dae2fd] p-3 rounded-2xl hover:bg-[#2d3449] transition-all active:scale-90">
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            )}

            {error && (
              <div className="absolute bottom-4 left-4 right-4 bg-[#93000a]/80 backdrop-blur-md border border-[#ffb4ab]/30 rounded-2xl p-3 flex items-center gap-2">
                <CameraOff className="w-5 h-5 text-[#ffb4ab] shrink-0" />
                <p className="text-[#ffb4ab] text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Timer Section (Glass Bento) */}
          <div className="bg-[#131b2e] p-8 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Progress bar at top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#2d3449]">
              <div className="h-full bg-[#4be277] shadow-[0_0_15px_#4be277] transition-all duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span className="text-[#bccbb9] text-sm uppercase tracking-[0.2em] mb-2">순공 시간</span>
            <h2 className="text-6xl md:text-7xl font-[Manrope] font-extrabold text-white tracking-tighter">
              {formatTime(focusTime)}
            </h2>
            <div className="mt-4 flex gap-8 text-[#bccbb9] text-xs uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#4be277]" />
                <span>생산성: {focusPercent}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Pause className="w-4 h-4 text-[#ffba61]" />
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

        {/* Right Column: Controls & Stats */}
        <div className="lg:col-span-4 space-y-5">
          {/* Target Time & Start (Before Session) */}
          {!isStarted && (
            <div className="bg-[#131b2e] rounded-3xl p-6 border border-white/5">
              {/* Circular Timer Preview */}
              <div className="flex justify-center mb-6">
                <div className="relative w-44 h-44">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="#222a3d" strokeWidth="6" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-[#bccbb9] uppercase tracking-[0.2em]">목표 시간</span>
                    <span className="text-3xl font-extrabold text-white font-[Manrope] tracking-tight">
                      {formatTime(targetMinutes * 60 * 1000)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-center flex-wrap mb-6">
                {[15, 25, 45, 60, 90, 120].map((min) => (
                  <button
                    key={min}
                    onClick={() => setTargetMinutes(min)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                      targetMinutes === min
                        ? "bg-[#4be277] text-[#0b1326] shadow-[0_0_12px_rgba(75,226,119,0.3)]"
                        : "bg-[#222a3d] text-slate-400 hover:text-white"
                    }`}
                  >
                    {min}분
                  </button>
                ))}
              </div>

              <button
                onClick={handleStart}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-br from-[#4be277] to-[#22c55e] text-[#0b1326] rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-xl shadow-[#4be277]/20"
              >
                <Play className="w-6 h-6" />
                세션 시작
              </button>
            </div>
          )}

          {/* Live Stats (During Session) */}
          {isStarted && (
            <>
              {/* Focus Level Visualizer */}
              <div className="bg-[#2d3449]/30 backdrop-blur p-6 rounded-3xl flex items-center gap-5">
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="#222a3d" strokeWidth="4" />
                    <circle
                      cx="32" cy="32" r="28" fill="transparent"
                      stroke="#4be277"
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 28}
                      strokeDashoffset={2 * Math.PI * 28 * (1 - focusPercent / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-bold text-white">{focusPercent}%</span>
                </div>
                <div>
                  <h4 className="font-[Manrope] font-bold text-sm text-white">
                    {focusPercent >= 80 ? "딥 포커스" : focusPercent >= 50 ? "보통 집중" : "집중 필요"}
                  </h4>
                  <p className="text-xs text-[#bccbb9] leading-relaxed">
                    {focusPercent >= 80
                      ? "최고 수준의 집중력을 유지하고 있습니다."
                      : focusPercent >= 50
                        ? "좋은 페이스! 조금 더 집중해보세요."
                        : "다시 자세를 잡고 집중해주세요."}
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#222a3d] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-[#4be277]" />
                    <span className="text-[10px] text-[#bccbb9] uppercase tracking-widest">집중</span>
                  </div>
                  <p className="text-xl font-bold text-white font-[Manrope]">{formatTime(focusTime)}</p>
                </div>
                <div className="bg-[#222a3d] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <EyeOff className="w-4 h-4 text-[#ffb4ab]" />
                    <span className="text-[10px] text-[#bccbb9] uppercase tracking-widest">딴짓</span>
                  </div>
                  <p className="text-xl font-bold text-white font-[Manrope]">{formatTime(stats.distractedTime)}</p>
                </div>
                <div className="bg-[#222a3d] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-[#ffba61]" />
                    <span className="text-[10px] text-[#bccbb9] uppercase tracking-widest">딴짓 횟수</span>
                  </div>
                  <p className="text-xl font-bold text-white font-[Manrope]">{stats.distractionCount}회</p>
                </div>
                <div className="bg-[#222a3d] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-[#c4c1fb]" />
                    <span className="text-[10px] text-[#bccbb9] uppercase tracking-widest">남은 시간</span>
                  </div>
                  <p className="text-xl font-bold text-white font-[Manrope]">{formatTime(remaining)}</p>
                </div>
              </div>

              {/* State Message Card */}
              <div className={`rounded-2xl p-5 border transition-all ${
                currentState === "FOCUS"
                  ? "bg-[#4be277]/5 border-[#4be277]/20"
                  : currentState === "DISTRACTED"
                    ? "bg-[#ffb4ab]/5 border-[#ffb4ab]/20"
                    : currentState === "AWAY"
                      ? "bg-[#ffba61]/5 border-[#ffba61]/20"
                      : "bg-[#222a3d] border-white/5"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${stateConfig.dotColor} ${currentState === "FOCUS" ? "shadow-[0_0_10px_#4be277]" : ""}`} />
                  <div>
                    <p className={`font-bold ${stateConfig.color}`}>{stateConfig.label}</p>
                    <p className="text-xs text-slate-500">
                      {currentState === "FOCUS" && "잘하고 있어요! 계속 집중하세요."}
                      {currentState === "DISTRACTED" && "다시 책상을 향해 집중해주세요!"}
                      {currentState === "AWAY" && "자리에 돌아와 주세요."}
                      {currentState === "IDLE" && "카메라를 확인해주세요."}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* How it works (Before Session) */}
          {!isStarted && (
            <div className="bg-[#222a3d] rounded-3xl border border-white/5 p-5">
              <h3 className="font-[Manrope] font-bold text-sm mb-4 text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#4be277]" />
                작동 방식
              </h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex gap-3">
                  <span className="text-[#4be277] font-bold shrink-0 font-[Manrope]">01</span>
                  웹캠으로 실시간 자세를 분석합니다
                </li>
                <li className="flex gap-3">
                  <span className="text-[#4be277] font-bold shrink-0 font-[Manrope]">02</span>
                  집중 자세일 때만 타이머가 흐릅니다
                </li>
                <li className="flex gap-3">
                  <span className="text-[#4be277] font-bold shrink-0 font-[Manrope]">03</span>
                  딴짓/자리비움 감지 시 즉시 멈춥니다
                </li>
                <li className="flex gap-3">
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
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${showDebug ? "bg-[#4be277]/10 text-[#4be277] border border-[#4be277]/20" : "bg-[#222a3d] text-slate-400 hover:text-white"}`}
            >
              <BarChart3 className="w-4 h-4" />
              디버그
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${soundEnabled ? "bg-[#222a3d] text-slate-400" : "bg-[#ffba61]/10 text-[#ffba61] border border-[#ffba61]/20"}`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
