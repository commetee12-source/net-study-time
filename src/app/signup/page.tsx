// Design Ref: §5.3 — Signup page (2-step: account → invite code + profile)
// Plan SC: SC-01 — 회원가입·초대코드 정상 동작

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Hash, Ticket, UserPlus, Zap, ArrowLeft } from "lucide-react";
import { signUp } from "@/lib/api/auth";
import { joinSchool } from "@/lib/api/profiles";
import { useAuth } from "@/components/providers/AuthProvider";

export default function SignupPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  // 이미 로그인됐지만 프로필이 없으면 바로 2단계로
  const [step, setStep] = useState<"account" | "profile">(
    user && !profile ? "profile" : "account"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(email, password);
      setStep("profile");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "회원가입에 실패했습니다"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await joinSchool(inviteCode, studentId, displayName);
      await refreshProfile();
      router.replace("/study");
    } catch (err: unknown) {
      console.error("Profile registration error:", err);
      const msg = (err && typeof err === "object" && "message" in err)
        ? (err as { message: string }).message
        : JSON.stringify(err);
      setError(msg || "프로필 등록에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-[#131b2e] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-[#dae2fd] placeholder:text-slate-600 focus:outline-none focus:border-[#4be277]/50 focus:shadow-[0_0_0_3px_rgba(75,226,119,0.1)] transition-all";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0b1326]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#4be277] to-[#22c55e] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#4be277]/20">
            <UserPlus className="w-8 h-8 text-[#0b1326]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white font-[Manrope] tracking-tight">
            회원가입
          </h1>
          <p className="text-slate-400 text-sm mt-2 tracking-wide">
            {step === "account"
              ? "Step 1 — 계정 정보를 입력하세요"
              : "Step 2 — 학교 및 프로필 정보를 입력하세요"}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-[#4be277] to-[#22c55e] shadow-[0_0_6px_rgba(75,226,119,0.3)]" />
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              step === "profile"
                ? "bg-gradient-to-r from-[#4be277] to-[#22c55e] shadow-[0_0_6px_rgba(75,226,119,0.3)]"
                : "bg-[#131b2e] border border-white/5"
            }`}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-[#93000a]/20 border border-[#ffb4ab]/20 rounded-2xl text-[#ffb4ab] text-sm text-center">
            {error}
          </div>
        )}

        {step === "account" ? (
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-bold tracking-widest uppercase">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-bold tracking-widest uppercase">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  minLength={6}
                  className={inputClass}
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
                "다음"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-bold tracking-widest uppercase">
                초대코드
              </label>
              <div className="relative">
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="6자리 초대코드"
                  maxLength={6}
                  className={`${inputClass} uppercase tracking-widest`}
                  required
                />
              </div>
              <p className="text-xs text-slate-600 mt-1.5 ml-1">
                선생님에게 받은 학교 초대코드를 입력하세요
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-bold tracking-widest uppercase">
                학번
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="예: 10312"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-bold tracking-widest uppercase">
                이름
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="실명을 입력하세요"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setStep("account")}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#131b2e] border border-white/5 hover:bg-[#171f33] rounded-2xl font-bold text-[#dae2fd] transition-all active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4" />
                이전
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-br from-[#4be277] to-[#22c55e] text-[#0b1326] disabled:opacity-50 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] shadow-xl shadow-[#4be277]/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#0b1326]/30 border-t-[#0b1326] rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    가입완료
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Links */}
        <div className="mt-8 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="text-[#4be277] hover:text-[#6bff8f] font-bold transition-colors"
          >
            로그인
          </Link>
        </div>
      </div>
    </main>
  );
}
