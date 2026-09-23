import { NavLink, useLocation } from "react-router-dom";
import {
  BookMarked,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const studentItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Níveis", url: "/levels", icon: BookMarked },
  { title: "Minhas Turmas", url: "/my-classes", icon: Users },
];

const teacherItems = [
  { title: "Painel Professor", url: "/teacher", icon: GraduationCap },
  { title: "Aulas & Conteúdo", url: "/teacher/lessons", icon: BookOpen },
  { title: "Turmas", url: "/teacher/classes", icon: Users },
];

const adminItems = [
  { title: "Painel Admin", url: "/admin", icon: ShieldCheck },
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Níveis & Módulos", url: "/admin/levels", icon: BookMarked },
];

export default function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const { pathname } = useLocation();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const renderItems = (items: typeof studentItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title} size="lg">
            <NavLink to={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="font-display text-sm font-extrabold leading-none">
              Inglês <span className="text-primary">Hope</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Learning platform</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel>Aprender</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(studentItems)}</SidebarGroupContent>
        </SidebarGroup>

        {(role === "teacher" || role === "admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Ensinar</SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(teacherItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(adminItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="mb-1 flex items-center gap-2 rounded-xl bg-sidebar-accent/60 p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {(profile?.full_name?.trim()?.[0] ?? "U").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">{profile?.full_name ?? "Utilizador"}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{role ?? "student"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
