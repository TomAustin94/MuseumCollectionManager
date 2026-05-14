-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  full_name     text,
  role          text NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('viewer', 'editor', 'admin')),
  mfa_enabled   boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- categories
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  description   text,
  parent_id     uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all_authenticated" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "categories_write_editor" ON public.categories
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('editor', 'admin')
  );

-- ============================================================
-- locations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.locations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          text NOT NULL
                CHECK (type IN ('display', 'storage', 'loan', 'conservation')),
  description   text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select_all_authenticated" ON public.locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "locations_write_editor" ON public.locations
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('editor', 'admin')
  );

-- ============================================================
-- items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accession_number  text UNIQUE NOT NULL,
  title             text NOT NULL,
  description       text,
  category_id       uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  location_id       uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'storage'
                    CHECK (status IN ('display', 'storage', 'loan', 'conservation', 'lost')),
  acquisition_date  date,
  acquisition_method text
                    CHECK (acquisition_method IN ('purchase', 'donation', 'bequest', 'transfer')),
  donor_name        text,
  estimated_value   numeric(12, 2),
  condition         text
                    CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  provenance        text,
  notes             text,
  images            text[] DEFAULT '{}',
  tags              text[] DEFAULT '{}',
  search_vector     tsvector,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS items_search_idx ON public.items USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS items_trgm_idx ON public.items USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS items_accession_trgm_idx ON public.items USING GIN(accession_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS items_status_idx ON public.items (status);
CREATE INDEX IF NOT EXISTS items_category_idx ON public.items (category_id);
CREATE INDEX IF NOT EXISTS items_location_idx ON public.items (location_id);

-- RLS policies for items
CREATE POLICY "items_select_authenticated" ON public.items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_insert_editor" ON public.items
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('editor', 'admin')
  );

CREATE POLICY "items_update_editor" ON public.items
  FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('editor', 'admin')
  );

CREATE POLICY "items_delete_admin" ON public.items
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Trigger: update search_vector
CREATE OR REPLACE FUNCTION public.items_search_vector_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.accession_number, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS items_search_vector_trigger ON public.items;
CREATE TRIGGER items_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.items_search_vector_update();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS items_updated_at ON public.items;
CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_record_idx ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_log_changed_by_idx ON public.audit_log (changed_by);
CREATE INDEX IF NOT EXISTS audit_log_changed_at_idx ON public.audit_log (changed_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Trigger: audit items changes
CREATE OR REPLACE FUNCTION public.audit_items_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES ('items', NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES ('items', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES ('items', OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS items_audit_trigger ON public.items;
CREATE TRIGGER items_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.audit_items_change();
