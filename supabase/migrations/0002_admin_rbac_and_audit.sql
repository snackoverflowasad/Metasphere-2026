-- 0002_admin_rbac_and_audit.sql
-- Administrative RBAC roles, immutable audit trail, and CMS content version history

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.admin_role AS ENUM ('super_admin', 'content_admin', 'editor');
  END IF;
END
$$;

-- 14. admin_roles
CREATE TABLE IF NOT EXISTS public.admin_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  role public.admin_role NOT NULL DEFAULT 'editor',
  can_approve_financial boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_admin_roles_updated_at ON public.admin_roles;
CREATE TRIGGER set_admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 15. audit_logs (immutable append-only log)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_table_record_idx ON public.audit_logs (table_name, record_id);

-- 16. content_versions
CREATE TABLE IF NOT EXISTS public.content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  version_number integer NOT NULL CHECK (version_number >= 1),
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_name, record_id, version_number)
);

CREATE INDEX IF NOT EXISTS content_versions_lookup_idx
  ON public.content_versions (table_name, record_id, version_number DESC);
