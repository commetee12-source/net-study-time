// Design Ref: §5.3 — Login page (email + password → Supabase Auth)
// Plan SC: SC-01 — 회원가입·로그인 정상 동작

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, Zap } from "lucide-react";
import { signIn } from "@/lib/api/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/study");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "로그인에 실패했습니다"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0b1326]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#4be277] to-[#22c55e] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#4be277]/20">
            <Zap className="w-8 h-8 text-[#0b1326]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white font-[Manrope] tracking-tight uppercase">Study Sanctuary</h1>
          <p className="text-slate-400 text-sm mt-2 tracking-wide">AI 자세 분석 기반 순공부시간 측정</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-[#93000a]/20 border border-[#ffb4ab]/20 rounded-2xl text-[#ffb4ab] text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold tracking-widest uppercase">이메일</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-[#131b2e] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-[#dae2fd] placeholder:text-slate-600 focus:outline-none focus:border-[#4be277]/50 focus:shadow-[0_0_0_3px_rgba(75,226,119,0.1)] transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-bold tracking-widest uppercase">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full bg-[#131b2e] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-[#dae2fd] placeholder:text-slate-600 focus:outline-none focus:border-[#4be277]/50 focus:shadow-[0_0_0_3px_rgba(75,226,119,0.1)] transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-br from-[#4be277] to-[#22c55e] text-[#0b1326] disabled:opacity-50 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] shadow-xl shadow-[#4be277]/20 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#0b1326]/30 border-t-[#0b1326] rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                로그인
              </>
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-8 text-center text-sm text-slate-500">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-[#4be277] hover:text-[#6bff8f] font-bold transition-colors">
            회원가입
          </Link>
        </div>
      </div>
    </main>
  );
}
