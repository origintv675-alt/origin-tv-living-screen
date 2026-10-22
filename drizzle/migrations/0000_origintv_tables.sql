CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image','video')),
  title TEXT NOT NULL DEFAULT 'Untitled',
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  album TEXT NOT NULL DEFAULT 'All',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hour INTEGER NOT NULL,
  minute INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT 'Alarm',
  enabled BOOLEAN NOT NULL DEFAULT true,
  repeat_days TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alarms TO authenticated;
GRANT ALL ON public.media TO service_role;
GRANT ALL ON public.transfers TO service_role;
GRANT ALL ON public.alarms TO service_role;

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_select_own" ON public.media FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "media_insert_own" ON public.media FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "media_update_own" ON public.media FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "media_delete_own" ON public.media FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "transfers_select_own" ON public.transfers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "transfers_insert_own" ON public.transfers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "transfers_delete_own" ON public.transfers FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "alarms_select_own" ON public.alarms FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "alarms_insert_own" ON public.alarms FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "alarms_update_own" ON public.alarms FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "alarms_delete_own" ON public.alarms FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "media_bucket_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('media','transfers') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_bucket_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('media','transfers') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_bucket_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('media','transfers') AND (storage.foldername(name))[1] = auth.uid()::text);