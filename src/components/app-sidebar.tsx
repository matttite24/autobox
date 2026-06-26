"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipPopup,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPopup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Settings01Icon,
  ContactBookIcon,
  UserCircleIcon,
  Task01Icon,
  Car01Icon,
  PackageIcon,
  ShoppingBag01Icon,
  Clock01Icon,
  AddMoneyCircleIcon,
  Moon02Icon,
  Sun01Icon,
  ComputerIcon,
  Configuration02Icon,
  Home01Icon,
  ArrowDown01Icon,
  Wrench01Icon,
} from "hugeicons-react";
import Link from "next/link";
import { NEW_SHORTCUT_EVENT } from "@/lib/shortcuts";
import { useTheme } from "@/components/theme-provider";
import { flushSync } from "react-dom";
import { NotificationsSheet, useNotificationCount } from "@/components/notifications/notifications-sheet";


const NAV_MAIN = [
  { title: "Inicio",    url: "/inicio",           icon: Home01Icon },
  { title: "Órdenes",  url: "/ordenes",           icon: Task01Icon },
  { title: "Historial",url: "/ordenes/historial", icon: Clock01Icon },
  { title: "Vehículos",url: "/vehiculos",          icon: Car01Icon },
  { title: "Servicios",url: "/servicios",          icon: Configuration02Icon },
];

const NAV_BUSINESS = [
  { title: "Ventas",    url: "/ventas",    icon: ShoppingBag01Icon },
  { title: "Almacén",   url: "/inventario",icon: PackageIcon },
  { title: "Personas",  url: "/clientes",  icon: ContactBookIcon },
];

const FINANZAS_SUB = [
  { title: "Movimientos", url: "/finanzas" },
  { title: "Compras",     url: "/compras" },
  { title: "Nómina",      url: "/nomina" },
];

const SETTINGS_SECTIONS = [
  { title: "Mi Empresa",  url: "/ajustes" },
  { title: "Facturación", url: "/ajustes?section=facturacion" },
  { title: "Inventario",  url: "/ajustes?section=inventario" },
  { title: "Finanzas",    url: "/ajustes?section=finanzas" },
  { title: "Plantillas",  url: "/plantillas" },
  { title: "Perfil",      url: "/ajustes?section=perfil" },
];

export function AppSidebar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return <AppSidebarContent pathname={pathname} />;
}

function AppSidebarContent({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";

  const org = useQuery(api.organizations.current, {});
  const currentUser = useQuery(api.users.currentUser, {});
  const openCashSession = useQuery(
    api.finances.getOpenCashSession,
    org?._id ? { orgId: org._id } : "skip",
  );

  const currentSection = searchParams.get("section") ?? "general";
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const isFinanzasActive = FINANZAS_SUB.some((s) => pathname === s.url);
  const isSettingsActive =
    pathname === "/ajustes" || pathname.startsWith("/plantillas");

  const [finanzasOpen, setFinanzasOpen] = useState(isFinanzasActive);
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationCount = useNotificationCount(org?._id);

  useEffect(() => {
    if (isCollapsed) {
      setFinanzasOpen(false);
      setSettingsOpen(false);
    }
  }, [isCollapsed]);

  useEffect(() => { setMounted(true); }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    const next =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    if (!document.startViewTransition) { setTheme(next); return; }
    document.startViewTransition(() => { flushSync(() => setTheme(next)); });
  };

  const isSettingsSectionActive = (url: string) => {
    if (!url.startsWith("/ajustes")) return pathname === url;
    const u = new URL(url, "http://localhost");
    const target = u.searchParams.get("section") ?? "general";
    return pathname === "/ajustes" && currentSection === target;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) return;
      if (e.key.toLowerCase() !== "n") return;
      const routes: Record<string, string> = {
        "/ordenes": "/ordenes?new=1",
        "/ordenes/historial": "/ordenes/historial?new=1",
        "/clientes": "/clientes?new=1",
        "/vehiculos": "/vehiculos?new=1",
        "/compras": "/compras?new=1",
        "/ventas": "/ventas?new=1",
        "/servicios": "/servicios?new=1",
        "/inventario": "/inventario?new=1",
        "/finanzas": "/finanzas?new=1",
        "/nomina": "/nomina?new=1",
      };
      const target = routes[pathname];
      if (!target) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(NEW_SHORTCUT_EVENT, { detail: { pathname } }));
      router.push(`${target}${target.includes("?") ? "&" : "?"}ts=${Date.now()}`);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router]);

  const getButtonClass = (isActive: boolean) => cn(
    "w-full flex items-center rounded-lg transition-all duration-200 outline-none select-none h-9 px-3 py-2 gap-3 text-[14px] font-medium",
    isActive
      ? "bg-sidebar-accent text-sidebar-foreground"
      : "text-sidebar-foreground/[0.96] hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
    "group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:gap-0"
  );

  const renderButton = (
    content: React.ReactNode,
    tooltipText: string,
    isActive: boolean,
    onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>,
    href?: string
  ) => {
    const className = getButtonClass(isActive);
    const element = href ? (
      <Link href={href} className={className} onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}>
        {content}
      </Link>
    ) : (
      <button type="button" className={className} onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}>
        {content}
      </button>
    );

    return (
      <Tooltip>
        <TooltipTrigger render={element} />
        <TooltipPopup align="center" side="right" hidden={!isCollapsed}>
          {tooltipText}
        </TooltipPopup>
      </Tooltip>
    );
  };

  return (
    <Sidebar collapsible="icon">

      {/* ── Logo / Notificaciones ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(true)}
                    className={getButtonClass(false)}
                  >
                    <div className="relative flex aspect-square size-5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <Wrench01Icon className="size-3" strokeWidth={1.75} />
                      {notificationCount > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-1 ring-sidebar">
                          {notificationCount > 9 ? "9+" : notificationCount}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-[15px] transition-[max-width,opacity] duration-200 ease-in-out whitespace-nowrap overflow-hidden max-w-40 group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                      Autobox
                    </span>
                  </button>
                }
              />
              <TooltipPopup align="center" side="right" hidden={!isCollapsed}>
                Notificaciones{notificationCount > 0 ? ` (${notificationCount})` : ""}
              </TooltipPopup>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {org?._id && (
        <NotificationsSheet
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          orgId={org._id}
        />
      )}

      {/* ── Navegación ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>

              {NAV_MAIN.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {renderButton(
                    <>
                      <item.icon className="size-5 shrink-0" strokeWidth={1.75} />
                      <span className="transition-[max-width,opacity] duration-200 ease-in-out whitespace-nowrap overflow-hidden max-w-40 group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                        {item.title}
                      </span>
                    </>,
                    item.title,
                    pathname === item.url,
                    undefined,
                    item.url
                  )}
                </SidebarMenuItem>
              ))}

              {/* Separador entre secciones */}
              <li aria-hidden className="my-1 h-px bg-sidebar-border/60 transition-[width,margin] duration-200 ease-in-out w-full group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:mx-auto" />

              {NAV_BUSINESS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {renderButton(
                    <>
                      <item.icon className="size-5 shrink-0" />
                      <span className="transition-[max-width,opacity] duration-200 ease-in-out whitespace-nowrap overflow-hidden max-w-40 group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                        {item.title}
                      </span>
                    </>,
                    item.title,
                    pathname === item.url,
                    undefined,
                    item.url
                  )}
                </SidebarMenuItem>
              ))}

              {/* Finanzas */}
              <SidebarMenuItem>
                {!isCollapsed ? (
                  <>
                    {renderButton(
                      <>
                        <AddMoneyCircleIcon
                          className={cn(
                            "size-5 shrink-0 transition-colors",
                            openCashSession ? "text-emerald-500" : ""
                          )}
                          strokeWidth={1.75}
                        />
                        <span className="transition-[max-width,opacity] duration-200 ease-in-out whitespace-nowrap overflow-hidden max-w-40 group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                          Finanzas
                        </span>
                        <ArrowDown01Icon
                          strokeWidth={1.75}
                          className={cn(
                            "ml-auto size-4 shrink-0 transition-all duration-200",
                            finanzasOpen && "rotate-180",
                            "group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0"
                          )}
                        />
                      </>,
                      "Finanzas",
                      isFinanzasActive,
                      () => setFinanzasOpen((o) => !o)
                    )}
                    {finanzasOpen && (
                      <SidebarMenuSub>
                        {FINANZAS_SUB.map((sub) => (
                          <SidebarMenuSubItem key={sub.title}>
                            <SidebarMenuSubButton
                              render={<Link href={sub.url} />}
                              isActive={pathname === sub.url}
                            >
                              <span>{sub.title}</span>
                              {sub.title === "Movimientos" && openCashSession && (
                                <span className="ml-auto size-2 rounded-full bg-emerald-500 shrink-0" />
                              )}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button type="button" className={getButtonClass(isFinanzasActive)}>
                          <AddMoneyCircleIcon
                            className={cn(
                              "size-5 shrink-0 transition-colors",
                              openCashSession ? "text-emerald-500" : ""
                            )}
                            strokeWidth={1.75}
                          />
                        </button>
                      }
                    />
                    <DropdownMenuPopup align="start" side="right" sideOffset={14} className="min-w-48 py-1.5">
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                        Finanzas
                      </div>
                      {FINANZAS_SUB.map((sub) => (
                        <DropdownMenuItem
                          key={sub.title}
                          render={<Link href={sub.url} />}
                          className={cn(pathname === sub.url && "bg-accent text-accent-foreground")}
                        >
                          <span className="flex-1">{sub.title}</span>
                          {sub.title === "Movimientos" && openCashSession && (
                            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuPopup>
                  </DropdownMenu>
                )}
              </SidebarMenuItem>

              {/* Ajustes */}
              <SidebarMenuItem>
                {!isCollapsed ? (
                  <>
                    {renderButton(
                      <>
                        <Settings01Icon className="size-5 shrink-0" strokeWidth={1.75} />
                        <span className="transition-[max-width,opacity] duration-200 ease-in-out whitespace-nowrap overflow-hidden max-w-40 group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                          Ajustes
                        </span>
                        <ArrowDown01Icon
                          strokeWidth={1.75}
                          className={cn(
                            "ml-auto size-4 shrink-0 transition-all duration-200",
                            settingsOpen && "rotate-180",
                            "group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0"
                          )}
                        />
                      </>,
                      "Ajustes",
                      isSettingsActive,
                      () => {
                        const opening = !settingsOpen;
                        setSettingsOpen(opening);
                        if (opening) router.push("/ajustes");
                      }
                    )}
                    {settingsOpen && (
                      <SidebarMenuSub>
                        {SETTINGS_SECTIONS.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              render={<Link href={item.url} />}
                              isActive={isSettingsSectionActive(item.url)}
                            >
                              {item.title}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button type="button" className={getButtonClass(isSettingsActive)}>
                          <Settings01Icon className="size-5 shrink-0" strokeWidth={1.75} />
                        </button>
                      }
                    />
                    <DropdownMenuPopup align="start" side="right" sideOffset={14} className="min-w-48 py-1.5">
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                        Ajustes
                      </div>
                      {SETTINGS_SECTIONS.map((item) => (
                        <DropdownMenuItem
                          key={item.title}
                          render={<Link href={item.url} />}
                          className={cn(isSettingsSectionActive(item.url) && "bg-accent text-accent-foreground")}
                        >
                          {item.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuPopup>
                  </DropdownMenu>
                )}
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {renderButton(
              <>
                <div className="relative flex size-5 shrink-0 items-center justify-center">
                  <Sun01Icon strokeWidth={1.75} className={cn("absolute size-5 transition-all duration-200", mounted && theme === "light" ? "scale-100 rotate-0" : "scale-0 -rotate-90")} />
                  <Moon02Icon strokeWidth={1.75} className={cn("absolute size-5 transition-all duration-200", mounted && theme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90")} />
                  <ComputerIcon strokeWidth={1.75} className={cn("absolute size-5 transition-all duration-200", !mounted || theme === "system" ? "scale-100 rotate-0" : "scale-0 rotate-90")} />
                </div>
                <span className="capitalize transition-[max-width,opacity] duration-200 ease-in-out whitespace-nowrap overflow-hidden max-w-40 group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                  Modo{" "}{mounted ? (theme === "system" ? "sistema" : theme === "dark" ? "oscuro" : "claro") : "sistema"}
                </span>
              </>,
              "Alternar tema",
              false,
              toggleTheme
            )}
          </SidebarMenuItem>

          <SidebarMenuItem>
            {renderButton(
              <>
                <UserCircleIcon className="size-5 shrink-0" strokeWidth={1.75} />
                <div className="flex min-w-0 flex-col items-start text-left leading-none gap-0.5 transition-[max-width,opacity] duration-200 ease-in-out whitespace-nowrap overflow-hidden max-w-40 group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                  <span className="truncate text-sm font-medium">{currentUser?.name ?? currentUser?.email?.split("@")[0] ?? "Usuario"}</span>
                  <span className="truncate text-xs text-muted-foreground">{currentUser?.email ?? ""}</span>
                </div>
              </>,
              currentUser?.name ?? "Perfil",
              false,
              undefined,
              "/ajustes?section=perfil"
            )}
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
