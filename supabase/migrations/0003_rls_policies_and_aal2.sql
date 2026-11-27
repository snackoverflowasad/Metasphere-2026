-- 0003_rls_policies_and_aal2.sql
-- Row Level Security (RLS), mandatory TOTP MFA (aal2), and 3-tier RBAC across all 16 tables

-- ============================================================================
-- 1. SECURITY DEFINER RBAC Helper Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.role::text
  FROM public.admin_roles ar
  WHERE ar.user_id = (select auth.uid())
    AND ar.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_approve_financial()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (
        ar.role = 'super_admin'
        OR (ar.role = 'content_admin' AND ar.can_approve_financial = true)
      )
      FROM public.admin_roles ar
      WHERE ar.user_id = (select auth.uid())
        AND ar.is_active = true
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.current_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_admin_role() TO authenticated;

REVOKE ALL ON FUNCTION public.can_approve_financial() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_approve_financial() TO authenticated;

-- ============================================================================
-- 2. Enable Row Level Security on all 16 tables
-- ============================================================================

ALTER TABLE public.conference_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conference_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Public Status-Bearing CMS Tables (11 non-financial tables)
--    - anon / authenticated: SELECT published or archived rows only
--    - authenticated (aal1): draft reads and all writes blocked by AS RESTRICTIVE
--    - editor (aal2): create, edit, delete draft rows only (cannot publish/archive)
--    - content_admin / super_admin (aal2): full CRUD including publish/archive
-- ============================================================================

-- 3.1 conference_editions
DROP POLICY IF EXISTS "conference_editions_public_read" ON public.conference_editions;
CREATE POLICY "conference_editions_public_read"
  ON public.conference_editions
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "conference_editions_admin_read" ON public.conference_editions;
CREATE POLICY "conference_editions_admin_read"
  ON public.conference_editions
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "conference_editions_require_aal2_for_draft_read" ON public.conference_editions;
CREATE POLICY "conference_editions_require_aal2_for_draft_read"
  ON public.conference_editions
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "conference_editions_require_aal2_for_insert" ON public.conference_editions;
CREATE POLICY "conference_editions_require_aal2_for_insert"
  ON public.conference_editions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "conference_editions_require_aal2_for_update" ON public.conference_editions;
CREATE POLICY "conference_editions_require_aal2_for_update"
  ON public.conference_editions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "conference_editions_require_aal2_for_delete" ON public.conference_editions;
CREATE POLICY "conference_editions_require_aal2_for_delete"
  ON public.conference_editions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "conference_editions_admin_insert" ON public.conference_editions;
CREATE POLICY "conference_editions_admin_insert"
  ON public.conference_editions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "conference_editions_admin_update" ON public.conference_editions;
CREATE POLICY "conference_editions_admin_update"
  ON public.conference_editions
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "conference_editions_admin_delete" ON public.conference_editions;
CREATE POLICY "conference_editions_admin_delete"
  ON public.conference_editions
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.2 site_settings
DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "site_settings_admin_read" ON public.site_settings;
CREATE POLICY "site_settings_admin_read"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "site_settings_require_aal2_for_draft_read" ON public.site_settings;
CREATE POLICY "site_settings_require_aal2_for_draft_read"
  ON public.site_settings
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "site_settings_require_aal2_for_insert" ON public.site_settings;
CREATE POLICY "site_settings_require_aal2_for_insert"
  ON public.site_settings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "site_settings_require_aal2_for_update" ON public.site_settings;
CREATE POLICY "site_settings_require_aal2_for_update"
  ON public.site_settings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "site_settings_require_aal2_for_delete" ON public.site_settings;
CREATE POLICY "site_settings_require_aal2_for_delete"
  ON public.site_settings
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "site_settings_admin_insert" ON public.site_settings;
CREATE POLICY "site_settings_admin_insert"
  ON public.site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;
CREATE POLICY "site_settings_admin_update"
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "site_settings_admin_delete" ON public.site_settings;
CREATE POLICY "site_settings_admin_delete"
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.3 deadlines
DROP POLICY IF EXISTS "deadlines_public_read" ON public.deadlines;
CREATE POLICY "deadlines_public_read"
  ON public.deadlines
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "deadlines_admin_read" ON public.deadlines;
CREATE POLICY "deadlines_admin_read"
  ON public.deadlines
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "deadlines_require_aal2_for_draft_read" ON public.deadlines;
CREATE POLICY "deadlines_require_aal2_for_draft_read"
  ON public.deadlines
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "deadlines_require_aal2_for_insert" ON public.deadlines;
CREATE POLICY "deadlines_require_aal2_for_insert"
  ON public.deadlines
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "deadlines_require_aal2_for_update" ON public.deadlines;
CREATE POLICY "deadlines_require_aal2_for_update"
  ON public.deadlines
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "deadlines_require_aal2_for_delete" ON public.deadlines;
CREATE POLICY "deadlines_require_aal2_for_delete"
  ON public.deadlines
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "deadlines_admin_insert" ON public.deadlines;
CREATE POLICY "deadlines_admin_insert"
  ON public.deadlines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "deadlines_admin_update" ON public.deadlines;
CREATE POLICY "deadlines_admin_update"
  ON public.deadlines
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "deadlines_admin_delete" ON public.deadlines;
CREATE POLICY "deadlines_admin_delete"
  ON public.deadlines
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.4 tracks
DROP POLICY IF EXISTS "tracks_public_read" ON public.tracks;
CREATE POLICY "tracks_public_read"
  ON public.tracks
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "tracks_admin_read" ON public.tracks;
CREATE POLICY "tracks_admin_read"
  ON public.tracks
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "tracks_require_aal2_for_draft_read" ON public.tracks;
CREATE POLICY "tracks_require_aal2_for_draft_read"
  ON public.tracks
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "tracks_require_aal2_for_insert" ON public.tracks;
CREATE POLICY "tracks_require_aal2_for_insert"
  ON public.tracks
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "tracks_require_aal2_for_update" ON public.tracks;
CREATE POLICY "tracks_require_aal2_for_update"
  ON public.tracks
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "tracks_require_aal2_for_delete" ON public.tracks;
CREATE POLICY "tracks_require_aal2_for_delete"
  ON public.tracks
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "tracks_admin_insert" ON public.tracks;
CREATE POLICY "tracks_admin_insert"
  ON public.tracks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "tracks_admin_update" ON public.tracks;
CREATE POLICY "tracks_admin_update"
  ON public.tracks
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "tracks_admin_delete" ON public.tracks;
CREATE POLICY "tracks_admin_delete"
  ON public.tracks
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.5 speakers
DROP POLICY IF EXISTS "speakers_public_read" ON public.speakers;
CREATE POLICY "speakers_public_read"
  ON public.speakers
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "speakers_admin_read" ON public.speakers;
CREATE POLICY "speakers_admin_read"
  ON public.speakers
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "speakers_require_aal2_for_draft_read" ON public.speakers;
CREATE POLICY "speakers_require_aal2_for_draft_read"
  ON public.speakers
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "speakers_require_aal2_for_insert" ON public.speakers;
CREATE POLICY "speakers_require_aal2_for_insert"
  ON public.speakers
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "speakers_require_aal2_for_update" ON public.speakers;
CREATE POLICY "speakers_require_aal2_for_update"
  ON public.speakers
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "speakers_require_aal2_for_delete" ON public.speakers;
CREATE POLICY "speakers_require_aal2_for_delete"
  ON public.speakers
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "speakers_admin_insert" ON public.speakers;
CREATE POLICY "speakers_admin_insert"
  ON public.speakers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "speakers_admin_update" ON public.speakers;
CREATE POLICY "speakers_admin_update"
  ON public.speakers
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "speakers_admin_delete" ON public.speakers;
CREATE POLICY "speakers_admin_delete"
  ON public.speakers
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.6 committees
DROP POLICY IF EXISTS "committees_public_read" ON public.committees;
CREATE POLICY "committees_public_read"
  ON public.committees
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "committees_admin_read" ON public.committees;
CREATE POLICY "committees_admin_read"
  ON public.committees
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "committees_require_aal2_for_draft_read" ON public.committees;
CREATE POLICY "committees_require_aal2_for_draft_read"
  ON public.committees
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "committees_require_aal2_for_insert" ON public.committees;
CREATE POLICY "committees_require_aal2_for_insert"
  ON public.committees
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "committees_require_aal2_for_update" ON public.committees;
CREATE POLICY "committees_require_aal2_for_update"
  ON public.committees
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "committees_require_aal2_for_delete" ON public.committees;
CREATE POLICY "committees_require_aal2_for_delete"
  ON public.committees
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "committees_admin_insert" ON public.committees;
CREATE POLICY "committees_admin_insert"
  ON public.committees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "committees_admin_update" ON public.committees;
CREATE POLICY "committees_admin_update"
  ON public.committees
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "committees_admin_delete" ON public.committees;
CREATE POLICY "committees_admin_delete"
  ON public.committees
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.7 committee_members
DROP POLICY IF EXISTS "committee_members_public_read" ON public.committee_members;
CREATE POLICY "committee_members_public_read"
  ON public.committee_members
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "committee_members_admin_read" ON public.committee_members;
CREATE POLICY "committee_members_admin_read"
  ON public.committee_members
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "committee_members_require_aal2_for_draft_read" ON public.committee_members;
CREATE POLICY "committee_members_require_aal2_for_draft_read"
  ON public.committee_members
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "committee_members_require_aal2_for_insert" ON public.committee_members;
CREATE POLICY "committee_members_require_aal2_for_insert"
  ON public.committee_members
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "committee_members_require_aal2_for_update" ON public.committee_members;
CREATE POLICY "committee_members_require_aal2_for_update"
  ON public.committee_members
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "committee_members_require_aal2_for_delete" ON public.committee_members;
CREATE POLICY "committee_members_require_aal2_for_delete"
  ON public.committee_members
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "committee_members_admin_insert" ON public.committee_members;
CREATE POLICY "committee_members_admin_insert"
  ON public.committee_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "committee_members_admin_update" ON public.committee_members;
CREATE POLICY "committee_members_admin_update"
  ON public.committee_members
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "committee_members_admin_delete" ON public.committee_members;
CREATE POLICY "committee_members_admin_delete"
  ON public.committee_members
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.8 sponsors
DROP POLICY IF EXISTS "sponsors_public_read" ON public.sponsors;
CREATE POLICY "sponsors_public_read"
  ON public.sponsors
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "sponsors_admin_read" ON public.sponsors;
CREATE POLICY "sponsors_admin_read"
  ON public.sponsors
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "sponsors_require_aal2_for_draft_read" ON public.sponsors;
CREATE POLICY "sponsors_require_aal2_for_draft_read"
  ON public.sponsors
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "sponsors_require_aal2_for_insert" ON public.sponsors;
CREATE POLICY "sponsors_require_aal2_for_insert"
  ON public.sponsors
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "sponsors_require_aal2_for_update" ON public.sponsors;
CREATE POLICY "sponsors_require_aal2_for_update"
  ON public.sponsors
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "sponsors_require_aal2_for_delete" ON public.sponsors;
CREATE POLICY "sponsors_require_aal2_for_delete"
  ON public.sponsors
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "sponsors_admin_insert" ON public.sponsors;
CREATE POLICY "sponsors_admin_insert"
  ON public.sponsors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "sponsors_admin_update" ON public.sponsors;
CREATE POLICY "sponsors_admin_update"
  ON public.sponsors
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "sponsors_admin_delete" ON public.sponsors;
CREATE POLICY "sponsors_admin_delete"
  ON public.sponsors
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.9 program_sessions
DROP POLICY IF EXISTS "program_sessions_public_read" ON public.program_sessions;
CREATE POLICY "program_sessions_public_read"
  ON public.program_sessions
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "program_sessions_admin_read" ON public.program_sessions;
CREATE POLICY "program_sessions_admin_read"
  ON public.program_sessions
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "program_sessions_require_aal2_for_draft_read" ON public.program_sessions;
CREATE POLICY "program_sessions_require_aal2_for_draft_read"
  ON public.program_sessions
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "program_sessions_require_aal2_for_insert" ON public.program_sessions;
CREATE POLICY "program_sessions_require_aal2_for_insert"
  ON public.program_sessions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "program_sessions_require_aal2_for_update" ON public.program_sessions;
CREATE POLICY "program_sessions_require_aal2_for_update"
  ON public.program_sessions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "program_sessions_require_aal2_for_delete" ON public.program_sessions;
CREATE POLICY "program_sessions_require_aal2_for_delete"
  ON public.program_sessions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "program_sessions_admin_insert" ON public.program_sessions;
CREATE POLICY "program_sessions_admin_insert"
  ON public.program_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "program_sessions_admin_update" ON public.program_sessions;
CREATE POLICY "program_sessions_admin_update"
  ON public.program_sessions
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "program_sessions_admin_delete" ON public.program_sessions;
CREATE POLICY "program_sessions_admin_delete"
  ON public.program_sessions
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.10 resources
DROP POLICY IF EXISTS "resources_public_read" ON public.resources;
CREATE POLICY "resources_public_read"
  ON public.resources
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "resources_admin_read" ON public.resources;
CREATE POLICY "resources_admin_read"
  ON public.resources
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "resources_require_aal2_for_draft_read" ON public.resources;
CREATE POLICY "resources_require_aal2_for_draft_read"
  ON public.resources
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "resources_require_aal2_for_insert" ON public.resources;
CREATE POLICY "resources_require_aal2_for_insert"
  ON public.resources
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "resources_require_aal2_for_update" ON public.resources;
CREATE POLICY "resources_require_aal2_for_update"
  ON public.resources
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "resources_require_aal2_for_delete" ON public.resources;
CREATE POLICY "resources_require_aal2_for_delete"
  ON public.resources
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "resources_admin_insert" ON public.resources;
CREATE POLICY "resources_admin_insert"
  ON public.resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "resources_admin_update" ON public.resources;
CREATE POLICY "resources_admin_update"
  ON public.resources
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "resources_admin_delete" ON public.resources;
CREATE POLICY "resources_admin_delete"
  ON public.resources
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- 3.11 conference_links
DROP POLICY IF EXISTS "conference_links_public_read" ON public.conference_links;
CREATE POLICY "conference_links_public_read"
  ON public.conference_links
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "conference_links_admin_read" ON public.conference_links;
CREATE POLICY "conference_links_admin_read"
  ON public.conference_links
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "conference_links_require_aal2_for_draft_read" ON public.conference_links;
CREATE POLICY "conference_links_require_aal2_for_draft_read"
  ON public.conference_links
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "conference_links_require_aal2_for_insert" ON public.conference_links;
CREATE POLICY "conference_links_require_aal2_for_insert"
  ON public.conference_links
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "conference_links_require_aal2_for_update" ON public.conference_links;
CREATE POLICY "conference_links_require_aal2_for_update"
  ON public.conference_links
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "conference_links_require_aal2_for_delete" ON public.conference_links;
CREATE POLICY "conference_links_require_aal2_for_delete"
  ON public.conference_links
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "conference_links_admin_insert" ON public.conference_links;
CREATE POLICY "conference_links_admin_insert"
  ON public.conference_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "conference_links_admin_update" ON public.conference_links;
CREATE POLICY "conference_links_admin_update"
  ON public.conference_links
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  )
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

DROP POLICY IF EXISTS "conference_links_admin_delete" ON public.conference_links;
CREATE POLICY "conference_links_admin_delete"
  ON public.conference_links
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (public.current_admin_role() = 'editor' AND status = 'draft')
  );

-- ============================================================================
-- 4. Financial Table: registration_fees (extra financial approval guard)
--    - content_admin CANNOT publish/archive or mutate published fees unless
--      public.can_approve_financial() = true
-- ============================================================================

DROP POLICY IF EXISTS "registration_fees_public_read" ON public.registration_fees;
CREATE POLICY "registration_fees_public_read"
  ON public.registration_fees
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

DROP POLICY IF EXISTS "registration_fees_admin_read" ON public.registration_fees;
CREATE POLICY "registration_fees_admin_read"
  ON public.registration_fees
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "registration_fees_require_aal2_for_draft_read" ON public.registration_fees;
CREATE POLICY "registration_fees_require_aal2_for_draft_read"
  ON public.registration_fees
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'archived')
    OR (select auth.jwt()->>'aal') = 'aal2'
  );

DROP POLICY IF EXISTS "registration_fees_require_aal2_for_insert" ON public.registration_fees;
CREATE POLICY "registration_fees_require_aal2_for_insert"
  ON public.registration_fees
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "registration_fees_require_aal2_for_update" ON public.registration_fees;
CREATE POLICY "registration_fees_require_aal2_for_update"
  ON public.registration_fees
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "registration_fees_require_aal2_for_delete" ON public.registration_fees;
CREATE POLICY "registration_fees_require_aal2_for_delete"
  ON public.registration_fees
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "registration_fees_admin_insert" ON public.registration_fees;
CREATE POLICY "registration_fees_admin_insert"
  ON public.registration_fees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() = 'super_admin'
    OR (
      public.current_admin_role() = 'content_admin'
      AND (status = 'draft' OR public.can_approve_financial())
    )
    OR (
      public.current_admin_role() = 'editor'
      AND status = 'draft'
    )
  );

DROP POLICY IF EXISTS "registration_fees_admin_update" ON public.registration_fees;
CREATE POLICY "registration_fees_admin_update"
  ON public.registration_fees
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() = 'super_admin'
    OR (
      public.current_admin_role() = 'content_admin'
      AND (status = 'draft' OR public.can_approve_financial())
    )
    OR (
      public.current_admin_role() = 'editor'
      AND status = 'draft'
    )
  )
  WITH CHECK (
    public.current_admin_role() = 'super_admin'
    OR (
      public.current_admin_role() = 'content_admin'
      AND (status = 'draft' OR public.can_approve_financial())
    )
    OR (
      public.current_admin_role() = 'editor'
      AND status = 'draft'
    )
  );

DROP POLICY IF EXISTS "registration_fees_admin_delete" ON public.registration_fees;
CREATE POLICY "registration_fees_admin_delete"
  ON public.registration_fees
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() = 'super_admin'
    OR (
      public.current_admin_role() = 'content_admin'
      AND (status = 'draft' OR public.can_approve_financial())
    )
    OR (
      public.current_admin_role() = 'editor'
      AND status = 'draft'
    )
  );

-- ============================================================================
-- 5. Shared Directory Table: people (no direct status column)
--    - Public can read only people linked to published/archived speakers or
--      committee_members; unlinked/draft-only people require aal2 admin session
--    - Editors cannot alter or delete people already published/archived
-- ============================================================================

DROP POLICY IF EXISTS "people_public_read" ON public.people;
CREATE POLICY "people_public_read"
  ON public.people
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.speakers s
      WHERE s.person_id = people.id
        AND s.status IN ('published', 'archived')
    )
    OR EXISTS (
      SELECT 1
      FROM public.committee_members cm
      WHERE cm.person_id = people.id
        AND cm.status IN ('published', 'archived')
    )
  );

DROP POLICY IF EXISTS "people_admin_read" ON public.people;
CREATE POLICY "people_admin_read"
  ON public.people
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "people_require_aal2_for_draft_read" ON public.people;
CREATE POLICY "people_require_aal2_for_draft_read"
  ON public.people
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    (select auth.jwt()->>'aal') = 'aal2'
    OR EXISTS (
      SELECT 1
      FROM public.speakers s
      WHERE s.person_id = people.id
        AND s.status IN ('published', 'archived')
    )
    OR EXISTS (
      SELECT 1
      FROM public.committee_members cm
      WHERE cm.person_id = people.id
        AND cm.status IN ('published', 'archived')
    )
  );

DROP POLICY IF EXISTS "people_require_aal2_for_insert" ON public.people;
CREATE POLICY "people_require_aal2_for_insert"
  ON public.people
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "people_require_aal2_for_update" ON public.people;
CREATE POLICY "people_require_aal2_for_update"
  ON public.people
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "people_require_aal2_for_delete" ON public.people;
CREATE POLICY "people_require_aal2_for_delete"
  ON public.people
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "people_admin_insert" ON public.people;
CREATE POLICY "people_admin_insert"
  ON public.people
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "people_admin_update" ON public.people;
CREATE POLICY "people_admin_update"
  ON public.people
  FOR UPDATE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (
      public.current_admin_role() = 'editor'
      AND NOT EXISTS (
        SELECT 1
        FROM public.speakers s
        WHERE s.person_id = people.id
          AND s.status IN ('published', 'archived')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.committee_members cm
        WHERE cm.person_id = people.id
          AND cm.status IN ('published', 'archived')
      )
    )
  )
  WITH CHECK (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "people_admin_delete" ON public.people;
CREATE POLICY "people_admin_delete"
  ON public.people
  FOR DELETE
  TO authenticated
  USING (
    public.current_admin_role() IN ('super_admin', 'content_admin')
    OR (
      public.current_admin_role() = 'editor'
      AND NOT EXISTS (
        SELECT 1
        FROM public.speakers s
        WHERE s.person_id = people.id
          AND s.status IN ('published', 'archived')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.committee_members cm
        WHERE cm.person_id = people.id
          AND cm.status IN ('published', 'archived')
      )
    )
  );

-- ============================================================================
-- 6. Strictly Admin-Only Tables: admin_roles, audit_logs, content_versions
-- ============================================================================

-- 6.1 admin_roles (super_admin manages all; other active aal2 admins can read own row)
DROP POLICY IF EXISTS "admin_roles_require_aal2_all" ON public.admin_roles;
CREATE POLICY "admin_roles_require_aal2_all"
  ON public.admin_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "admin_roles_admin_read" ON public.admin_roles;
CREATE POLICY "admin_roles_admin_read"
  ON public.admin_roles
  FOR SELECT
  TO authenticated
  USING (
    public.current_admin_role() = 'super_admin'
    OR (
      public.current_admin_role() IN ('content_admin', 'editor')
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "admin_roles_super_admin_insert" ON public.admin_roles;
CREATE POLICY "admin_roles_super_admin_insert"
  ON public.admin_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_admin_role() = 'super_admin');

DROP POLICY IF EXISTS "admin_roles_super_admin_update" ON public.admin_roles;
CREATE POLICY "admin_roles_super_admin_update"
  ON public.admin_roles
  FOR UPDATE
  TO authenticated
  USING (public.current_admin_role() = 'super_admin')
  WITH CHECK (public.current_admin_role() = 'super_admin');

DROP POLICY IF EXISTS "admin_roles_super_admin_delete" ON public.admin_roles;
CREATE POLICY "admin_roles_super_admin_delete"
  ON public.admin_roles
  FOR DELETE
  TO authenticated
  USING (public.current_admin_role() = 'super_admin');

-- 6.2 audit_logs (strictly append-only: SELECT and INSERT by aal2 admins; NO UPDATE or DELETE policies)
DROP POLICY IF EXISTS "audit_logs_require_aal2_all" ON public.audit_logs;
CREATE POLICY "audit_logs_require_aal2_all"
  ON public.audit_logs
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_read"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "audit_logs_admin_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_insert"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
    AND (actor_id IS NULL OR actor_id = (select auth.uid()))
  );

-- 6.3 content_versions (immutable CMS snapshot history: SELECT and INSERT by aal2 admins)
DROP POLICY IF EXISTS "content_versions_require_aal2_all" ON public.content_versions;
CREATE POLICY "content_versions_require_aal2_all"
  ON public.content_versions
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((select auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "content_versions_admin_read" ON public.content_versions;
CREATE POLICY "content_versions_admin_read"
  ON public.content_versions
  FOR SELECT
  TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'content_admin', 'editor'));

DROP POLICY IF EXISTS "content_versions_admin_insert" ON public.content_versions;
CREATE POLICY "content_versions_admin_insert"
  ON public.content_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
    AND (created_by IS NULL OR created_by = (select auth.uid()))
  );
