import { createClient } from "@supabase/supabase-js";

export const cloudUnconfiguredMessage = "Supabase 云端分享未配置，已切换到本地分享模式。";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "bloombeat-gifts";

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey, bucket };
}

export function getSupabaseAdmin() {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  return {
    bucket: config.bucket,
    client: createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  };
}
