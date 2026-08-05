import { Link, useNavigate } from "react-router-dom";
import { BookOpen, LogOut, LayoutDashboard, Users, GraduationCap, ShieldCheck, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";

function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  const studentItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Níveis", url: "/levels", icon: BookMarked },
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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold">Inglês <span className="text-primary">Hope</span></span>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Aluno</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {studentItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(role === "teacher" || role === "admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Professor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {teacherItems.map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto p-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2 truncate">
            {profile?.full_name} · <span className="uppercase">{role}</span>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b bg-background sticky top-0 z-40">
            <SidebarTrigger className="ml-2" />
          </header>
          <main className="flex-1 bg-background">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
