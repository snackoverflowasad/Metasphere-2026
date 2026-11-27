-- 0004_storage_buckets_and_policies.sql
-- Storage buckets and safe MIME / AAL2 RLS policies for MetaSphere conference assets

-- Note: storage.objects already has RLS enabled by Supabase Storage by default.
-- We avoid running ALTER TABLE storage.objects here so `supabase db push`
-- succeeds without requiring supabase_storage_admin table ownership.

-- ============================================================================
-- 1. Create / Update Storage Buckets (10 MB limit, safe MIME allowlist)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conference-public',
  'conference-public',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conference-private',
  'conference-private',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 2. Restrictive Storage Guardrails (Per-Command AAL2 + Safe MIME + Block SVG/HTML)
-- ============================================================================

DROP POLICY IF EXISTS "conference_storage_require_aal2_writes" ON storage.objects;

DROP POLICY IF EXISTS "conference_storage_require_aal2_select" ON storage.objects;
CREATE POLICY "conference_storage_require_aal2_select"
  ON storage.objects
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    bucket_id NOT IN ('conference-public', 'conference-private')
    OR bucket_id = 'conference-public'
    OR (
      (select auth.jwt()->>'aal') = 'aal2'
      AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "conference_storage_require_aal2_insert" ON storage.objects;
CREATE POLICY "conference_storage_require_aal2_insert"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id NOT IN ('conference-public', 'conference-private')
    OR (
      (select auth.jwt()->>'aal') = 'aal2'
      AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
      AND (
        metadata IS NULL
        OR metadata->>'mimetype' IS NULL
        OR coalesce(metadata->>'mimetype', '') IN (
          'image/png',
          'image/jpeg',
          'image/webp',
          'application/pdf'
        )
      )
      AND coalesce(metadata->>'mimetype', '') NOT IN ('image/svg+xml', 'text/html')
      AND btrim(name) !~* '\.(svg|html?|xhtml)$'
      AND (
        metadata IS NULL
        OR metadata->>'size' IS NULL
        OR coalesce((metadata->>'size')::bigint, 0) <= 10485760
      )
    )
  );

DROP POLICY IF EXISTS "conference_storage_require_aal2_update" ON storage.objects;
CREATE POLICY "conference_storage_require_aal2_update"
  ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id NOT IN ('conference-public', 'conference-private')
    OR (
      (select auth.jwt()->>'aal') = 'aal2'
      AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
    )
  )
  WITH CHECK (
    bucket_id NOT IN ('conference-public', 'conference-private')
    OR (
      (select auth.jwt()->>'aal') = 'aal2'
      AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
      AND (
        metadata IS NULL
        OR metadata->>'mimetype' IS NULL
        OR coalesce(metadata->>'mimetype', '') IN (
          'image/png',
          'image/jpeg',
          'image/webp',
          'application/pdf'
        )
      )
      AND coalesce(metadata->>'mimetype', '') NOT IN ('image/svg+xml', 'text/html')
      AND btrim(name) !~* '\.(svg|html?|xhtml)$'
      AND (
        metadata IS NULL
        OR metadata->>'size' IS NULL
        OR coalesce((metadata->>'size')::bigint, 0) <= 10485760
      )
    )
  );

DROP POLICY IF EXISTS "conference_storage_require_aal2_delete" ON storage.objects;
CREATE POLICY "conference_storage_require_aal2_delete"
  ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    bucket_id NOT IN ('conference-public', 'conference-private')
    OR (
      (select auth.jwt()->>'aal') = 'aal2'
      AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
    )
  );

-- ============================================================================
-- 3. Permissive Bucket Policies
-- ============================================================================

-- Public read access for published assets in conference-public
DROP POLICY IF EXISTS "conference_public_read" ON storage.objects;
CREATE POLICY "conference_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'conference-public');

-- Authenticated aal2 admin read access for conference-private
DROP POLICY IF EXISTS "conference_private_admin_read" ON storage.objects;
CREATE POLICY "conference_private_admin_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'conference-private'
    AND (select auth.jwt()->>'aal') = 'aal2'
    AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
  );

-- Authenticated aal2 admin upload (INSERT) with TUS/signed-upload metadata tolerance & 10 MB cap
DROP POLICY IF EXISTS "conference_storage_admin_insert" ON storage.objects;
CREATE POLICY "conference_storage_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('conference-public', 'conference-private')
    AND (select auth.jwt()->>'aal') = 'aal2'
    AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
    AND (
      metadata IS NULL
      OR metadata->>'mimetype' IS NULL
      OR coalesce(metadata->>'mimetype', '') IN (
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/pdf'
      )
    )
    AND coalesce(metadata->>'mimetype', '') NOT IN ('image/svg+xml', 'text/html')
    AND btrim(name) !~* '\.(svg|html?|xhtml)$'
    AND (
      metadata IS NULL
      OR metadata->>'size' IS NULL
      OR coalesce((metadata->>'size')::bigint, 0) <= 10485760
    )
  );

-- Authenticated aal2 admin overwrite/update (UPDATE)
DROP POLICY IF EXISTS "conference_storage_admin_update" ON storage.objects;
CREATE POLICY "conference_storage_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('conference-public', 'conference-private')
    AND (select auth.jwt()->>'aal') = 'aal2'
    AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
  )
  WITH CHECK (
    bucket_id IN ('conference-public', 'conference-private')
    AND (select auth.jwt()->>'aal') = 'aal2'
    AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
    AND (
      metadata IS NULL
      OR metadata->>'mimetype' IS NULL
      OR coalesce(metadata->>'mimetype', '') IN (
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/pdf'
      )
    )
    AND coalesce(metadata->>'mimetype', '') NOT IN ('image/svg+xml', 'text/html')
    AND btrim(name) !~* '\.(svg|html?|xhtml)$'
    AND (
      metadata IS NULL
      OR metadata->>'size' IS NULL
      OR coalesce((metadata->>'size')::bigint, 0) <= 10485760
    )
  );

-- Authenticated aal2 admin delete (DELETE)
DROP POLICY IF EXISTS "conference_storage_admin_delete" ON storage.objects;
CREATE POLICY "conference_storage_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('conference-public', 'conference-private')
    AND (select auth.jwt()->>'aal') = 'aal2'
    AND public.current_admin_role() IN ('super_admin', 'content_admin', 'editor')
  );
