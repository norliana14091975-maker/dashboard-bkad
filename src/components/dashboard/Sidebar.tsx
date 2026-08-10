"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Eye,
  Shield,
  Landmark,
  ChevronDown,
  ChevronRight,
  X,
  BarChart3,
  AlertTriangle,
  BotMessageSquare,
} from "lucide-react";
import { ActiveView } from "./types";
import { usePengaturan, DEFAULT_COPILOT_CONFIG } from "@/context/PengaturanContext";
import { useAuth } from "@/hooks/use-auth";

type SidebarProps = {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  isOpen: boolean;
  onToggle: () => void;
};

const menuItems = [
  {
    id: "dashboard" as ActiveView,
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "ringkasan-eksekutif" as ActiveView,
    label: "Ringkasan Eksekutif",
    icon: BarChart3,
  },
  {
    id: "analisis-risiko" as ActiveView,
    label: "Analisis Risiko",
    icon: AlertTriangle,
  },
  {
    id: "copilot" as ActiveView,
    label: "AI Copilot",
    icon: BotMessageSquare,
  },
  {
    id: "anggaran" as string,
    label: "Anggaran",
    icon: TrendingUp,
    children: [
      { id: "apbd" as ActiveView, label: "APBD" },
      { id: "pendapatan" as ActiveView, label: "Pendapatan" },
      { id: "belanja" as ActiveView, label: "Belanja" },
      { id: "pembiayaan" as ActiveView, label: "Pembiayaan" },
    ],
  },
  {
    id: "realisasi" as string,
    label: "Realisasi",
    icon: FileText,
    children: [
      { id: "realisasi-akun" as ActiveView, label: "Realisasi Per-Akun" },
      { id: "realisasi-skpd" as ActiveView, label: "Realisasi Per-SKPD" },
    ],
  },
  {
    id: "opd" as ActiveView,
    label: "OPD",
    icon: Landmark,
  },
  {
    id: "transparansi" as ActiveView,
    label: "Transparansi",
    icon: Eye,
  },
  {
    id: "admin" as ActiveView,
    label: "Admin",
    icon: Shield,
  },
];

// Helper to convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Smooth cubic-bezier transition string
const smoothTransition = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function Sidebar({
  activeView,
  onViewChange,
  isOpen,
  onToggle,
}: SidebarProps) {
  const { pengaturan, logoSrc } = usePengaturan();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    "anggaran",
    "realisasi",
  ]);

  // Desktop hover state
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Desktop: collapsed = icons only, expanded = full sidebar
  // Mobile: toggle-based
  const isExpanded = isDesktop ? isHovered : isOpen;

  // Get current user role for sidebar visibility
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

  // Filter menu items based on sidebar visibility config
  const filteredMenuItems = useMemo(() => {
    const copilotEnabled = pengaturan.copilotConfig?.enabled ?? DEFAULT_COPILOT_CONFIG.enabled;

    return menuItems
      .map((item) => {
        // Hide copilot menu if disabled in settings
        if (item.id === "copilot" && !copilotEnabled) return null;

        if ("children" in item && item.children) {
          // Filter children
          const filteredChildren = item.children.filter(
            (child) => !isItemHidden(child.id)
          );
          // If all children are hidden, hide the parent group too
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        // Simple item: check if hidden
        if (isItemHidden(item.id)) return null;
        return item;
      })
      .filter(Boolean);
  }, [isItemHidden, pengaturan.copilotConfig?.enabled]);

  const handleMouseEnter = useCallback(() => {
    if (isDesktop) setIsHovered(true);
  }, [isDesktop]);

  const handleMouseLeave = useCallback(() => {
    if (isDesktop) setIsHovered(false);
  }, [isDesktop]);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleViewChange = (view: ActiveView) => {
    onViewChange(view);
    // Close sidebar on mobile after selection
    if (!isDesktop) {
      onToggle();
    }
  };

  // Color helpers
  const accentColor = pengaturan.warnaAccent;
  const primaryColor = pengaturan.warnaPrimary;
  const activeBg = hexToRgba(primaryColor, 0.08);
  const activeChildBg = hexToRgba(primaryColor, 0.06);
  const hoverBg = hexToRgba(primaryColor, 0.04);

  // Whether labels are visible (expanded state)
  const showLabels = !isDesktop || isHovered;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Desktop backdrop overlay when sidebar is expanded */}
      {isDesktop && isHovered && (
        <div
          className="fixed inset-0 bg-black/10 z-40 transition-opacity duration-300"
          onMouseEnter={handleMouseLeave}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          backgroundColor: primaryColor,
          transitionTimingFunction: smoothTransition,
        }}
        className={cn(
          "fixed top-0 left-0 z-50 h-full text-white flex flex-col",
          "transition-all duration-300",
          // Subtle shadow only when expanded
          isExpanded ? "shadow-lg shadow-black/10" : "shadow-none",
          // Desktop: collapsed (w-[60px]) or expanded (w-64)
          isDesktop
            ? isHovered
              ? "w-64"
              : "w-[60px]"
            : // Mobile: toggle-based slide-in
              isOpen
              ? "w-72 translate-x-0"
              : "w-72 -translate-x-full"
        )}
      >
        {/* ====== Brand Section ====== */}
        <div
          className={cn(
            "flex items-center shrink-0",
            "transition-all duration-300",
            isDesktop
              ? isHovered
                ? "gap-3 px-4 py-5"
                : "justify-center px-0 py-5"
              : "gap-3 px-5 py-5"
          )}
        >
          {/* Logo in rounded container */}
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center p-1.5"
              style={{ border: `1px solid rgba(255,255,255,0.12)` }}
            >
              <img
                src={logoSrc}
                alt="Logo Kabupaten Seruyan"
                className="w-full h-full object-contain brightness-0 invert"
              />
            </div>
          </div>

          {/* Text - visible when expanded */}
          <div
            className={cn(
              "flex-1 min-w-0 overflow-hidden transition-all duration-300",
              showLabels ? "w-auto opacity-100" : "w-0 opacity-0"
            )}
          >
            <h1 className="text-[15px] font-bold tracking-wide modern-gradient-text truncate">
              Dashboard
            </h1>
            <p className="text-[11px] text-white/45 font-medium truncate mt-0.5">
              Kab. Seruyan
            </p>
          </div>

          {/* Mobile close button */}
          {!isDesktop && (
            <button
              onClick={onToggle}
              className="text-white/40 hover:text-white transition-colors duration-200 p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Separator line */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ====== Navigation ====== */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-3">
          <ul className="space-y-0.5 px-2">
            {filteredMenuItems.map((item) => {
              if ("children" in item && item.children) {
                const isExpandedMenu = expandedMenus.includes(item.id);
                const isChildActive = item.children.some(
                  (child) => child.id === activeView
                );

                return (
                  <li key={item.id}>
                    {/* Group header button */}
                    <button
                      onClick={() => {
                        if (isDesktop && !isHovered) {
                          setIsHovered(true);
                        }
                        toggleMenu(item.id);
                      }}
                      className={cn(
                        "modern-sidebar-item w-full flex items-center rounded-xl text-[13px]",
                        "transition-all duration-200",
                        isDesktop
                          ? isHovered
                            ? "gap-3 px-3 py-2.5"
                            : "justify-center px-0 py-2.5"
                          : "gap-3 px-3 py-2.5",
                        isChildActive
                          ? "modern-sidebar-item-active font-semibold"
                          : "text-white/60 hover:text-white/90"
                      )}
                      style={{
                        ...(isChildActive
                          ? {
                              backgroundColor: activeBg,
                              color: accentColor,
                            }
                          : { "--hover-bg": hoverBg } as React.CSSProperties),
                        transitionTimingFunction: smoothTransition,
                      }}
                      onMouseEnter={(e) => {
                        if (!isChildActive) {
                          e.currentTarget.style.backgroundColor = hoverBg;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isChildActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                      title={!isDesktop || isHovered ? undefined : item.label}
                    >
                      {/* Accent bar for active group */}
                      {isChildActive && showLabels && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                          style={{ backgroundColor: accentColor }}
                        />
                      )}
                      <item.icon className="w-5 h-5 shrink-0 ml-0" />
                      {/* Label - visible when expanded */}
                      <span
                        className={cn(
                          "flex-1 text-left font-medium overflow-hidden transition-all duration-300",
                          showLabels ? "w-auto opacity-100" : "w-0 opacity-0"
                        )}
                        style={{ transitionTimingFunction: smoothTransition }}
                      >
                        {item.label}
                      </span>
                      {/* Chevron - visible when expanded */}
                      <span
                        className={cn(
                          "shrink-0 overflow-hidden transition-all duration-200",
                          showLabels ? "w-auto opacity-100" : "w-0 opacity-0"
                        )}
                        style={{ transitionTimingFunction: smoothTransition }}
                      >
                        <ChevronDown
                          className={cn(
                            "w-3.5 h-3.5 text-white/40 transition-transform duration-200",
                            isExpandedMenu ? "rotate-0" : "-rotate-90"
                          )}
                        />
                      </span>
                    </button>

                    {/* Children - only visible when expanded */}
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        showLabels
                          ? isExpandedMenu
                            ? "max-h-60 opacity-100"
                            : "max-h-0 opacity-0"
                          : "max-h-0 opacity-0"
                      )}
                      style={{ transitionTimingFunction: smoothTransition }}
                    >
                      <ul className="modern-sidebar-connector pl-5 py-1 space-y-0.5">
                        {item.children.map((child) => {
                          const isChildItemActive = activeView === child.id;
                          return (
                            <li key={child.id}>
                              <button
                                onClick={() =>
                                  handleViewChange(child.id as ActiveView)
                                }
                                className={cn(
                                  "modern-sidebar-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs",
                                  "transition-all duration-200",
                                  isChildItemActive
                                    ? "modern-sidebar-item-active font-semibold"
                                    : "text-white/45 hover:text-white/80"
                                )}
                                style={{
                                  ...(isChildItemActive
                                    ? {
                                        backgroundColor: activeChildBg,
                                        color: accentColor,
                                      }
                                    : {}),
                                  transitionTimingFunction: smoothTransition,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isChildItemActive) {
                                    e.currentTarget.style.backgroundColor = hoverBg;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isChildItemActive) {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  }
                                }}
                              >
                                {/* Accent bar for active child */}
                                {isChildItemActive && (
                                  <span
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[50%] rounded-r-full"
                                    style={{ backgroundColor: accentColor }}
                                  />
                                )}
                                {/* Dot indicator */}
                                <span
                                  className={cn(
                                    "w-1 h-1 rounded-full shrink-0",
                                    isChildItemActive
                                      ? ""
                                      : "bg-white/25"
                                  )}
                                  style={
                                    isChildItemActive
                                      ? { backgroundColor: accentColor }
                                      : undefined
                                  }
                                />
                                {child.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </li>
                );
              }

              // Simple menu item (no children)
              const isActive = activeView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleViewChange(item.id as ActiveView)}
                    className={cn(
                      "modern-sidebar-item w-full flex items-center rounded-xl text-[13px]",
                      "transition-all duration-200",
                      isDesktop
                        ? isHovered
                          ? "gap-3 px-3 py-2.5"
                          : "justify-center px-0 py-2.5"
                        : "gap-3 px-3 py-2.5",
                      isActive
                        ? "modern-sidebar-item-active font-semibold"
                        : "text-white/60 hover:text-white/90"
                    )}
                    style={{
                      ...(isActive
                        ? {
                            backgroundColor: activeBg,
                            color: accentColor,
                          }
                        : {}),
                      transitionTimingFunction: smoothTransition,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = hoverBg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                    title={!isDesktop || isHovered ? undefined : item.label}
                  >
                    {/* Left accent bar for active item */}
                    {isActive && showLabels && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                    <item.icon className="w-5 h-5 shrink-0 ml-0" />
                    {/* Label - visible when expanded */}
                    <span
                      className={cn(
                        "font-medium overflow-hidden transition-all duration-300",
                        showLabels ? "w-auto opacity-100" : "w-0 opacity-0"
                      )}
                      style={{ transitionTimingFunction: smoothTransition }}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Separator line */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ====== Footer ====== */}
        <div
          className={cn(
            "shrink-0 transition-all duration-300 overflow-hidden",
            isDesktop
              ? isHovered
                ? "px-4 py-3"
                : "px-0 py-3"
              : "px-5 py-3"
          )}
        >
          <p
            className={cn(
              "text-[10px] text-white/30 text-center transition-all duration-300",
              showLabels ? "opacity-100 h-auto" : "opacity-0 h-0"
            )}
          >
            {pengaturan.namaInstansi}
          </p>
          <p
            className={cn(
              "text-[9px] text-white/20 text-center transition-all duration-300",
              showLabels ? "opacity-100 h-auto" : "opacity-0 h-0"
            )}
          >
            v2.0 · © 2024
          </p>
        </div>
      </aside>
    </>
  );
}
