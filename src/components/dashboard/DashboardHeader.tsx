"use client";

import { TahunAnggaranItem, ActiveView } from "./types";
import { Menu, Calendar, LogOut, User, ChevronDown, Check, RefreshCw, Clock, Settings2, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePengaturan } from "@/context/PengaturanContext";
import { useAuth } from "@/hooks/use-auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";

type DashboardHeaderProps = {
  activeView: ActiveView;
  tahun: number;
  tahunList: TahunAnggaranItem[];
  activeTahun: number;
  onTahunChange: (tahun: number) => void;
  onMenuToggle: () => void;
  onNavigateDashboard: () => void;
  // Auto-refresh props
  autoRefreshInterval?: number;
  nextRefreshIn?: number;
  onManualRefresh?: () => void;
  isRefreshing?: boolean;
  // Visitor stats
  visitorOnline?: number;
  visitorToday?: number;
};

const viewLabels: Record<ActiveView, string> = {
  dashboard: "Dashboard",
  "ringkasan-eksekutif": "Ringkasan Eksekutif",
  "analisis-risiko": "Analisis Risiko",
  copilot: "AI Financial Copilot",
  apbd: "APBD",
  pendapatan: "Pendapatan",
  belanja: "Belanja",
  pembiayaan: "Pembiayaan",
  "realisasi-akun": "Realisasi Per-Akun",
  "realisasi-skpd": "Realisasi Per-SKPD",
  opd: "Organisasi Perangkat Daerah",
  transparansi: "Transparansi",
  admin: "Admin",
};

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${seconds}s`;
}

export default function DashboardHeader({
  activeView,
  tahun,
  tahunList,
  activeTahun,
  onTahunChange,
  onMenuToggle,
  onNavigateDashboard,
  autoRefreshInterval = 0,
  nextRefreshIn = 0,
  onManualRefresh,
  isRefreshing = false,
  visitorOnline = 0,
  visitorToday = 0,
}: DashboardHeaderProps) {
  const { pengaturan, logoSrc } = usePengaturan();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  // Auto-refresh is active
  const isAutoRefreshActive = autoRefreshInterval > 0;

  return (
    <header
      className="sticky top-0 z-30 text-white shadow-lg animate-gradient"
      style={{
        background: `linear-gradient(to right, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary}, ${pengaturan.warnaPrimary})`,
      }}
    >
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        {/* Left: Menu + Logo + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <img
            src={logoSrc}
            alt="Logo Kabupaten Seruyan"
            width={36}
            height={36}
            className="w-9 h-9 object-contain hidden sm:block"
          />

          <div className="flex flex-col">
            <h1 className="text-base lg:text-lg font-bold tracking-wide uppercase">
              {viewLabels[activeView]}
            </h1>
            <p className="text-[10px] lg:text-xs text-emerald-200 hidden sm:block">
              {pengaturan.namaPemerintah}
            </p>
          </div>
        </div>

        {/* Right: Visitor Count + Auto-Refresh + Year Selector + User Menu */}
        <div className="flex items-center gap-2">
          {/* ─── Visitor Count Badge ─── */}
          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <Users className="w-3.5 h-3.5 hidden sm:inline" />
            <span className="font-semibold">{visitorOnline}</span>
            <span className="hidden sm:inline text-emerald-200/70">online</span>
          </div>

          {/* ─── Auto-Refresh Indicator ─── */}
          {isAutoRefreshActive && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
                  aria-label="Auto-refresh settings"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">
                    {nextRefreshIn > 0 ? formatCountdown(nextRefreshIn) : "Refresh..."}
                  </span>
                  {/* Progress ring for mobile */}
                  <span className="sm:hidden">
                    {nextRefreshIn > 0 ? formatCountdown(nextRefreshIn) : "↻"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${pengaturan.warnaPrimary}15`, color: pengaturan.warnaPrimary }}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Auto-Refresh Aktif</p>
                      <p className="text-xs text-muted-foreground">
                        Setiap {autoRefreshInterval >= 60 ? `${autoRefreshInterval / 60} jam` : `${autoRefreshInterval} menit`}
                      </p>
                    </div>
                  </div>

                  {/* Countdown progress bar */}
                  {nextRefreshIn > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Refresh berikutnya</span>
                        <span className="font-mono font-semibold" style={{ color: pengaturan.warnaPrimary }}>
                          {formatCountdown(nextRefreshIn)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: pengaturan.warnaPrimary }}
                          initial={false}
                          animate={{
                            width: `${Math.max(0, Math.min(100, ((autoRefreshInterval * 60 - nextRefreshIn) / (autoRefreshInterval * 60)) * 100))}%`,
                          }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual Refresh Button */}
                  {onManualRefresh && (
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      style={{ backgroundColor: pengaturan.warnaPrimary }}
                      onClick={onManualRefresh}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                      {isRefreshing ? "Memperbarui..." : "Refresh Sekarang"}
                    </Button>
                  )}

                  <p className="text-[10px] text-muted-foreground text-center">
                    Data diperbarui otomatis di latar belakang
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* ─── Manual Refresh (when auto-refresh is off) ─── */}
          {!isAutoRefreshActive && onManualRefresh && activeView !== "admin" && (
            <button
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
              aria-label="Refresh data"
              title="Refresh data dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRefreshing ? "Memuat..." : "Refresh"}</span>
            </button>
          )}

          {/* ─── Year Selector ─── */}
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4" style={{ color: pengaturan.warnaAccent }} />
            <Select
              value={tahun.toString()}
              onValueChange={(val) => onTahunChange(parseInt(val))}
            >
              <SelectTrigger className="border-0 bg-transparent text-white text-sm font-semibold h-6 w-auto p-0 focus:ring-0 [&>svg]:text-[var(--gov-accent)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tahunList.map((t) => (
                  <SelectItem key={t.tahun} value={t.tahun.toString()}>
                    <span className="flex items-center gap-1.5">
                      TA {t.tahun}
                      {t.aktif && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5">
                          <Check className="w-2.5 h-2.5" />
                          Aktif
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ─── User Menu ─── */}
          {isAuthenticated && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-9 px-2 hover:bg-white/10 text-white"
                >
                  <Avatar className="w-7 h-7" style={{ backgroundColor: pengaturan.warnaAccent }}>
                    <AvatarFallback
                      className="text-xs font-bold"
                      style={{ color: pengaturan.warnaDark, backgroundColor: pengaturan.warnaAccent }}
                    >
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs mt-1">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${pengaturan.warnaPrimary}15`,
                        color: pengaturan.warnaPrimary,
                      }}
                    >
                      {user.role === "superadmin" ? "Super Admin" : user.role === "bupati" ? "Bupati/Kepala Daerah" : user.role === "opd" ? "OPD" : "Admin"}
                    </span>
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 lg:px-6 pb-2 flex items-center gap-1 text-xs text-emerald-200/70">
        <button
          onClick={onNavigateDashboard}
          className="hover:text-white transition-colors"
        >
          Dashboard
        </button>
        {activeView !== "dashboard" && (
          <>
            <span>/</span>
            <span className="font-medium" style={{ color: pengaturan.warnaAccent }}>
              {viewLabels[activeView]}
            </span>
          </>
        )}
      </div>
    </header>
  );
}
