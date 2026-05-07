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
import {
  MessageSquarePlus,
  FolderKanban,
  BookmarkCheck,
  History,
  Wand2,
  Settings,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SidebarKey =
  | "new"
  | "projects"
  | "saved"
  | "history"
  | "presets"
  | "settings";

const ITEMS: { key: SidebarKey; title: string; icon: LucideIcon }[] = [
  { key: "new", title: "New Chat", icon: MessageSquarePlus },
  { key: "projects", title: "Projects", icon: FolderKanban },
  { key: "saved", title: "Saved Voices", icon: BookmarkCheck },
  { key: "history", title: "History", icon: History },
  { key: "presets", title: "AI Presets", icon: Wand2 },
  { key: "settings", title: "Settings", icon: Settings },
];

interface Props {
  active: SidebarKey;
  onSelect: (k: SidebarKey) => void;
}

export function AppSidebar({ active, onSelect }: Props) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-neon)",
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold text-gradient">VoxWave</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                AI Voice Studio
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onSelect(item.key)}
                      className={`rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-[color:var(--neon-purple)]/25 to-[color:var(--neon-blue)]/15 text-foreground shadow-[0_0_20px_oklch(0.7_0.25_295/0.25)]"
                          : "hover:bg-white/5 hover:translate-x-0.5"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
