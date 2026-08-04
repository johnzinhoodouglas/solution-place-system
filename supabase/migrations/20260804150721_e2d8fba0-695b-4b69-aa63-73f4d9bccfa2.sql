REVOKE ALL ON FUNCTION public.has_any_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated, service_role;