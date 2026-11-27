-- 0001_core_editions_and_cms.sql
-- Multi-edition conference schema for MetaSphere (2026 archive, 2027 active, and future editions)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Domain Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publication_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.publication_status AS ENUM ('draft', 'published', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conference_format' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.conference_format AS ENUM ('online', 'offline', 'hybrid');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'committee_category' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.committee_category AS ENUM ('advisory', 'scientific', 'technical', 'aaia', 'organizing');
  END IF;
END
$$;

-- Shared updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. conference_editions
CREATE TABLE IF NOT EXISTS public.conference_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL UNIQUE CHECK (year >= 2020 AND year <= 2100),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  tagline text,
  loader_subtitle text,
  dates_display text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  venue_name text NOT NULL,
  venue_address text,
  venue_city text,
  format public.conference_format NOT NULL DEFAULT 'hybrid',
  description text,
  organizers jsonb NOT NULL DEFAULT '[]'::jsonb,
  collaborators jsonb NOT NULL DEFAULT '[]'::jsonb,
  technical_co_sponsors_summary text,
  cmt_acknowledgment text,
  publication_note text,
  publication_book_cover_asset text,
  program_schedule_qr_asset text,
  contact_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_phones jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conference_editions_dates_valid CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS conference_editions_single_active_idx
  ON public.conference_editions (is_active)
  WHERE is_active = true;

-- 2. site_settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  canonical_url text NOT NULL,
  seo_title text NOT NULL,
  seo_description text NOT NULL,
  theme_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  hero_media jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id)
);

-- 3. deadlines
CREATE TABLE IF NOT EXISTS public.deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz NOT NULL,
  display_date text,
  original_date text,
  is_extended boolean NOT NULL DEFAULT false,
  is_conference_date boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, title)
);

-- 4. tracks
CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, code)
);

-- 5. people
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  full_name text NOT NULL,
  designation text,
  institution text,
  country text,
  photo_url text,
  bio text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. speakers
CREATE TABLE IF NOT EXISTS public.speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  speaker_type text NOT NULL DEFAULT 'keynote',
  talk_title text,
  talk_abstract text,
  image_alt text,
  sort_order integer NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, person_id, speaker_type)
);

-- 7. committees
CREATE TABLE IF NOT EXISTS public.committees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  category public.committee_category NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, slug)
);

-- 8. committee_members
CREATE TABLE IF NOT EXISTS public.committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role_label text NOT NULL DEFAULT '',
  group_name text NOT NULL DEFAULT '',
  nationality_group text,
  sort_order integer NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (committee_id, person_id, role_label, group_name)
);

-- 9. sponsors
CREATE TABLE IF NOT EXISTS public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'technical_sponsor',
  logo_url text NOT NULL,
  website_url text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, name)
);

-- 10. program_sessions
CREATE TABLE IF NOT EXISTS public.program_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.tracks(id) ON DELETE SET NULL,
  speaker_id uuid REFERENCES public.speakers(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  title text NOT NULL,
  description text,
  room_or_link text,
  sort_order integer NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_sessions_times_valid CHECK (ends_at >= starts_at),
  UNIQUE (edition_id, session_date, starts_at, title)
);

-- 11. resources
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL,
  url text,
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, label)
);

-- 12. conference_links
CREATE TABLE IF NOT EXISTS public.conference_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, key)
);

-- 13. registration_fees
CREATE TABLE IF NOT EXISTS public.registration_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.conference_editions(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount_inr integer NOT NULL CHECK (amount_inr >= 0),
  amount_usd integer NOT NULL CHECK (amount_usd >= 0),
  indian_display text,
  foreign_display text,
  tax_note text,
  payment_instructions jsonb NOT NULL DEFAULT '{}'::jsonb,
  financial_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  financial_approved_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, category)
);

-- Supporting indexes for edition-scoped queries
CREATE INDEX IF NOT EXISTS deadlines_edition_status_idx ON public.deadlines (edition_id, status, sort_order);
CREATE INDEX IF NOT EXISTS tracks_edition_status_idx ON public.tracks (edition_id, status, sort_order);
CREATE INDEX IF NOT EXISTS speakers_edition_status_idx ON public.speakers (edition_id, status, sort_order);
CREATE INDEX IF NOT EXISTS committees_edition_status_idx ON public.committees (edition_id, status, sort_order);
CREATE INDEX IF NOT EXISTS committee_members_committee_idx ON public.committee_members (committee_id, status, sort_order);
CREATE INDEX IF NOT EXISTS sponsors_edition_status_idx ON public.sponsors (edition_id, status, sort_order);
CREATE INDEX IF NOT EXISTS program_sessions_edition_date_idx ON public.program_sessions (edition_id, session_date, starts_at);
CREATE INDEX IF NOT EXISTS resources_edition_status_idx ON public.resources (edition_id, status, sort_order);
CREATE INDEX IF NOT EXISTS conference_links_edition_idx ON public.conference_links (edition_id, status);
CREATE INDEX IF NOT EXISTS registration_fees_edition_idx ON public.registration_fees (edition_id, status, sort_order);

-- Attach updated_at triggers
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'conference_editions',
    'site_settings',
    'deadlines',
    'tracks',
    'people',
    'speakers',
    'committees',
    'committee_members',
    'sponsors',
    'program_sessions',
    'resources',
    'conference_links',
    'registration_fees'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl,
      tbl
    );
  END LOOP;
END
$$;
