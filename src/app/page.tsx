"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SummaryCards from "@/components/dashboard/SummaryCards";
import PendapatanChart from "@/components/dashboard/PendapatanChart";
import BelanjaChart from "@/components/dashboard/BelanjaChart";
import TrendChart from "@/components/dashboard/TrendChart";
import RealisasiBarChart from "@/components/dashboard/RealisasiBarChart";
import DataTable from "@/components/dashboard/DataTable";
import RealisasiAkunView from "@/components/dashboard/RealisasiAkunView";
import RealisasiSkpdView from "@/components/dashboard/RealisasiSkpdView";
import APBDTable from "@/components/dashboard/APBDTable";
import TransparansiView from "@/components/dashboard/TransparansiView";
import SKPDQuickSummary from "@/components/dashboard/SKPDQuickSummary";
import AccountTable from "@/components/dashboard/AccountTable";
import OpdView from "@/components/dashboard/OpdView";
import ExecutiveSummaryView from "@/components/dashboard/ExecutiveSummaryView";
import AnalisisRisikoView from "@/components/dashboard/AnalisisRisikoView";
import FinancialCopilotView from "@/components/dashboard/FinancialCopilotView";
import {
  DashboardData,
  ActiveView,
  TahunAnggaranItem,
  formatRupiahShort,
} from "@/components/dashboard/types";
import AdminPanel from "@/components/admin/AdminPanel";
import OpdPanel from "@/components/admin/OpdPanel";
import LoginForm from "@/components/auth/LoginForm";
import SetupWizard from "@/components/setup/SetupWizard";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import {
  AlertCircle,
  RefreshCw,
  Clock,
  Info,
  Sparkles,
  TrendingUp,
  Shield,
  BarChart3,
  Eye,
  Activity,
  ChevronRight,
  AlertTriangle,
  BotMessageSquare,
} from "lucide-react";
import { usePengaturan } from "@/context/PengaturanContext";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import SplashLoader from "@/components/dashboard/SplashLoader";
import { useVisitorTracker } from "@/hooks/use-visitor-tracker";

export default function Home() {
  const { pengaturan, logoSrc } = usePengaturan();
  const autoRefreshInterval = pengaturan.autoRefreshInterval ?? 0;
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaderExiting, setLoaderExiting] = useState(false); // For modern loader fade-out
  const [error, setError] = useState<string | null>(null);
  const [tahun, setTahun] = useState<number>(0); // 0 = not yet initialized
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { stats: visitorStats } = useVisitorTracker(activeView);

  // Setup wizard state
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null); // null = checking

  const MIN_LOADING_MS = pengaturan.loaderDisplayTime ?? 5000; // From settings
  const minLoadingRef = useRef(MIN_LOADING_MS);
  minLoadingRef.current = MIN_LOADING_MS;

  // Auto-refresh state
  const [nextRefreshIn, setNextRefreshIn] = useState<number>(0); // seconds until next refresh
  const [isRefreshing, setIsRefreshing] = useState(false); // manual refresh spinner
  const lastRefreshRef = useRef<number>(0); // 0 = not yet initialized
  const autoRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // refresh timeout ref
  const autoRefreshIntervalRef = useRef(autoRefreshInterval); // track current interval
  autoRefreshIntervalRef.current = autoRefreshInterval;

  const fetchData = useCallback(async (tahunParam: number) => {
    setLoading(true);
    setLoaderExiting(false);
    setError(null);
    const startTime = Date.now();
    const minDisplay = minLoadingRef.current;
    try {
      const res = await fetch(`/api/dashboard?tahun=${tahunParam}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      setData(json);
      // Auto-set tahun to the latest/active year on first load
      if (tahun === 0 && json.tahunList?.length > 0) {
        setTahun(json.tahun);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      // Ensure loader is visible for at least minDisplay ms (0 = no minimum)
      if (minDisplay > 0) {
        const elapsed = Date.now() - startTime;
        const remaining = minDisplay - elapsed;
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining));
        }
      }
      // For modern loader: trigger fade-out animation before unmounting
      if (pengaturan.loaderType === "modern") {
        setLoaderExiting(true);
      }
      setLoading(false);
      // Mark the initial data load time for auto-refresh countdown
      lastRefreshRef.current = Date.now();
    }
  }, [tahun, pengaturan.loaderType]);

  // Silent refresh — updates data in background without showing loader
  const silentRefresh = useCallback(async (tahunParam: number) => {
    try {
      const res = await fetch(`/api/dashboard?tahun=${tahunParam}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      setData(json);
      lastRefreshRef.current = Date.now();
    } catch (err) {
      // Silently fail — don't show error for background refreshes
      console.warn("Auto-refresh failed:", err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  // Check if setup is needed on mount
  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((json) => {
        setNeedsSetup(json.needsSetup === true);
      })
      .catch(() => {
        // If error, assume setup is not needed (database exists)
        setNeedsSetup(false);
      });
  }, []);

  useEffect(() => {
    // Don't fetch dashboard data if setup is needed
    if (needsSetup === true || needsSetup === null) return;
    // On first load, fetch the active year from the API
    if (tahun === 0) {
      fetch('/api/dashboard').then(res => res.json()).then(json => {
        if (json.activeTahun) {
          setTahun(json.activeTahun);
        } else if (json.tahun) {
          setTahun(json.tahun);
        }
      }).catch(() => {
        setTahun(2024); // fallback
      });
    } else {
      fetchData(tahun);
    }
  }, [tahun, fetchData, needsSetup]);

  const handleSetupComplete = useCallback(() => {
    setNeedsSetup(false);
    // Reload to refresh all data
    window.location.reload();
  }, []);

  // Helper: check if a view is hidden for the current user role
  const isViewHidden = useCallback((viewId: string): boolean => {
    const userRole = user?.role || "public";
    const hiddenItems = pengaturan.sidebarConfig?.hiddenItems;
    if (!hiddenItems) return false;
    const roleHidden = hiddenItems[userRole] || [];
    return roleHidden.includes(viewId);
  }, [user?.role, pengaturan.sidebarConfig]);

  // Listen for quick navigation events from DashboardView
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ActiveView>;
      if (customEvent.detail && !isViewHidden(customEvent.detail)) {
        setActiveView(customEvent.detail);
      }
    };
    window.addEventListener('navigate-view', handler);
    return () => window.removeEventListener('navigate-view', handler);
  }, [isViewHidden]);

  // Redirect to dashboard if activeView is hidden for current role
  useEffect(() => {
    if (activeView !== "dashboard" && isViewHidden(activeView)) {
      setActiveView("dashboard");
    }
  }, [activeView, isViewHidden]);

  // Auto-refresh interval logic — robust implementation
  // Only depends on autoRefreshInterval and tahun. Does NOT depend on `loading`
  // to prevent the timer from resetting every time loading state changes.
  useEffect(() => {
    // Clear any existing refresh timer
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    if (autoRefreshInterval <= 0 || tahun === 0) {
      setNextRefreshIn(0);
      lastRefreshRef.current = 0;
      return;
    }

    const intervalMs = autoRefreshInterval * 60 * 1000; // Convert minutes to ms

    // Only initialize lastRefreshRef if it hasn't been set yet
    // (i.e., first time auto-refresh activates, or after it was reset)
    if (lastRefreshRef.current === 0) {
      lastRefreshRef.current = Date.now();
    }

    // Countdown timer — updates every second, reads from ref (no re-render dependency)
    const countdownInterval = setInterval(() => {
      const elapsed = Date.now() - lastRefreshRef.current;
      const remaining = Math.max(0, Math.ceil((intervalMs - elapsed) / 1000));
      setNextRefreshIn(remaining);
    }, 1000);

    // Auto-refresh using setTimeout (schedules next refresh after current one completes)
    // This prevents interval drift and overlapping refreshes
    const scheduleRefresh = () => {
      const elapsed = Date.now() - lastRefreshRef.current;
      const delay = Math.max(0, intervalMs - elapsed);
      autoRefreshTimerRef.current = setTimeout(async () => {
        await silentRefresh(tahun);
        // After refresh completes, update the ref and schedule the next one
        // (silentRefresh already sets lastRefreshRef.current = Date.now())
        // Only reschedule if the interval setting hasn't changed
        if (autoRefreshIntervalRef.current === autoRefreshInterval) {
          scheduleRefresh();
        }
      }, delay);
    };
    scheduleRefresh();

    return () => {
      clearInterval(countdownInterval);
      if (autoRefreshTimerRef.current) {
        clearTimeout(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    };
  }, [autoRefreshInterval, tahun, silentRefresh]);

  // Show setup wizard if needed (after all hooks)
  if (needsSetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Memeriksa konfigurasi...</p>
        </div>
      </div>
    );
  }

  if (needsSetup === true) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  const handleTahunChange = (newTahun: number) => {
    // Reset the auto-refresh countdown when user changes tahun
    lastRefreshRef.current = 0; // Will be re-initialized when fetchData completes
    setTahun(newTahun);
  };

  const handleViewChange = (view: ActiveView) => {
    setActiveView(view);
  };

  // Helper to get tahun list as numbers for backward compatibility
  const tahunListNumbers = data?.tahunList?.map(t => t.tahun) || [];
  const activeTahunFromData = data?.tahunList?.find(t => t.aktif)?.tahun || tahun;

  const renderContent = () => {
    // Admin/OPD view: show login if not authenticated, panel if authenticated
    if (activeView === "admin") {
      if (authLoading) {
        return (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        );
      }
      if (!isAuthenticated) {
        return <LoginForm />;
      }
      // Show OPD Panel for OPD role, Admin Panel for admin/superadmin/bupati
      if (user?.role === "opd") {
        return <OpdPanel tahun={tahun} tahunList={data?.tahunList || []} />;
      }
      return <AdminPanel tahun={tahun} tahunList={data?.tahunList || []} />;
    }

    // Modern loader: keep showing during fade-out animation
    if (loading || loaderExiting) {
      if (pengaturan.loaderType === "modern") {
        return <ModernSplashLoader isLoading={loading} onExitComplete={() => setLoaderExiting(false)} />;
      }
      if (loading) return <LoadingSkeleton />;
    }
    if (error) return <ErrorState error={error} onRetry={() => fetchData(tahun)} />;
    if (!data) return null;

    switch (activeView) {
      case "dashboard":
        return <DashboardView data={data} />;
      case "ringkasan-eksekutif":
        return <ExecutiveSummaryView data={data} />;
      case "analisis-risiko":
        return <AnalisisRisikoView data={data} />;
      case "copilot":
        return <FinancialCopilotView data={data} />;
      case "apbd":
        return <APBDTable data={data} />;
      case "pendapatan":
        return <PendapatanView data={data} />;
      case "belanja":
        return <BelanjaView data={data} />;
      case "pembiayaan":
        return <PembiayaanView data={data} />;
      case "realisasi-akun":
        return <RealisasiAkunView data={data} />;
      case "realisasi-skpd":
        return <RealisasiSkpdView data={data} />;
      case "opd":
        return <OpdView data={data} />;
      case "transparansi":
        return <TransparansiView data={data} />;
      default:
        return <DashboardView data={data} />;
    }
  };

  // When showing login form for admin, don't show the sidebar/header layout
  if (activeView === "admin" && !authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-[60px]">
        <DashboardHeader
          activeView={activeView}
          tahun={tahun}
          tahunList={data?.tahunList || []}
          activeTahun={activeTahunFromData}
          onTahunChange={handleTahunChange}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onNavigateDashboard={() => setActiveView("dashboard")}
          autoRefreshInterval={autoRefreshInterval}
          nextRefreshIn={nextRefreshIn}
          onManualRefresh={() => {
            if (tahun > 0) {
              setIsRefreshing(true);
              // Reset the auto-refresh countdown when user manually refreshes
              lastRefreshRef.current = Date.now();
              silentRefresh(tahun).finally(() => setIsRefreshing(false));
            }
          }}
          isRefreshing={isRefreshing}
          visitorOnline={visitorStats.online}
          visitorToday={visitorStats.today}
        />

        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6 overflow-auto">
          {/* Auto-refresh inline indicator (compact, moved to header as primary) */}
          {autoRefreshInterval > 0 && !loading && nextRefreshIn > 0 && data && (
            <div className="flex items-center justify-end mb-2 lg:hidden">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1 backdrop-blur-sm">
                <RefreshCw className="w-3 h-3 opacity-60" />
                <span>
                  Refresh dalam {nextRefreshIn >= 60 ? `${Math.floor(nextRefreshIn / 60)}m ${nextRefreshIn % 60}s` : `${nextRefreshIn}s`}
                </span>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer — hidden on mobile (replaced by MobileBottomNav) */}
        <footer className="hidden lg:block bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-t border-black/[0.06] dark:border-white/[0.06] px-4 lg:px-6 py-3 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={logoSrc}
                alt="Logo Kabupaten Seruyan"
                width={16}
                height={16}
                className="w-4 h-4 object-contain"
              />
              <span className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} {pengaturan.namaPemerintah}
              </span>
              <span className="inline-flex items-center rounded-full bg-black/[0.06] dark:bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
                v{pengaturan.versiAplikasi || "1.0.0"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              <span className="font-semibold">{visitorStats.online}</span> online
              <span className="text-muted-foreground/40">·</span>
              <span><span className="font-semibold">{visitorStats.today}</span> today</span>
              <span className="text-muted-foreground/40">·</span>
              <span><span className="font-semibold">{visitorStats.total}</span> total</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation — shown only on mobile */}
      <MobileBottomNav
        activeView={activeView}
        onViewChange={handleViewChange}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    </div>
  );
}

// ============ FLOATING ORB COMPONENT ============
function FloatingOrb({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      style={style}
    />
  );
}

// ============ DASHBOARD VIEW (MODERN ANIMATED) ============
function DashboardView({ data }: { data: DashboardData }) {
  const { pengaturan, logoSrc } = usePengaturan();
  const { user } = useAuth();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  // Helper: check if a view is hidden for the current user role
  const isViewHiddenForUser = (viewId: string): boolean => {
    const userRole = user?.role || "public";
    const hiddenItems = pengaturan.sidebarConfig?.hiddenItems;
    if (!hiddenItems) return false;
    const roleHidden = hiddenItems[userRole] || [];
    return roleHidden.includes(viewId);
  };

  // Quick navigation items — filtered by sidebar visibility and copilot config
  const copilotEnabled = pengaturan.copilotConfig?.enabled ?? true;
  const allQuickNavItems = [
    { id: "ringkasan-eksekutif" as ActiveView, label: "Ringkasan Eksekutif", icon: BarChart3, color: "emerald", gradient: "from-emerald-500 to-emerald-600", desc: "Executive Summary" },
    { id: "analisis-risiko" as ActiveView, label: "Analisis Risiko", icon: AlertTriangle, color: "rose", gradient: "from-rose-500 to-amber-500", desc: "Risk Analysis" },
    { id: "transparansi" as ActiveView, label: "Transparansi", icon: Eye, color: "blue", gradient: "from-blue-500 to-blue-600", desc: "Data Transparency" },
    { id: "admin" as ActiveView, label: "Admin", icon: Shield, color: "violet", gradient: "from-violet-500 to-purple-600", desc: "Administration" },
  ];

  const quickNavItems = allQuickNavItems.filter((item) => {
    if (isViewHiddenForUser(item.id)) return false;
    return true;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ====== HERO BANNER - Clean Modern ====== */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl modern-border bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-8 lg:p-10">
          {/* Subtle accent gradient blob - single decoration */}
          <div
            className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-[0.07] pointer-events-none"
            style={{ background: `radial-gradient(circle, ${pengaturan.warnaPrimary}, transparent 70%)` }}
          />

          {/* Content */}
          <div className="relative flex flex-col sm:flex-row items-center gap-6 flex-1 min-w-0">
            {/* Logo */}
            <div className="relative shrink-0">
              <motion.img
                src={logoSrc}
                alt="Logo Kabupaten Seruyan"
                width={80}
                height={80}
                className="w-20 h-20 relative z-10 object-contain"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              />
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <motion.p
                className="text-sm font-medium text-muted-foreground"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Dashboard Keuangan Daerah
              </motion.p>

              <motion.h2
                className="text-2xl font-bold tracking-tight modern-gradient-text mt-0.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {pengaturan.namaPemerintah}
              </motion.h2>

              <motion.div
                className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${pengaturan.warnaPrimary}15`, color: pengaturan.warnaPrimary }}>
                  TA {data.tahun}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Info className="w-3.5 h-3.5" />
                  {formatRupiahShort(data.ringkasan.totalAnggaran)}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Shield className="w-3.5 h-3.5" />
                  {pengaturan.namaInstansi}
                </span>
              </motion.div>
            </div>

            {/* Admin Button */}
            <motion.button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigate-view', { detail: 'admin' }));
              }}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600/50 text-foreground text-sm font-medium transition-all duration-200"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ====== QUICK NAVIGATION CARDS ====== */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickNavItems.map((item, index) => {
            const colorMap: Record<string, { bg: string; border: string; iconBg: string }> = {
              emerald: { bg: "bg-emerald-500/10", border: "border-l-emerald-500", iconBg: "bg-emerald-500" },
              rose: { bg: "bg-rose-500/10", border: "border-l-rose-500", iconBg: "bg-rose-500" },
              blue: { bg: "bg-blue-500/10", border: "border-l-blue-500", iconBg: "bg-blue-500" },
              violet: { bg: "bg-violet-500/10", border: "border-l-violet-500", iconBg: "bg-violet-500" },
            };
            const colors = colorMap[item.color] || colorMap.emerald;
            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate-view', { detail: item.id }));
                }}
                className={`group modern-card rounded-2xl p-4 cursor-pointer text-left border-l-4 ${colors.border}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2, scale: 1.01, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Icon in colored container */}
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center mb-2.5`}>
                  <item.icon className={`w-4 h-4 ${colors.iconBg.replace('bg-', 'text-')}`} />
                </div>

                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>

                {/* Arrow indicator */}
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-hover:text-foreground/50 group-hover:translate-x-0.5 transition-all duration-300" />
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ====== SUMMARY CARDS ====== */}
      <motion.div variants={itemVariants}>
        <SummaryCards data={data} />
      </motion.div>

      {/* ====== CHARTS ROW ====== */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PendapatanChart data={data} />
          <BelanjaChart data={data} />
        </div>
      </motion.div>

      {/* ====== TREND CHART ====== */}
      <motion.div variants={itemVariants}>
        <TrendChart data={data} />
      </motion.div>

      {/* ====== REALISASI BAR CHART ====== */}
      <motion.div variants={itemVariants}>
        <RealisasiBarChart data={data} />
      </motion.div>

      {/* ====== SKPD QUICK SUMMARY ====== */}
      <motion.div variants={itemVariants}>
        <SKPDQuickSummary data={data} />
      </motion.div>
    </motion.div>
  );
}

// ============ PENDAPATAN VIEW ============
function PendapatanView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <PendapatanChart data={data} />
      <AccountTable
        items={data.pendapatan}
        title="Detail Pendapatan Daerah"
        colorClass="bg-emerald-50/50"
        headerColor="text-emerald-800"
        tahun={data.tahun}
      />
    </div>
  );
}

// ============ BELANJA VIEW ============
function BelanjaView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <BelanjaChart data={data} />
      <AccountTable
        items={data.belanja}
        title="Detail Belanja Daerah"
        colorClass="bg-red-50/50"
        headerColor="text-red-800"
        tahun={data.tahun}
      />
    </div>
  );
}

// ============ PEMBIAYAAN VIEW ============
function PembiayaanView({ data }: { data: DashboardData }) {
  return (
    <AccountTable
      items={data.pembiayaan}
      title="Detail Pembiayaan"
      colorClass="bg-amber-50/50"
      headerColor="text-amber-800"
      tahun={data.tahun}
    />
  );
}

// ============ LOADING SKELETON (Budget Loader - Premium) ============
function LoadingSkeleton() {
  const { pengaturan } = usePengaturan();
  const [percentage, setPercentage] = useState(0);
  const loaderImageSrc = pengaturan.loaderImageBase64;
  const displayTime = pengaturan.loaderDisplayTime ?? 5000;

  // Percentage counter from 0 to 100 over the loader display time
  useEffect(() => {
    if (displayTime <= 0) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / displayTime) * 100, 100);
      setPercentage(Math.round(progress));
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [displayTime]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950 overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-emerald-400/10"
            style={{
              width: `${3 + Math.random() * 6}px`,
              height: `${3 + Math.random() * 6}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `drift ${8 + Math.random() * 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Background Glow Orbs */}
      <div
        className="absolute h-[500px] w-[500px] rounded-full bg-emerald-500/15 blur-[120px]"
        style={{ animation: "glow-pulse 4s ease-in-out infinite" }}
      />
      <div
        className="absolute h-72 w-72 rounded-full bg-teal-400/10 blur-[80px]"
        style={{ animation: "glow-pulse 5s ease-in-out infinite 1.5s" }}
      />
      <div
        className="absolute h-48 w-48 rounded-full bg-amber-400/8 blur-[60px]"
        style={{ top: "20%", right: "15%", animation: "glow-pulse 6s ease-in-out infinite 3s" }}
      />

      <div className="relative flex flex-col items-center">
        {/* Main Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-12 shadow-2xl">
          {/* Animated border gradient */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: "conic-gradient(from 0deg, transparent, rgba(16,185,129,0.3), transparent, rgba(52,211,153,0.15), transparent)",
              animation: "border-spin 4s linear infinite",
            }}
          />
          <div className="absolute inset-[1px] rounded-3xl bg-slate-950/95" />

          {/* Card content */}
          <div className="relative z-10">
            {/* Floating Money Emojis */}
            <div
              className="absolute -top-5 -left-5 text-3xl"
              style={{ animation: "float-bounce 2.5s ease-in-out infinite" }}
            >
              💵
            </div>
            <div
              className="absolute -top-2 -right-6 text-2xl"
              style={{ animation: "float-bounce 3s ease-in-out infinite 0.8s" }}
            >
              🏦
            </div>
            <div
              className="absolute -bottom-4 -right-4 text-3xl"
              style={{ animation: "float-bounce 2.8s ease-in-out infinite 1.2s" }}
            >
              💰
            </div>
            <div
              className="absolute -bottom-3 -left-5 text-2xl"
              style={{ animation: "float-bounce 3.2s ease-in-out infinite 0.4s" }}
            >
              📈
            </div>

            {/* Circular Loader with rotating ring */}
            <div className="relative flex items-center justify-center">
              {/* Outer rotating ring */}
              <svg
                className="absolute h-36 w-36"
                viewBox="0 0 160 160"
                style={{ animation: "spin-slow 8s linear infinite" }}
              >
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  stroke="rgba(16,185,129,0.15)"
                  strokeWidth="1"
                  fill="none"
                  strokeDasharray="4 8"
                />
              </svg>

              {/* Main circular loader */}
              <svg
                className="h-28 w-28 -rotate-90"
                viewBox="0 0 120 120"
                style={{ animation: "spin-reverse 3s linear infinite" }}
              >
                {/* Track */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="rgba(30,41,59,0.8)"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress arc */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="url(#loaderGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="314"
                  strokeDashoffset="80"
                  style={{ animation: "dash-offset 2s ease-in-out infinite" }}
                />
                <defs>
                  <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inner glow ring */}
              <div
                className="absolute h-20 w-20 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
                  animation: "glow-pulse 2s ease-in-out infinite",
                }}
              />

              {/* Center: Uploaded GIF/Image or default emoji */}
              {loaderImageSrc ? (
                <img
                  src={loaderImageSrc}
                  alt="Loading"
                  className="absolute h-14 w-14 object-contain rounded-full"
                  style={{ animation: "float-subtle 2s ease-in-out infinite" }}
                />
              ) : (
                <div className="absolute text-4xl" style={{ animation: "float-subtle 2s ease-in-out infinite" }}>
                  📊
                </div>
              )}
            </div>

            {/* Text */}
            <div className="mt-8 text-center">
              <h2
                className="text-xl font-bold text-white"
                style={{ animation: "text-shimmer 3s ease-in-out infinite" }}
              >
                Memuat Data Anggaran
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Menghitung realisasi dan alokasi dana...
              </p>

              {/* Percentage Counter */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-3xl font-extrabold tabular-nums bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 bg-clip-text text-transparent">
                  {percentage}%
                </span>
              </div>

              {/* Animated dots */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                    style={{
                      animation: "dot-pulse 1.4s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 h-1.5 w-80 overflow-hidden rounded-full bg-slate-800/80">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${percentage}%`,
                  background: "linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981)",
                  backgroundSize: "200% 100%",
                  animation: percentage < 100 ? "shimmer-gradient 3s linear infinite" : undefined,
                }}
              />
            </div>

            {/* Budget Stats Skeleton */}
            <div className="mt-6 space-y-2.5">
              {[
                { width: "90%", delay: "0s" },
                { width: "75%", delay: "0.15s" },
                { width: "60%", delay: "0.3s" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="h-3 rounded-full bg-white/[0.06] overflow-hidden"
                  style={{ width: item.width }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.12), transparent)",
                      animation: "shimmer-line 2s ease-in-out infinite",
                      animationDelay: item.delay,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Mini stat cards preview */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { icon: "💰", label: "Anggaran", delay: "0s" },
                { icon: "📊", label: "Realisasi", delay: "0.3s" },
                { icon: "📈", label: "Capaian", delay: "0.6s" },
              ].map((card, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 text-center"
                  style={{
                    animation: "fade-up 0.6s ease-out forwards",
                    animationDelay: card.delay,
                    opacity: 0,
                  }}
                >
                  <div className="text-lg mb-0.5">{card.icon}</div>
                  <div className="h-2 w-10 mx-auto rounded-full bg-white/10 mb-1.5" />
                  <div className="text-[10px] text-slate-500">{card.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          className="mt-6 text-center"
          style={{ animation: "fade-up 0.8s ease-out 0.5s forwards", opacity: 0 }}
        >
          <p className="text-xs text-slate-500/60 tracking-wider uppercase">
            Dashboard Keuangan Daerah
          </p>
        </div>
      </div>

      <style>{`
        @keyframes loading-slide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }

        @keyframes shimmer-gradient {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes float-bounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-12px) scale(1.05); }
        }

        @keyframes float-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        @keyframes dot-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }

        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spin-reverse {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }

        @keyframes dash-offset {
          0%, 100% { stroke-dashoffset: 80; }
          50% { stroke-dashoffset: 160; }
        }

        @keyframes border-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes shimmer-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        @keyframes text-shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(20px, -30px) scale(1.2); opacity: 0.6; }
          50% { transform: translate(-10px, -50px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(30px, -20px) scale(1.1); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ============ MODERN SPLASH LOADER WRAPPER ============
function ModernSplashLoader({ isLoading, onExitComplete }: { isLoading: boolean; onExitComplete: () => void }) {
  const { pengaturan, logoSrc } = usePengaturan();
  const MIN_LOADING_MS = pengaturan.loaderDisplayTime ?? 5000;

  // When loading completes, give the SplashLoader time to animate its exit
  // before the parent unmounts it
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        onExitComplete();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onExitComplete]);

  return (
    <SplashLoader
      logoSrc={logoSrc}
      namaPemerintah={pengaturan.namaPemerintah}
      namaInstansi={pengaturan.namaInstansi}
      warnaPrimary={pengaturan.warnaPrimary}
      warnaSecondary={pengaturan.warnaSecondary}
      warnaAccent={pengaturan.warnaAccent}
      warnaDark={pengaturan.warnaDark}
      waktuTampil={MIN_LOADING_MS}
      isLoading={isLoading}
    />
  );
}

// ============ ERROR STATE ============
function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-4 rounded-full bg-destructive/10 mb-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        Gagal Memuat Data Dashboard
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
      >
        <RefreshCw className="w-4 h-4" />
        Coba Lagi
      </button>
    </motion.div>
  );
}
