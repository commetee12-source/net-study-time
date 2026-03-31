// Design Ref: §5.3 — Settings page (프로필, 학교, 로그아웃)

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, School, LogOut, ChevronRight, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "@/lib/api/auth";

function SettingRow({ icon, label, value, onClick }: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-[#131b2e] rounded-2xl border border-white/5 hover:bg-[#171f33] transition-all text-left active:scale-[0.98]"
    >
      <span className="text-slate-400">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#dae2fd]">{label}</p>
        {value && <p className="text-xs text-slate-500 truncate">{value}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600" />
    </button>
  );
}

export default function SettingsPage() {
  const { user, profile, school } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 1)
    : "?";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <main className="min-h-screen pb-32 pt-4 px-4 max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-extrabold text-white font-[Manrope] tracking-tight">프로필</h1>
        <p className="text-sm text-slate-500 mt-1">계정 및 앱 설정</p>
      </header>

      {/* Profile Card */}
      <div className="bg-[#131b2e] rounded-3xl border border-white/5 p-6 mb-6 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 opacity-5">
          <Sparkles className="w-32 h-32 text-[#4be277]" />
        </div>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-[#4be277] to-[#22c55e] rounded-2xl flex items-center justify-center text-2xl font-extrabold text-[#0b1326] font-[Manrope] shadow-lg shadow-[#4be277]/20">
            {initials}
          </div>
          <div>
            <p className="font-extrabold text-xl text-white font-[Manrope]">
              {profile?.display_name ?? "로그인이 필요합니다"}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">
              {profile ? `${profile.student_id} · ${user?.email}` : "로그인하여 학습 기록을 저장하세요"}
            </p>
            {school && (
              <div className="flex items-center gap-1.5 mt-2 text-[#4be277] text-xs font-bold">
                <School className="w-3.5 h-3.5" />
                {school.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="space-y-2">
        <SettingRow
          icon={<User className="w-5 h-5" />}
          label="프로필 정보"
          value={profile ? `${profile.display_name} (${profile.student_id})` : "로그인 후 확인 가능"}
        />
        <SettingRow
          icon={<School className="w-5 h-5" />}
          label="소속 학교"
          value={school?.name ?? "로그인 후 확인 가능"}
        />
        <SettingRow
          icon={<Shield className="w-5 h-5" />}
          label="개인정보 처리방침"
          value="영상 데이터는 기기 내에서만 처리됩니다"
        />
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-4 mt-8 rounded-2xl bg-[#93000a]/10 border border-[#ffb4ab]/10 text-[#ffb4ab] hover:bg-[#93000a]/20 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {loggingOut ? (
          <div className="w-4 h-4 border-2 border-[#ffb4ab]/30 border-t-[#ffb4ab] rounded-full animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        <span className="text-sm font-bold">로그아웃</span>
      </button>

      {/* Version */}
      <p className="text-center text-xs text-slate-600 mt-6 tracking-widest uppercase">Study Sanctuary v0.1.0</p>
    </main>
  );
}
