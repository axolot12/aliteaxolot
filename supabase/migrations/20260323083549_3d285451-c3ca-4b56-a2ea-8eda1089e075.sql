-- Portfolio content tables for admin real-time editing

CREATE TABLE public.bot_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.bot_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  percent INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  link TEXT,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);

ALTER TABLE public.bot_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read bot_categories" ON public.bot_categories FOR SELECT USING (true);
CREATE POLICY "Public read bots" ON public.bots FOR SELECT USING (true);
CREATE POLICY "Public read skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Public read journey" ON public.journey FOR SELECT USING (true);
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "Admin write bot_categories" ON public.bot_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin write bots" ON public.bots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin write skills" ON public.skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin write journey" ON public.journey FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin write projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin write site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read portfolio files" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Anyone can upload portfolio files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolio');
CREATE POLICY "Anyone can update portfolio files" ON storage.objects FOR UPDATE USING (bucket_id = 'portfolio');
CREATE POLICY "Anyone can delete portfolio files" ON storage.objects FOR DELETE USING (bucket_id = 'portfolio');

INSERT INTO public.bot_categories (id, title, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Discord Bots', 0),
  ('22222222-2222-2222-2222-222222222222', 'Discord Bots', 1);

INSERT INTO public.bots (category_id, name, description, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Flow', 'High-quality music streaming bot', 0),
  ('11111111-1111-1111-1111-111111111111', 'Crawl Flow', 'Advanced music crawling bot', 1),
  ('11111111-1111-1111-1111-111111111111', 'Beta Sangeet', 'Beta music experience bot', 2),
  ('22222222-2222-2222-2222-222222222222', 'Puppy', 'Moderation bot for Discord servers', 0),
  ('22222222-2222-2222-2222-222222222222', 'Tickky', 'Ticket management bot', 1),
  ('22222222-2222-2222-2222-222222222222', 'Giveaway Ant', 'Giveaway management bot', 2);

INSERT INTO public.skills (name, percent, sort_order) VALUES
  ('JavaScript / TypeScript', 88, 0),
  ('Discord.js / Bot Dev', 95, 1),
  ('Node.js / Backend', 85, 2),
  ('React / Frontend', 72, 3),
  ('Java / Minecraft Modding', 68, 4),
  ('Python / Automation', 78, 5),
  ('UI/UX Design', 60, 6),
  ('Reverse Engineering', 70, 7);

INSERT INTO public.journey (year, title, description, sort_order) VALUES
  ('2022', 'Started Coding', 'Began learning JavaScript and building small projects', 0),
  ('2023', 'First Discord Bot', 'Built Flow music bot, gained 500+ servers', 1),
  ('2023', 'Bot Ecosystem', 'Launched Puppy, Tickky, and Giveaway Ant', 2),
  ('2024', 'Bhosdu Launcher', 'Created custom Minecraft launcher', 3),
  ('2024', 'Growing Community', 'Built own Discord server and community projects', 4);

INSERT INTO public.projects (name, description, link, category, sort_order) VALUES
  ('Bhosdu Launcher', 'Custom Minecraft launcher with mod support', NULL, 'launcher', 0),
  ('Own DC Server', 'Personal Discord community server', NULL, 'other', 1),
  ('Confession MC', 'Minecraft confession server', NULL, 'other', 2),
  ('Baatein', 'Community chat platform', NULL, 'other', 3);

INSERT INTO public.site_settings (key, value) VALUES
  ('hero_subtitle', 'Full-Stack Developer — I build websites, apps, web games, launchers, bots, automation tools, and more.'),
  ('discord_id', 'axobhaiya'),
  ('email', 'hbhaiya820@gmail.com');