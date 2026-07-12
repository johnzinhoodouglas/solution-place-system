
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM (
  'master','diretoria','qualidade','engenharia','vendas','compras',
  'financeiro','producao','seguranca','fiscal','recepcao'
);

-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  setor TEXT,
  cargo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de papéis
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função has_role (SECURITY DEFINER, sem recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-criação de perfil no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas: profiles
CREATE POLICY "profiles_select_self_or_priv" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'master')
  OR public.has_role(auth.uid(), 'diretoria')
);

CREATE POLICY "profiles_update_self_or_priv" ON public.profiles
FOR UPDATE TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'master')
  OR public.has_role(auth.uid(), 'diretoria')
);

CREATE POLICY "profiles_insert_priv" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'master')
  OR public.has_role(auth.uid(), 'diretoria')
);

-- Políticas: user_roles
CREATE POLICY "roles_select_self_or_priv" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'master')
  OR public.has_role(auth.uid(), 'diretoria')
);

CREATE POLICY "roles_manage_priv" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'master')
  OR public.has_role(auth.uid(), 'diretoria')
)
WITH CHECK (
  public.has_role(auth.uid(), 'master')
  OR public.has_role(auth.uid(), 'diretoria')
);
