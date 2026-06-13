
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS details text NOT NULL DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS details text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.edits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text,
  thumbnail_url text,
  ratio text NOT NULL DEFAULT '16:9',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.edits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edits TO authenticated;
GRANT ALL ON public.edits TO service_role;

ALTER TABLE public.edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read edits" ON public.edits FOR SELECT USING (true);
CREATE POLICY "Admin write edits" ON public.edits FOR ALL USING (true) WITH CHECK (true);
