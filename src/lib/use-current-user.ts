import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { AppRole } from "./setores";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  setor: string | null;
  cargo: string | null;
  ativo: boolean;
}

export interface CurrentUser {
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
}

export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({
    loading: true,
    user: null,
    profile: null,
    roles: [],
  });

  useEffect(() => {
    let mounted = true;

    async function load(user: User | null) {
      if (!user) {
        if (mounted) setState({ loading: false, user: null, profile: null, roles: [] });
        return;
      }
      const [{ data: profile }, { data: rolesData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!mounted) return;
      setState({
        loading: false,
        user,
        profile: (profile as Profile | null) ?? null,
        roles: (rolesData ?? []).map((r: { role: AppRole }) => r.role),
      });
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
