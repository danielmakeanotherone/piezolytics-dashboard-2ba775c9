CREATE TABLE public.room_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.room_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own room layout"
ON public.room_layouts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own room layout"
ON public.room_layouts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own room layout"
ON public.room_layouts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own room layout"
ON public.room_layouts FOR DELETE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_room_layouts_updated_at
BEFORE UPDATE ON public.room_layouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();