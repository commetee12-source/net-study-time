// Design Ref: §4.1 — Profile API (joinSchool via RPC, getProfile, getSchool)

import { supabase } from "@/lib/supabase";
import type { Profile, School } from "@/types/database";

export async function joinSchool(
  inviteCode: string,
  studentId: string,
  displayName: string
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  const { data, error } = await supabase.rpc("join_school_by_invite", {
    p_invite_code: inviteCode,
    p_user_id: user.id,
    p_student_id: studentId,
    p_display_name: displayName,
  });
  if (error) {
    if (error.message.includes("Invalid invite code")) {
      throw new Error("유효하지 않은 초대코드입니다");
    }
    if (error.message.includes("duplicate key")) {
      throw new Error("이미 등록된 학번입니다");
    }
    throw error;
  }
  return data as string;
}

export async function getProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return data;
}

export async function getSchool(schoolId: string): Promise<School | null> {
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createSchool(
  name: string
): Promise<{ school: School; inviteCode: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  const { data: code } = await supabase.rpc("generate_invite_code");

  const { data, error } = await supabase
    .from("schools")
    .insert({
      name,
      invite_code: code,
      admin_user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return { school: data, inviteCode: code as string };
}
