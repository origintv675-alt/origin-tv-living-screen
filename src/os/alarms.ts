import { supabase } from "@/integrations/supabase/client";

export interface Alarm {
  id: string;
  hour: number;
  minute: number;
  label: string;
  enabled: boolean;
  repeat_days: string;
  created_at: string;
}

export async function listAlarms(): Promise<Alarm[]> {
  const { data, error } = await supabase
    .from("alarms")
    .select("*")
    .order("hour", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Alarm[];
}

export async function addAlarm(a: {
  hour: number;
  minute: number;
  label: string;
}): Promise<Alarm | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from("alarms")
    .insert({
      user_id: userData.user.id,
      hour: a.hour,
      minute: a.minute,
      label: a.label,
      enabled: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Alarm;
}

export async function toggleAlarm(id: string, enabled: boolean) {
  const { error } = await supabase.from("alarms").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export async function removeAlarm(id: string) {
  const { error } = await supabase.from("alarms").delete().eq("id", id);
  if (error) throw error;
}

export function alarmLabel(a: { hour: number; minute: number }) {
  return `${String(a.hour).padStart(2, "0")}:${String(a.minute).padStart(2, "0")}`;
}
