-- Add avatar_url to support profile pictures
ALTER TABLE public.external_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.external_users.avatar_url IS 'URL to the client profile picture';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the internal user profile picture';
