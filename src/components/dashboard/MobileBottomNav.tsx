"use client";

import { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  BarChart3,
  BotMessageSquare,
  Menu,
  AlertTriangle,
  Eye,
  Shield,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { ActiveView } from "./types";
import { usePengaturan, DEFAULT_COPILOT_CONFIG } from "@/context/PengaturanContext";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

type MobileBottomNavProps = {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onOpenSidebar: () => void;
};

type NavItem = {
  id: ActiveView | "more";
  label: string;
  icon: LucideIcon;
  isMore?: boolean;
};

// All candidate items (in priority order) — we'll pick the top ones that aren't hidden
const CANDIDATE_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { id: "apbd", label: "APBD", icon: FileText },
  { id: "realisasi-skpd", label: "Realisasi", icon: TrendingUp },
  { id: "analisis-risiko", label: "Risiko", icon: AlertTriangle },
  { id: "ringkasan-eksekutif", label: "Ringkasan", icon: BarChart3 },
  { id: "copilot", label: "AI", icon: BotMessageSquare },
  { id: "opd", label: "OPD", icon: Landmark },
  { id: "transparansi", label: "Info", icon: Eye },
  { id: "admin", label: "Admin", icon: Shield },
];

const MAX_VISIBLE_ITEMS = 4; // 4 nav items + 1 "More" button = 5 total

export default function MobileBottomNav({
  activeView,
  onViewChange,
  onOpenSidebar,
}: MobileBottomNavProps) {
  const { pengaturan } = usePengaturan();
  const { user } = useAuth();
  const userRole = user?.role || "public";

  // Check if a sidebar item is hidden for the current role
  const isItemHidden = useCallback(
    (itemId: string): boolean => {
      const hiddenItems = pengaturan.sidebarConfig?.hiddenItems;
      if (!hiddenItems) return false;
      const roleHidden = hiddenItems[userRole] || [];
      return roleHidden.includes(itemId);
    },
    [pengaturan.sidebarConfig, userRole]
  );

  const copilotEnabled = pengaturan.copilotConfig?.enabled ?? DEFAULT_COPILOT_CONFIG.enabled;

  // Build the visible items list: filter hidden items, then pick top N
  const visibleItems = useMemo(() => {
    const filtered = CANDIDATE_ITEMS.filter((item) => {
      if (item.id === "more") return true;
      if (item.id === "copilot" && !copilotEnabled) return false;
      return !isItemHidden(item.id);
    });
    return filtered.slice(0, MAX_VISIBLE_ITEMS);
  }, [isItemHidden, copilotEnabled]);

  // Determine which item is "active" — for sub-items like belanja/pendapatan, highlight APBD
  const getActiveNavId = useCallback(
    (view: ActiveView): string => {
      // Map sub-views to their parent nav item
      if (["pendapatan", "belanja", "pembiayaan"].includes(view)) return "apbd";
      if (view === "realisasi-akun") return "realisasi-skpd";
      return view;
    },
    []
  );

  const activeNavId = getActiveNavId(activeView);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.06]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch justify-around h-14">
        {visibleItems.map((item) => {
          const isActive = activeNavId === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ActiveView)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground/60 active:text-foreground active:scale-95"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaAccent})` }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <Icon
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive && "scale-110"
                )}
                style={isActive ? { color: pengaturan.warnaAccent } : undefined}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight transition-colors duration-200",
                  isActive && "font-semibold"
                )}
                style={isActive ? { color: pengaturan.warnaAccent } : undefined}
              >
                {item.label}
              </span>

              {/* Active dot */}
              {/* Active dot removed for cleaner look */}
            </button>
          );
        })}

        {/* More button — always the last item */}
        <button
          onClick={onOpenSidebar}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200",
            activeView === "admin" || !visibleItems.some((item) => item.id === activeNavId)
              ? "text-foreground"
              : "text-muted-foreground/60 active:text-foreground active:scale-95"
          )}
          aria-label="Menu lainnya"
        >
          {/* Active indicator for "More" when a non-visible item is active */}
          {(activeView === "admin" || !visibleItems.some((item) => item.id === activeNavId)) &&
            activeView !== "dashboard" && (
              <motion.div
                layoutId="mobileNavIndicator"
                className="absolute -top-px left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full"
                style={{ background: `linear-gradient(90deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaAccent})` }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

          <Menu
            className={cn(
              "w-5 h-5 transition-transform duration-200",
              (activeView === "admin" || !visibleItems.some((item) => item.id === activeNavId)) &&
                activeView !== "dashboard" &&
                "scale-110"
            )}
            style={
              (activeView === "admin" || !visibleItems.some((item) => item.id === activeNavId)) &&
              activeView !== "dashboard"
                ? { color: pengaturan.warnaAccent }
                : undefined
            }
          />
          <span
            className={cn(
              "text-[10px] font-medium leading-tight transition-colors duration-200",
              (activeView === "admin" || !visibleItems.some((item) => item.id === activeNavId)) &&
                activeView !== "dashboard" &&
                "font-semibold"
            )}
            style={
              (activeView === "admin" || !visibleItems.some((item) => item.id === activeNavId)) &&
              activeView !== "dashboard"
                ? { color: pengaturan.warnaAccent }
                : undefined
            }
          >
            Lainnya
          </span>
        </button>
      </div>
    </nav>
  );
}
