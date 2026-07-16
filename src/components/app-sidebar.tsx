import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, ClipboardList, ShieldCheck, HardHat, ShoppingCart, ShoppingBag, DollarSign, FileText } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SETORES, NAV_ADMIN, podeAcessarSetor, podeIntervir } from "@/lib/setores";
import { useCurrentUser } from "@/lib/use-current-user";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { roles, profile, loading } = useCurrentUser();

  const isActive = (path: string) => pathname === path;

  const setoresVisiveis = SETORES.filter((s) =>
    loading ? false : podeAcessarSetor(roles, s),
  );

  const admin = podeIntervir(roles);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Solution Place</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                ISO 9001:2015
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/app")}>
                  <Link to="/app">
                    <Shield className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/app/os")}
                  tooltip="Ordens de Serviço"
                >
                  <Link to="/app/os">
                    <ClipboardList className="h-4 w-4" />
                    <span>Ordens de Serviço</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(roles.includes("qualidade") || roles.includes("diretoria") || roles.includes("master")) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/app/qualidade")}
                    tooltip="Qualidade"
                  >
                    <Link to="/app/qualidade">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Qualidade / NCs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {(roles.includes("seguranca") || roles.includes("diretoria") || roles.includes("master")) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/app/seguranca")}
                    tooltip="Segurança do Trabalho"
                  >
                    <Link to="/app/seguranca">
                      <HardHat className="h-4 w-4" />
                      <span>Segurança</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {(roles.includes("vendas") || roles.includes("diretoria") || roles.includes("master")) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/app/vendas")} tooltip="Vendas">
                    <Link to="/app/vendas"><ShoppingCart className="h-4 w-4" /><span>Vendas</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {(roles.includes("compras") || roles.includes("diretoria") || roles.includes("master")) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/app/compras")} tooltip="Compras">
                    <Link to="/app/compras"><ShoppingBag className="h-4 w-4" /><span>Compras</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {(roles.includes("financeiro") || roles.includes("diretoria") || roles.includes("master")) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/app/financeiro")} tooltip="Financeiro">
                    <Link to="/app/financeiro"><DollarSign className="h-4 w-4" /><span>Financeiro</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {(roles.includes("fiscal") || roles.includes("diretoria") || roles.includes("master")) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/app/fiscal")} tooltip="Fiscal">
                    <Link to="/app/fiscal"><FileText className="h-4 w-4" /><span>Fiscal / NFs</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Setores</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {setoresVisiveis.map((s) => {
                const to = "/app/setor/$setor";
                const active = pathname === `/app/setor/${s.slug}`;
                return (
                  <SidebarMenuItem key={s.slug}>
                    <SidebarMenuButton asChild isActive={active} tooltip={s.label}>
                      <Link to={to} params={{ setor: s.slug }}>
                        <s.icon className="h-4 w-4" />
                        <span>{s.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {!loading && setoresVisiveis.length === 0 && !collapsed && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Sem setor atribuído. Aguarde a Diretoria liberar seu acesso.
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {admin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ADMIN.map((item) => {
                  const to = "/app/admin/$page";
                  const active = pathname === `/app/admin/${item.slug}`;
                  return (
                    <SidebarMenuItem key={item.slug}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link to={to} params={{ page: item.slug }}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {!collapsed && profile && (
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate text-xs font-medium text-sidebar-foreground">
            {profile.nome || profile.email}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {roles.length > 0 ? roles.join(" · ") : "Sem papel"}
          </p>
        </div>
      )}
    </Sidebar>
  );
}
