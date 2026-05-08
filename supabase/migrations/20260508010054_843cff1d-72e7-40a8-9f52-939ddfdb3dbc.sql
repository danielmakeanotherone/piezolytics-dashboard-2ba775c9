CREATE TABLE public.user_tiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tile_number integer NOT NULL CHECK (tile_number BETWEEN 1 AND 999),
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tile_number)
);

ALTER TABLE public.user_tiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own tiles"
ON public.user_tiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own tiles"
ON public.user_tiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own tiles"
ON public.user_tiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own tiles"
ON public.user_tiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_user_tiles_user ON public.user_tiles(user_id);