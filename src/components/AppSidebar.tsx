import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  BookMarked, 
  User, 
  Moon, 
  Sun, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Search', url: '/search', icon: Search },
  { title: 'Library', url: '/library', icon: BookMarked },
  { title: 'Profile', url: '/profile', icon: User },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">GitExplorer</span>
          </Link>
        )}
        {collapsed && (
          <Sparkles className="h-6 w-6 text-primary mx-auto" />
        )}
      </div>

      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 space-y-2">
          <Separator className="mb-4" />
          
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn("w-full", !collapsed && "justify-start")}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            {!collapsed && <span className="ml-2">Toggle theme</span>}
          </Button>

          {user && (
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "sm"}
              className={cn("w-full text-destructive hover:text-destructive", !collapsed && "justify-start")}
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span className="ml-2">Sign out</span>}
            </Button>
          )}

          <div className="flex justify-center pt-2">
            <SidebarTrigger>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </SidebarTrigger>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
