// Design Ref: §5.1 — AuthProvider (session listener + profile/school state)
// Plan SC: SC-01 — 회원가입·로그인·초대코드 정상 동작

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, getSchool } from "@/lib/api/profiles";
import type { Profile, School } from "@/types/database";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  school: School | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  school: null,
  loading: true,
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_PATHS = ["/login", "/signup"];

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const loadProfile = async () => {
    const p = await getProfile();
    setProfile(p);
    if (p?.school_id) {
      const s = await getSchool(p.school_id);
      setSchool(s);
    } else {
      setSchool(null);
    }
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        loadProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        loadProfile();
      } else {
        setProfile(null);
        setSchool(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route protection
  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.includes(pathname);

    if (!user && !isPublic) {
      router.replace("/login");
    } else if (user && isPublic) {
      // 프로필이 없으면 회원가입 2단계를 완료해야 하므로 /signup은 허용
      if (profile) {
        router.replace("/study");
      } else if (pathname === "/login") {
        // 로그인 페이지에 있지만 프로필이 없으면 signup으로
        router.replace("/signup");
      }
      // /signup에 있고 프로필이 없으면 그대로 유지 (2단계 진행)
    } else if (user && !isPublic && !profile) {
      // 로그인은 됐지만 프로필이 없으면 signup으로 보내기
      router.replace("/signup");
    }
  }, [user, profile, loading, pathname, router]);

  // Show nothing while loading on protected routes
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, session, profile, school, loading, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
