"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Upload,
  Trash2,
  Palette,
  Building2,
  Image as ImageIcon,
  Info,
  RotateCcw,
  AlertTriangle,
  LayoutList,
  Eye,
  EyeOff,
  Activity,
  BotMessageSquare,
  Thermometer,
  MessageSquare,
  Cpu,
  Key,
  Sparkles,
  Mic,
  Volume2,
  Globe,
  ImagePlus,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Zap,
  RefreshCw,
  Database,
  Download,
  HardDrive,
  FileJson,
  CheckCircle,
} from "lucide-react";
import { usePengaturan } from "@/context/PengaturanContext";
import { Switch } from "@/components/ui/switch";
import {
  Select as SelectComponent,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SidebarVisibility, CopilotConfig, AiApiKeys } from "@/context/PengaturanContext";
import { DEFAULT_COPILOT_CONFIG, DEFAULT_AI_API_KEYS } from "@/context/PengaturanContext";

interface PengaturanData {
  id: string;
  namaAplikasi: string;
  namaPemerintah: string;
  namaInstansi: string;
  warnaPrimary: string;
  warnaSecondary: string;
  warnaAccent: string;
  warnaDark: string;
  logoBase64: string | null;
  logoUrl: string | null;
  alamatInstansi: string | null;
  teleponInstansi: string | null;
  emailInstansi: string | null;
  websiteInstansi: string | null;
  sidebarConfig: SidebarVisibility | null;
  loaderType: string;
  loaderDisplayTime: number;
  loaderImageBase64: string | null;
  autoRefreshInterval: number;
  versiAplikasi: string;
  copilotConfig: CopilotConfig | null;
}

const DEFAULT_SETTINGS: Omit<PengaturanData, "id"> = {
  namaAplikasi: "Dashboard Keuangan",
  namaPemerintah: "Pemerintah Kabupaten Seruyan",
  namaInstansi: "BKAD Kab. Seruyan",
  warnaPrimary: "#1B5E20",
  warnaSecondary: "#2E7D32",
  warnaAccent: "#F9A825",
  warnaDark: "#0D3B12",
  logoBase64: null,
  logoUrl: null,
  alamatInstansi: "",
  teleponInstansi: "",
  emailInstansi: "",
  websiteInstansi: "",
  sidebarConfig: {
    hiddenItems: {
      public: ["ringkasan-eksekutif", "copilot"],
    },
  },
  loaderType: "classic",
  loaderDisplayTime: 5000,
  loaderImageBase64: null,
  autoRefreshInterval: 0,
  versiAplikasi: "1.0.0",
  copilotConfig: null,
};

// Available sidebar items for visibility configuration
const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", group: "Utama" },
  { id: "ringkasan-eksekutif", label: "Ringkasan Eksekutif", group: "Utama" },
  { id: "perbandingan-antartahun", label: "Perbandingan Tahun", group: "Utama" },
  { id: "forecasting", label: "Forecasting & Proyeksi", group: "Utama" },
  { id: "peta-infrastruktur", label: "Peta Infrastruktur", group: "Utama" },
  { id: "analisis-risiko", label: "Analisis Risiko", group: "Utama" },
  { id: "copilot", label: "AI Copilot", group: "Utama" },
  { id: "apbd", label: "APBD", group: "Anggaran" },
  { id: "pendapatan", label: "Pendapatan", group: "Anggaran" },
  { id: "belanja", label: "Belanja", group: "Anggaran" },
  { id: "pembiayaan", label: "Pembiayaan", group: "Anggaran" },
  { id: "realisasi-akun", label: "Realisasi Per-Akun", group: "Realisasi" },
  { id: "realisasi-skpd", label: "Realisasi Per-SKPD", group: "Realisasi" },
  { id: "opd", label: "OPD", group: "Lainnya" },
  { id: "transparansi", label: "Transparansi", group: "Lainnya" },
  { id: "admin", label: "Admin", group: "Lainnya" },
] as const;

// Roles that can have sidebar visibility configured
const ROLES = [
  { id: "public", label: "Publik", description: "Pengguna yang belum login (akses publik)" },
  { id: "admin", label: "Admin", description: "Administrator sistem" },
  { id: "superadmin", label: "Super Admin", description: "Super administrator" },
  { id: "opd", label: "OPD", description: "Organisasi Perangkat Daerah" },
  { id: "bupati", label: "Bupati/Kepala Daerah", description: "Pimpinan daerah" },
] as const;

interface ColorFieldConfig {
  key: keyof PengaturanData;
  label: string;
  description: string;
}

const COLOR_FIELDS: ColorFieldConfig[] = [
  { key: "warnaPrimary", label: "Warna Primer", description: "Sidebar & header utama" },
  { key: "warnaSecondary", label: "Warna Sekunder", description: "Gradient sekunder" },
  { key: "warnaAccent", label: "Warna Aksen", description: "Aksen emas (gold)" },
  { key: "warnaDark", label: "Warna Gelap", description: "Bayangan tergelap" },
];

function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function normalizeHex(value: string): string {
  let hex = value.trim();
  if (!hex.startsWith("#")) {
    hex = "#" + hex;
  }
  return hex;
}

export default function SettingsManager() {
  const { toast } = useToast();
  const { pengaturan: currentPengaturan, logoSrc, refetch: refetchPengaturan } = usePengaturan();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loaderImageInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<PengaturanData, "id">>(DEFAULT_SETTINGS);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoSizeWarning, setLogoSizeWarning] = useState(false);
  const [loaderImagePreview, setLoaderImagePreview] = useState<string | null>(null);
  const [loaderImageSizeWarning, setLoaderImageSizeWarning] = useState(false);
  const [resettingSetup, setResettingSetup] = useState(false);
  const [activeSidebarRole, setActiveSidebarRole] = useState<string>("admin");

  // Backup & Restore state
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    version: string;
    timestamp: string;
    counts: Record<string, number>;
    tables: string[];
  } | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { status: 'success' | 'error' | 'loading'; message: string; latency?: number }> | null>(null);
  const [testingAll, setTestingAll] = useState(false);

  // ─── Build test payload with current form values ────────────────────
  const buildTestPayload = () => {
    const copilotCfg = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
    return {
      provider: copilotCfg.provider,
      apiKey: copilotCfg.apiKeys?.apiKey || '',
      baseUrl: copilotCfg.apiKeys?.baseUrl || '',
    };
  };

  // ─── Test Connection ─────────────────────────────────────────────────
  const handleTestConnection = async (service: string) => {
    setTestResults((prev) => ({ ...prev, [service]: { status: 'loading', message: 'Menguji koneksi...' } }));
    try {
      const res = await fetch('/api/admin/test-ai-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: [service], ...buildTestPayload() }),
      });
      const json = await res.json();
      if (json.results && json.results[0]) {
        const result = json.results[0];
        setTestResults((prev) => ({
          ...prev,
          [service]: {
            status: result.status === 'skipped' ? 'error' : result.status,
            message: result.message,
            latency: result.latency,
          },
        }));
      } else {
        setTestResults((prev) => ({ ...prev, [service]: { status: 'error', message: json.error || 'Gagal menguji koneksi' } }));
      }
    } catch (error) {
      setTestResults((prev) => ({ ...prev, [service]: { status: 'error', message: 'Gagal terhubung ke server' } }));
    }
  };

  const handleTestAllConnections = async () => {
    setTestingAll(true);
    setTestResults(null);

    const isZai = form.copilotConfig?.provider === 'z-ai';
    const services = isZai
      ? ['llm', 'vlm', 'tts', 'asr', 'imageGen', 'webSearch']
      : ['connection'];

    // Set all to loading
    const loadingResults: Record<string, { status: 'loading'; message: string }> = {};
    for (const s of services) {
      loadingResults[s] = { status: 'loading', message: 'Menguji koneksi...' };
    }
    setTestResults(loadingResults);

    try {
      const res = await fetch('/api/admin/test-ai-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services, ...buildTestPayload() }),
      });
      const json = await res.json();
      if (json.results) {
        const newResults: Record<string, { status: 'success' | 'error'; message: string; latency?: number }> = {};
        for (const result of json.results) {
          newResults[result.service] = {
            status: result.status === 'skipped' ? 'error' : result.status,
            message: result.message,
            latency: result.latency,
          };
        }
        setTestResults(newResults);
        // Show summary toast
        const successCount = json.results.filter((r: { status: string }) => r.status === 'success').length;
        toast({
          title: successCount === services.length ? 'Semua Koneksi Berhasil' : `${successCount}/${services.length} Koneksi Berhasil`,
          description: successCount === services.length
            ? isZai
              ? 'Semua layanan AI terhubung dengan baik'
              : 'Koneksi ke provider AI berhasil'
            : isZai
              ? 'Beberapa layanan AI gagal terhubung. Periksa hasil tes untuk detail.'
              : 'Koneksi ke provider AI gagal. Periksa API Key dan Base URL Anda.',
          variant: successCount === services.length ? 'default' : 'destructive',
        });
      }
    } catch (error) {
      setTestResults(null);
      toast({
        title: 'Error',
        description: 'Gagal menguji koneksi AI',
        variant: 'destructive',
      });
    } finally {
      setTestingAll(false);
    }
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pengaturan");
      if (!res.ok) throw new Error("Gagal mengambil pengaturan");
      const json = await res.json();
      const data: PengaturanData = json.data;
      // Parse sidebarConfig from JSON string
      let parsedSidebarConfig: SidebarVisibility | null = null;
      if (data.sidebarConfig && typeof data.sidebarConfig === "string") {
        try {
          parsedSidebarConfig = JSON.parse(data.sidebarConfig as unknown as string);
        } catch {
          parsedSidebarConfig = null;
        }
      } else if (data.sidebarConfig && typeof data.sidebarConfig === "object") {
        parsedSidebarConfig = data.sidebarConfig;
      }
      // If no sidebarConfig from DB, use default (hides ringkasan-eksekutif & copilot for public)
      if (!parsedSidebarConfig) {
        parsedSidebarConfig = DEFAULT_SETTINGS.sidebarConfig;
      }
      setForm({
        namaAplikasi: data.namaAplikasi || DEFAULT_SETTINGS.namaAplikasi,
        namaPemerintah: data.namaPemerintah || DEFAULT_SETTINGS.namaPemerintah,
        namaInstansi: data.namaInstansi || DEFAULT_SETTINGS.namaInstansi,
        warnaPrimary: data.warnaPrimary || DEFAULT_SETTINGS.warnaPrimary,
        warnaSecondary: data.warnaSecondary || DEFAULT_SETTINGS.warnaSecondary,
        warnaAccent: data.warnaAccent || DEFAULT_SETTINGS.warnaAccent,
        warnaDark: data.warnaDark || DEFAULT_SETTINGS.warnaDark,
        logoBase64: data.logoBase64 ?? null,
        logoUrl: data.logoUrl ?? null,
        alamatInstansi: data.alamatInstansi ?? "",
        teleponInstansi: data.teleponInstansi ?? "",
        emailInstansi: data.emailInstansi ?? "",
        websiteInstansi: data.websiteInstansi ?? "",
        sidebarConfig: parsedSidebarConfig,
        loaderType: data.loaderType || "classic",
        loaderDisplayTime: data.loaderDisplayTime ?? 5000,
        loaderImageBase64: data.loaderImageBase64 ?? null,
        autoRefreshInterval: data.autoRefreshInterval ?? 0,
        versiAplikasi: data.versiAplikasi || "1.0.0",
        copilotConfig: data.copilotConfig
          ? (typeof data.copilotConfig === "string"
            ? (() => {
              const parsed = JSON.parse(data.copilotConfig as unknown as string);
              // Migration: convert old per-service keys to single apiKey
              let migratedApiKeys = { ...DEFAULT_AI_API_KEYS, ...(parsed.apiKeys || {}) };
              if (!migratedApiKeys.apiKey && parsed.apiKeys) {
                const oldKeys = parsed.apiKeys as Record<string, string>;
                const firstKey = oldKeys.llm || oldKeys.vlm || oldKeys.tts || oldKeys.asr || oldKeys.imageGen || oldKeys.webSearch || '';
                if (firstKey) migratedApiKeys.apiKey = firstKey;
              }
              return { ...DEFAULT_COPILOT_CONFIG, ...parsed, apiKeys: migratedApiKeys };
            })()
            : typeof data.copilotConfig === "object"
              ? (() => {
                const rawConfig = data.copilotConfig as CopilotConfig;
                let migratedApiKeys = { ...DEFAULT_AI_API_KEYS, ...(rawConfig.apiKeys || {}) };
                if (!migratedApiKeys.apiKey && rawConfig.apiKeys) {
                  const oldKeys = rawConfig.apiKeys as unknown as Record<string, string>;
                  const firstKey = oldKeys.llm || oldKeys.vlm || oldKeys.tts || oldKeys.asr || oldKeys.imageGen || oldKeys.webSearch || '';
                  if (firstKey) migratedApiKeys.apiKey = firstKey;
                }
                return { ...DEFAULT_COPILOT_CONFIG, ...rawConfig, apiKeys: migratedApiKeys };
              })()
              : null)
          : null,
      });
      // Set logo preview
      if (data.logoBase64) {
        setLogoPreview(data.logoBase64);
      } else {
        setLogoPreview(null);
      }
      // Set loader image preview
      if (data.loaderImageBase64) {
        setLoaderImagePreview(data.loaderImageBase64);
      } else {
        setLoaderImagePreview(null);
      }
    } catch {
      toast({
        title: "Error",
        description: "Gagal mengambil data pengaturan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleFieldChange = (field: string, value: string | null) => {
    setForm((prev) => {
      if (field === "loaderDisplayTime" || field === "autoRefreshInterval") {
        return { ...prev, [field]: Number(value) || 0 };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleColorHexChange = (field: keyof PengaturanData, value: string) => {
    const normalized = normalizeHex(value);
    handleFieldChange(field, normalized);
  };

  const handleColorPickerChange = (field: keyof PengaturanData, value: string) => {
    handleFieldChange(field, value);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (> 500KB warning)
    if (file.size > 500 * 1024) {
      setLogoSizeWarning(true);
    } else {
      setLogoSizeWarning(false);
    }

    // Check if file is too large (> 1MB reject)
    if (file.size > 1024 * 1024) {
      toast({
        title: "File Terlalu Besar",
        description: "Ukuran logo maksimal 1MB. Pilih file yang lebih kecil.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      handleFieldChange("logoBase64", base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    handleFieldChange("logoBase64", null);
    handleFieldChange("logoUrl", null);
    setLogoSizeWarning(false);
  };

  // Loader image upload handlers
  const handleLoaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (> 500KB warning)
    if (file.size > 500 * 1024) {
      setLoaderImageSizeWarning(true);
    } else {
      setLoaderImageSizeWarning(false);
    }

    // Check if file is too large (> 2MB reject — GIFs can be bigger)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Terlalu Besar",
        description: "Ukuran gambar loader maksimal 2MB. Pilih file yang lebih kecil.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLoaderImagePreview(base64);
      handleFieldChange("loaderImageBase64", base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveLoaderImage = () => {
    setLoaderImagePreview(null);
    handleFieldChange("loaderImageBase64", null);
    setLoaderImageSizeWarning(false);
  };

  // Sidebar visibility toggle handler
  const handleSidebarToggle = (itemId: string, roleId: string, visible: boolean) => {
    const currentConfig = form.sidebarConfig || { hiddenItems: {} };
    const hiddenItems = { ...currentConfig.hiddenItems };
    const currentHidden = hiddenItems[roleId] || [];

    if (visible) {
      // Remove from hidden list
      hiddenItems[roleId] = currentHidden.filter((id) => id !== itemId);
    } else {
      // Add to hidden list
      hiddenItems[roleId] = [...currentHidden, itemId];
    }

    // Clean up empty arrays
    if (hiddenItems[roleId]?.length === 0) {
      delete hiddenItems[roleId];
    }

    const newConfig: SidebarVisibility = { hiddenItems };
    setForm((prev) => ({ ...prev, sidebarConfig: newConfig }));
  };

  // Check if a sidebar item is visible for a role
  const isSidebarItemVisible = (itemId: string, roleId: string): boolean => {
    const hiddenItems = form.sidebarConfig?.hiddenItems || {};
    const roleHidden = hiddenItems[roleId] || [];
    return !roleHidden.includes(itemId);
  };

  // Select all / Deselect all for a role
  const handleSelectAllForRole = (roleId: string, visible: boolean) => {
    const currentConfig = form.sidebarConfig || { hiddenItems: {} };
    const hiddenItems = { ...currentConfig.hiddenItems };

    if (visible) {
      // Show all: remove all items from hidden
      hiddenItems[roleId] = [];
    } else {
      // Hide all: add all items to hidden
      hiddenItems[roleId] = SIDEBAR_ITEMS.map((item) => item.id);
    }

    // Clean up empty arrays
    if (hiddenItems[roleId]?.length === 0) {
      delete hiddenItems[roleId];
    }

    const newConfig: SidebarVisibility = { hiddenItems };
    setForm((prev) => ({ ...prev, sidebarConfig: newConfig }));
  };

  const handleSave = async () => {
    // Validate colors
    for (const cf of COLOR_FIELDS) {
      const value = form[cf.key] as string;
      if (!isValidHexColor(value)) {
        toast({
          title: "Format Warna Tidak Valid",
          description: `${cf.label} harus dalam format #RRGGBB`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form };
      // sidebarConfig is sent as object, the API will stringify it
      const res = await fetch("/api/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal menyimpan pengaturan");
      }

      toast({
        title: "Berhasil",
        description: "Pengaturan berhasil disimpan",
      });

      // Refresh the global theme context
      refetchPengaturan();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menyimpan pengaturan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: currentPengaturan.warnaPrimary }} />
        <span className="ml-3 text-muted-foreground">Memuat pengaturan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Identitas Aplikasi */}
      <Card className="border-l-4" style={{ borderLeftColor: currentPengaturan.warnaPrimary }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5" style={{ color: currentPengaturan.warnaPrimary }} />
            Identitas Aplikasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="namaAplikasi">Nama Aplikasi</Label>
              <Input
                id="namaAplikasi"
                value={form.namaAplikasi}
                onChange={(e) => handleFieldChange("namaAplikasi", e.target.value)}
                placeholder="Dashboard Keuangan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="namaPemerintah">Nama Pemerintah</Label>
              <Input
                id="namaPemerintah"
                value={form.namaPemerintah}
                onChange={(e) => handleFieldChange("namaPemerintah", e.target.value)}
                placeholder="Pemerintah Kabupaten Seruyan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="namaInstansi">Nama Instansi</Label>
              <Input
                id="namaInstansi"
                value={form.namaInstansi}
                onChange={(e) => handleFieldChange("namaInstansi", e.target.value)}
                placeholder="BKAD Kab. Seruyan"
              />
              <p className="text-xs text-muted-foreground">Nama instansi/OPD pengelola yang ditampilkan di sidebar, halaman login, dan homepage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Tema & Warna */}
      <Card className="border-l-4" style={{ borderLeftColor: currentPengaturan.warnaSecondary }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-5 h-5" style={{ color: currentPengaturan.warnaSecondary }} />
            Tema & Warna
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COLOR_FIELDS.map((cf) => {
              const colorValue = form[cf.key] as string;
              const isValid = isValidHexColor(colorValue);
              return (
                <div key={cf.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{cf.label}</Label>
                    <span className="text-xs text-muted-foreground">{cf.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Color swatch that triggers the hidden color picker */}
                    <button
                      type="button"
                      className="w-10 h-10 rounded-lg border-2 border-border shadow-sm transition-transform hover:scale-110 shrink-0"
                      style={{
                        backgroundColor: isValid ? colorValue : "#cccccc",
                      }}
                      onClick={() => {
                        const picker = document.getElementById(`picker-${cf.key}`);
                        picker?.click();
                      }}
                      title="Pilih warna"
                      aria-label={`Pilih ${cf.label}`}
                    />
                    {/* Hidden native color picker */}
                    <input
                      id={`picker-${cf.key}`}
                      type="color"
                      value={isValid ? colorValue : "#000000"}
                      onChange={(e) => handleColorPickerChange(cf.key, e.target.value)}
                      className="w-0 h-0 opacity-0 absolute"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    {/* Hex input */}
                    <Input
                      value={colorValue}
                      onChange={(e) => handleColorHexChange(cf.key, e.target.value)}
                      placeholder="#000000"
                      className={`font-mono text-sm ${!isValid ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                      maxLength={7}
                      aria-label={`${cf.label} kode hex`}
                    />
                  </div>
                  {!isValid && (
                    <p className="text-xs text-red-500">Format tidak valid, gunakan #RRGGBB</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Theme Preview */}
          <div className="mt-6 p-4 rounded-xl border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Pratinjau Tema
            </p>
            <div className="flex gap-3 items-stretch">
              {/* Mini Sidebar Mockup */}
              <div
                className="w-20 rounded-lg overflow-hidden flex flex-col shrink-0"
                style={{ backgroundColor: form.warnaDark }}
              >
                <div
                  className="px-2 py-2 flex items-center gap-1.5"
                  style={{ backgroundColor: form.warnaPrimary }}
                >
                  <div className="w-4 h-4 rounded-full bg-white/30" />
                  <div className="h-2 w-8 rounded bg-white/50" />
                </div>
                <div className="flex-1 py-2 px-1.5 space-y-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-1.5 py-1 rounded"
                      style={{
                        backgroundColor: i === 1 ? "rgba(255,255,255,0.15)" : "transparent",
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{
                          backgroundColor: i === 1 ? form.warnaAccent : "rgba(255,255,255,0.4)",
                        }}
                      />
                      <div
                        className="h-1.5 rounded"
                        style={{
                          width: i === 1 ? "28px" : "22px",
                          backgroundColor: i === 1 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini Content Area Mockup */}
              <div className="flex-1 rounded-lg overflow-hidden border bg-white">
                {/* Header bar */}
                <div
                  className="px-3 py-2 flex items-center justify-between"
                  style={{ backgroundColor: form.warnaPrimary }}
                >
                  <div className="h-2 w-16 rounded bg-white/50" />
                  <div
                    className="h-2 w-8 rounded"
                    style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
                  />
                </div>
                {/* Content area */}
                <div className="p-2 space-y-2">
                  <div className="flex gap-1.5">
                    {[
                      form.warnaPrimary,
                      form.warnaSecondary,
                      form.warnaAccent,
                    ].map((color, i) => (
                      <div
                        key={i}
                        className="flex-1 h-8 rounded"
                        style={{ backgroundColor: color, opacity: 0.15 + i * 0.1 }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <div
                      className="h-6 flex-1 rounded"
                      style={{ backgroundColor: form.warnaSecondary, opacity: 0.1 }}
                    />
                    <div
                      className="h-6 w-1/3 rounded"
                      style={{ backgroundColor: form.warnaAccent, opacity: 0.2 }}
                    />
                  </div>
                  {/* Accent bar */}
                  <div
                    className="h-1.5 w-full rounded"
                    style={{ backgroundColor: form.warnaAccent, opacity: 0.6 }}
                  />
                </div>
              </div>
            </div>

            {/* Color swatches summary */}
            <div className="flex items-center gap-2 mt-3">
              {COLOR_FIELDS.map((cf) => (
                <div key={cf.key} className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded border border-border"
                    style={{ backgroundColor: form[cf.key] as string }}
                  />
                  <span className="text-xs text-muted-foreground">{cf.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Logo Aplikasi */}
      <Card className="border-l-4" style={{ borderLeftColor: currentPengaturan.warnaAccent }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="w-5 h-5" style={{ color: currentPengaturan.warnaAccent }} />
            Logo Aplikasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Logo Preview */}
            <div className="flex items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 shrink-0 overflow-hidden">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <img
                  src={logoSrc}
                  alt="Logo Default"
                  className="max-w-full max-h-full object-contain p-2"
                />
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <Label>Upload Logo Baru</Label>
                <p className="text-xs text-muted-foreground">
                  Format: PNG, JPG, SVG, atau GIF. Maksimal 1MB. Animasi GIF didukung.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/gif"
                  onChange={handleLogoUpload}
                  className="hidden"
                  aria-label="Upload logo"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    Pilih File
                  </Button>
                  {(logoPreview || form.logoBase64) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus Logo
                    </Button>
                  )}
                </div>
              </div>
              {logoSizeWarning && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                  <span className="text-sm">
                    ⚠️ Ukuran file melebihi 500KB. Ini dapat memperlambat pemuatan halaman.
                  </span>
                </div>
              )}
              {logoPreview && (
                <p className="text-xs text-muted-foreground">
                  ✅ Logo baru akan diterapkan setelah disimpan
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Informasi Instansi */}
      <Card className="border-l-4" style={{ borderLeftColor: currentPengaturan.warnaDark }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5" style={{ color: currentPengaturan.warnaDark }} />
            Informasi Instansi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alamatInstansi">Alamat Instansi</Label>
            <Input
              id="alamatInstansi"
              value={form.alamatInstansi || ""}
              onChange={(e) => handleFieldChange("alamatInstansi", e.target.value)}
              placeholder="Jl. ..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teleponInstansi">Telepon</Label>
              <Input
                id="teleponInstansi"
                value={form.teleponInstansi || ""}
                onChange={(e) => handleFieldChange("teleponInstansi", e.target.value)}
                placeholder="+62 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailInstansi">Email</Label>
              <Input
                id="emailInstansi"
                type="email"
                value={form.emailInstansi || ""}
                onChange={(e) => handleFieldChange("emailInstansi", e.target.value)}
                placeholder="email@seruyankab.go.id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteInstansi">Website</Label>
              <Input
                id="websiteInstansi"
                value={form.websiteInstansi || ""}
                onChange={(e) => handleFieldChange("websiteInstansi", e.target.value)}
                placeholder="https://seruyankab.go.id"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Tampilan Sidebar */}
      <Card className="border-l-4" style={{ borderLeftColor: currentPengaturan.warnaAccent }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutList className="w-5 h-5" style={{ color: currentPengaturan.warnaAccent }} />
            Tampilan Sidebar per Role
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Atur menu sidebar mana yang tampil untuk setiap role. Item yang tidak dicentang akan disembunyikan dari sidebar untuk role tersebut.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role tabs */}
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => {
              const hiddenCount = (form.sidebarConfig?.hiddenItems?.[role.id] || []).length;
              const allVisible = hiddenCount === 0;
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveSidebarRole(role.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    activeSidebarRole === role.id
                      ? "border-current shadow-sm"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                  style={
                    activeSidebarRole === role.id
                      ? { backgroundColor: `${currentPengaturan.warnaPrimary}10`, color: currentPengaturan.warnaPrimary, borderColor: `${currentPengaturan.warnaPrimary}40` }
                      : undefined
                  }
                >
                  {role.label}
                  {!allVisible && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 font-semibold">
                      {SIDEBAR_ITEMS.length - hiddenCount}/{SIDEBAR_ITEMS.length}
                    </span>
                  )}
                  {allVisible && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-semibold">
                      Semua
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active role description */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              {ROLES.find((r) => r.id === activeSidebarRole)?.description} — 
              Item yang tidak dicentang akan tersembunyi untuk role <strong>{ROLES.find((r) => r.id === activeSidebarRole)?.label}</strong>
            </span>
          </div>

          {/* Select all / Deselect all */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAllForRole(activeSidebarRole, true)}
              className="gap-1.5 text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Tampilkan Semua
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAllForRole(activeSidebarRole, false)}
              className="gap-1.5 text-xs"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Sembunyikan Semua
            </Button>
          </div>

          {/* Sidebar items grid */}
          <div className="space-y-3">
            {(() => {
              const groups = [...new Set(SIDEBAR_ITEMS.map((item) => item.group))];
              return groups.map((group) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {group}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {SIDEBAR_ITEMS.filter((item) => item.group === group).map((item) => {
                      const visible = isSidebarItemVisible(item.id, activeSidebarRole);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                            visible
                              ? "border-emerald-200 bg-emerald-50/50"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          <Switch
                            checked={visible}
                            onCheckedChange={(checked) =>
                              handleSidebarToggle(item.id, activeSidebarRole, checked)
                            }
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${visible ? "text-foreground" : "text-muted-foreground line-through"}`}>
                              {item.label}
                            </p>
                          </div>
                          {visible ? (
                            <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Loader Display Time */}
      <Card className="border-l-4" style={{ borderLeftColor: currentPengaturan.warnaPrimary }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5" style={{ color: currentPengaturan.warnaPrimary }} />
            Pengaturan Loader
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih gaya loader dan atur berapa lama animasi loader ditampilkan saat memuat data dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Loader Type Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Gaya Loader</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Classic Loader Option */}
              <button
                type="button"
                onClick={() => handleFieldChange("loaderType", "classic")}
                className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all text-left ${
                  form.loaderType === "classic"
                    ? "border-current shadow-md"
                    : "border-border hover:border-foreground/30"
                }`}
                style={
                  form.loaderType === "classic"
                    ? { backgroundColor: `${currentPengaturan.warnaPrimary}08`, borderColor: `${currentPengaturan.warnaPrimary}60`, color: currentPengaturan.warnaPrimary }
                    : undefined
                }
              >
                {/* Selected indicator */}
                {form.loaderType === "classic" && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: currentPengaturan.warnaPrimary }}
                  >
                    ✓
                  </div>
                )}
                {/* Mini preview of classic loader */}
                <div className="w-16 h-16 rounded-xl bg-slate-950 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute h-10 w-10 border-2 border-emerald-500/30 rounded-full" style={{ animation: "spin 3s linear infinite" }} />
                  <span className="text-xl relative z-10">📊</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">Loader Klasik</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Tampilan lama dengan lingkaran progress</p>
                </div>
              </button>

              {/* Modern Loader Option */}
              <button
                type="button"
                onClick={() => handleFieldChange("loaderType", "modern")}
                className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all text-left ${
                  form.loaderType === "modern"
                    ? "border-current shadow-md"
                    : "border-border hover:border-foreground/30"
                }`}
                style={
                  form.loaderType === "modern"
                    ? { backgroundColor: `${currentPengaturan.warnaPrimary}08`, borderColor: `${currentPengaturan.warnaPrimary}60`, color: currentPengaturan.warnaPrimary }
                    : undefined
                }
              >
                {/* Selected indicator */}
                {form.loaderType === "modern" && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: currentPengaturan.warnaPrimary }}
                  >
                    ✓
                  </div>
                )}
                {/* Mini preview of modern loader */}
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${currentPengaturan.warnaDark}, ${currentPengaturan.warnaPrimary})` }}
                >
                  <div className="absolute h-12 w-12 border border-dashed rounded-full" style={{ borderColor: `${currentPengaturan.warnaAccent}40`, animation: "spin 4s linear infinite" }} />
                  <img
                    src={logoSrc}
                    alt=""
                    width={24}
                    height={24}
                    className="relative z-10 object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">Loader Modern</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Tampilan baru dengan orbit animasi & logo</p>
                </div>
              </button>
            </div>

            {/* Description based on selected type */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40">
              <Activity className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                {form.loaderType === "modern" ? (
                  <>
                    <p className="font-medium text-foreground/80">Loader Modern (SplashLoader)</p>
                    <p>Menampilkan logo instansi dengan animasi orbit, progress bar, dan nama pemerintah. Cocok untuk tampilan profesional dan formal.</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground/80">Loader Klasik (BudgetLoader)</p>
                    <p>Menampilkan lingkaran progress dengan persentase dan ikon/gambar di tengah. Mendukung upload GIF animasi.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-4" />
          <div className="flex items-center gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Durasi Tampil Loader</Label>
                <span className="text-2xl font-bold tabular-nums" style={{ color: currentPengaturan.warnaPrimary }}>
                  {(form.loaderDisplayTime / 1000).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10000}
                step={500}
                value={form.loaderDisplayTime}
                onChange={(e) => handleFieldChange("loaderDisplayTime", e.target.value)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-600"
                style={{
                  background: `linear-gradient(to right, ${currentPengaturan.warnaPrimary} 0%, ${currentPengaturan.warnaPrimary} ${(form.loaderDisplayTime / 10000) * 100}%, #e2e8f0 ${(form.loaderDisplayTime / 10000) * 100}%, #e2e8f0 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0s (Nonaktif)</span>
                <span>5s</span>
                <span>10s</span>
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {[
              { ms: 0, label: "Nonaktif" },
              { ms: 1500, label: "1.5 detik" },
              { ms: 3000, label: "3 detik" },
              { ms: 5000, label: "5 detik" },
              { ms: 8000, label: "8 detik" },
              { ms: 10000, label: "10 detik" },
            ].map((preset) => (
              <button
                key={preset.ms}
                onClick={() => handleFieldChange("loaderDisplayTime", String(preset.ms))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.loaderDisplayTime === preset.ms
                    ? "border-current shadow-sm"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
                style={
                  form.loaderDisplayTime === preset.ms
                    ? { backgroundColor: `${currentPengaturan.warnaPrimary}10`, color: currentPengaturan.warnaPrimary, borderColor: `${currentPengaturan.warnaPrimary}40` }
                    : undefined
                }
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Preview hint */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40">
            <Activity className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                {form.loaderDisplayTime === 0
                  ? "Loader tidak akan ditampilkan, data langsung dimuat tanpa animasi."
                  : `Loader akan ditampilkan selama minimal ${(form.loaderDisplayTime / 1000).toFixed(1)} detik saat halaman dimuat atau tahun anggaran diubah.`
                }
              </p>
              <p className="text-muted-foreground/60">
                Tip: Durasi 3-5 detik memberikan pengalaman visual yang baik tanpa membuat pengguna menunggu terlalu lama.
              </p>
            </div>
          </div>

          {/* Loader Image (GIF) Upload — only for classic loader */}
          {form.loaderType === "classic" && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <ImagePlus className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Gambar Loader (Tengah Lingkaran)</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Upload gambar atau GIF animasi yang akan ditampilkan di tengah lingkaran loader. Jika tidak diupload, ikon default (📊) akan digunakan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Loader Image Preview */}
              <div className="flex items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/30 shrink-0 overflow-hidden">
                {loaderImagePreview ? (
                  <img
                    src={loaderImagePreview}
                    alt="Loader Image Preview"
                    className="max-w-full max-h-full object-contain p-1"
                  />
                ) : (
                  <div className="text-center">
                    <span className="text-3xl">📊</span>
                    <p className="text-[9px] text-muted-foreground mt-1">Default</p>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Format: PNG, JPG, GIF (animasi didukung). Maksimal 2MB.
                  </p>
                  <input
                    ref={loaderImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleLoaderImageUpload}
                    className="hidden"
                    aria-label="Upload gambar loader"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loaderImageInputRef.current?.click()}
                      className="gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      Pilih Gambar/GIF
                    </Button>
                    {(loaderImagePreview || form.loaderImageBase64) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLoaderImage}
                        className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hapus
                      </Button>
                    )}
                  </div>
                </div>
                {loaderImageSizeWarning && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                    <span className="text-sm">
                      ⚠️ Ukuran file melebihi 500KB. Ini dapat memperlambat pemuatan halaman.
                    </span>
                  </div>
                )}
                {loaderImagePreview && (
                  <p className="text-xs text-muted-foreground">
                    ✅ Gambar baru akan diterapkan setelah disimpan
                  </p>
                )}
              </div>
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6.5: Auto-Refresh Interval */}
      <Card className="border-l-4" style={{ borderLeftColor: currentPengaturan.warnaSecondary }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="w-5 h-5" style={{ color: currentPengaturan.warnaSecondary }} />
            Auto-Refresh Dashboard
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Atur interval refresh otomatis data dashboard agar selalu mendapat data terbaru tanpa perlu refresh manual.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="autoRefreshInterval">Interval Auto-Refresh</Label>
              <SelectComponent
                value={String(form.autoRefreshInterval)}
                onValueChange={(val) => handleFieldChange("autoRefreshInterval", val)}
              >
                <SelectTrigger className="w-full" id="autoRefreshInterval">
                  <SelectValue placeholder="Pilih interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nonaktif</SelectItem>
                  <SelectItem value="5">5 menit</SelectItem>
                  <SelectItem value="10">10 menit</SelectItem>
                  <SelectItem value="15">15 menit</SelectItem>
                  <SelectItem value="30">30 menit (Direkomendasikan)</SelectItem>
                  <SelectItem value="60">1 jam</SelectItem>
                  <SelectItem value="120">2 jam</SelectItem>
                </SelectContent>
              </SelectComponent>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                form.autoRefreshInterval > 0
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-700"
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}>
                {form.autoRefreshInterval > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Aktif — refresh setiap {form.autoRefreshInterval >= 60 ? `${form.autoRefreshInterval / 60} jam` : `${form.autoRefreshInterval} menit`}</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>Auto-refresh nonaktif</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Visual preview of refresh cycle */}
          {form.autoRefreshInterval > 0 && (
            <div className="p-3 rounded-xl bg-muted/30 border space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pratinjau Siklus Refresh</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-1">
                  {/* Animated dots representing the refresh cycle */}
                  {Array.from({ length: Math.min(form.autoRefreshInterval / 5, 12) }).map((_, i) => (
                    <div
                      key={i}
                      className="h-2 flex-1 rounded-full"
                      style={{
                        backgroundColor: i === 0 ? currentPengaturan.warnaPrimary : `${currentPengaturan.warnaPrimary}30`,
                        opacity: i === 0 ? 1 : 0.4 + (i * 0.05),
                      }}
                    />
                  ))}
                </div>
                <RefreshCw className="w-4 h-4 shrink-0" style={{ color: currentPengaturan.warnaPrimary }} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Setiap {form.autoRefreshInterval >= 60 ? `${form.autoRefreshInterval / 60} jam` : `${form.autoRefreshInterval} menit`}, 
                data dashboard akan diperbarui secara diam-diam di latar belakang.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Saat aktif, dashboard akan memperbarui data secara otomatis di latar belakang tanpa menampilkan loader. 
              Indikator countdown dan tombol refresh manual akan muncul di header dashboard. 
              Rekomendasi: <strong>30 menit</strong> untuk keseimbangan antara data terbaru dan performa server.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Section 6.7: Versi Aplikasi */}
      <Card className="border-l-4" style={{ borderLeftColor: currentPengaturan.warnaDark }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5" style={{ color: currentPengaturan.warnaDark }} />
            Versi Aplikasi
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Atur nomor versi aplikasi yang ditampilkan di footer dan halaman publik.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="versiAplikasi">Nomor Versi</Label>
              <Input
                id="versiAplikasi"
                value={form.versiAplikasi}
                onChange={(e) => handleFieldChange("versiAplikasi", e.target.value)}
                placeholder="1.0.0"
              />
              <p className="text-xs text-muted-foreground">Format yang direkomendasikan: Major.Minor.Patch (contoh: 2.1.0)</p>
            </div>
            <div className="space-y-2">
              <Label>Pratinjau</Label>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Versi</span>
                <span className="font-mono font-semibold" style={{ color: currentPengaturan.warnaPrimary }}>
                  v{form.versiAplikasi || "1.0.0"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 7: AI Copilot Configuration */}
      <Card className="border-l-4" style={{ borderLeftColor: currentPengaturan.warnaAccent }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <BotMessageSquare className="w-5 h-5" style={{ color: currentPengaturan.warnaAccent }} />
            AI Copilot
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi AI Financial Copilot untuk analisis keuangan daerah. Pengaturan ini memudahkan deploy dan kustomisasi.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                <BotMessageSquare className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Aktifkan AI Copilot</p>
                <p className="text-xs text-muted-foreground">Nonaktifkan untuk menyembunyikan fitur chat AI</p>
              </div>
            </div>
            <Switch
              checked={form.copilotConfig?.enabled ?? DEFAULT_COPILOT_CONFIG.enabled}
              onCheckedChange={(checked) => {
                const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                setForm((prev) => ({ ...prev, copilotConfig: { ...current, enabled: checked } }));
              }}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>

          {/* Floating Bubble Toggle — only show when copilot is enabled */}
          {(form.copilotConfig?.enabled ?? DEFAULT_COPILOT_CONFIG.enabled) && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">Balon Mengambang (Mobile)</p>
                  <p className="text-xs text-muted-foreground">
                    Tampilkan tombol mengambang AI Copilot di pojok kanan bawah pada mode smartphone
                  </p>
                </div>
              </div>
              <Switch
                checked={form.copilotConfig?.floatingBubbleEnabled ?? DEFAULT_COPILOT_CONFIG.floatingBubbleEnabled}
                onCheckedChange={(checked) => {
                  const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                  setForm((prev) => ({ ...prev, copilotConfig: { ...current, floatingBubbleEnabled: checked } }));
                }}
                className="data-[state=checked]:bg-violet-500"
              />
            </div>
          )}

          {(form.copilotConfig?.enabled ?? DEFAULT_COPILOT_CONFIG.enabled) && (
            <>
              {/* ═══ Provider & API Key ═══ */}
              <div className="space-y-4">
                {/* Provider Selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Cpu className="w-3.5 h-3.5" />
                    Provider AI
                  </Label>
                  <select
                    value={form.copilotConfig?.provider ?? DEFAULT_COPILOT_CONFIG.provider}
                    onChange={(e) => {
                      const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                      const newProvider = e.target.value;
                      // Auto-set base URL based on provider
                      const providerUrls: Record<string, string> = {
                        'z-ai': '',
                        'openai': 'https://api.openai.com/v1',
                        'google': 'https://generativelanguage.googleapis.com/v1beta',
                        'anthropic': 'https://api.anthropic.com/v1',
                        'mistral': 'https://api.mistral.ai/v1',
                        'groq': 'https://api.groq.com/openai/v1',
                        'deepseek': 'https://api.deepseek.com/v1',
                        'custom': '',
                      };
                      const autoBaseUrl = providerUrls[newProvider] ?? '';
                      setForm((prev) => ({
                        ...prev,
                        copilotConfig: {
                          ...current,
                          provider: newProvider,
                          apiKeys: {
                            ...(current.apiKeys || DEFAULT_AI_API_KEYS),
                            baseUrl: autoBaseUrl || (current.apiKeys?.baseUrl ?? ''),
                          },
                        },
                      }));
                      // Clear test results when provider changes
                      setTestResults(null);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="z-ai">🤖 Z-AI (Bawaan — Tanpa API Key)</option>
                    <option value="openai">🟢 OpenAI</option>
                    <option value="google">🔵 Google Gemini</option>
                    <option value="anthropic">🟠 Anthropic (Claude)</option>
                    <option value="mistral">🔵 Mistral AI</option>
                    <option value="groq">⚡ Groq</option>
                    <option value="deepseek">🟣 DeepSeek</option>
                    <option value="custom">🔧 Custom API</option>
                  </select>
                  {form.copilotConfig?.provider === 'z-ai' && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-700">
                        Z-AI sudah tersedia tanpa API key. Semua layanan AI (Chat, Vision, TTS, ASR, Image Gen, Web Search) langsung bisa digunakan.
                      </p>
                    </div>
                  )}
                </div>

                {/* API Key — single field */}
                {form.copilotConfig?.provider !== 'z-ai' && (
                  <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <Label htmlFor="aiApiKey" className="flex items-center gap-1.5 text-sm font-medium">
                      <Key className="w-3.5 h-3.5 text-muted-foreground" />
                      API Key
                    </Label>
                    <div className="relative">
                      <Input
                        id="aiApiKey"
                        type={showApiKeys['apiKey'] ? "text" : "password"}
                        value={form.copilotConfig?.apiKeys?.apiKey ?? ""}
                        onChange={(e) => {
                          const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                          setForm((prev) => ({
                            ...prev,
                            copilotConfig: {
                              ...current,
                              apiKeys: { ...(current.apiKeys || DEFAULT_AI_API_KEYS), apiKey: e.target.value },
                            },
                          }));
                        }}
                        placeholder={
                          form.copilotConfig?.provider === 'openai' ? 'sk-...' :
                          form.copilotConfig?.provider === 'google' ? 'AIza...' :
                          form.copilotConfig?.provider === 'anthropic' ? 'sk-ant-...' :
                          'Masukkan API Key'
                        }
                        className="pr-10 font-mono text-sm h-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKeys((prev) => ({ ...prev, apiKey: !prev['apiKey'] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showApiKeys['apiKey'] ? "Sembunyikan" : "Tampilkan"}
                      >
                        {showApiKeys['apiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Satu API Key untuk semua layanan AI ({form.copilotConfig?.provider === 'openai' ? 'OpenAI' : form.copilotConfig?.provider === 'google' ? 'Google' : form.copilotConfig?.provider === 'anthropic' ? 'Anthropic' : form.copilotConfig?.provider === 'mistral' ? 'Mistral' : form.copilotConfig?.provider === 'groq' ? 'Groq' : form.copilotConfig?.provider === 'deepseek' ? 'DeepSeek' : 'Custom'}).
                      {!form.copilotConfig?.apiKeys?.apiKey && ' Dapatkan API key dari dashboard provider Anda.'}
                    </p>
                    {/* API Key status indicator */}
                    <div className="flex items-center gap-2 mt-1">
                      {form.copilotConfig?.apiKeys?.apiKey ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3" /> API Key dikonfigurasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3" /> API Key belum diisi
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Base URL */}
                {form.copilotConfig?.provider !== 'z-ai' && (
                  <div className="space-y-2">
                    <Label htmlFor="aiBaseUrl" className="flex items-center gap-1.5 text-sm">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      Base URL API
                    </Label>
                    <Input
                      id="aiBaseUrl"
                      value={form.copilotConfig?.apiKeys?.baseUrl ?? ""}
                      onChange={(e) => {
                        const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                        setForm((prev) => ({
                          ...prev,
                          copilotConfig: {
                            ...current,
                            apiKeys: { ...(current.apiKeys || DEFAULT_AI_API_KEYS), baseUrl: e.target.value },
                          },
                        }));
                      }}
                      placeholder="https://api.example.com/v1 (otomatis terisi berdasarkan provider)"
                      className="font-mono text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">Otomatis terisi berdasarkan provider. Ubah hanya jika menggunakan endpoint kustom.</p>
                  </div>
                )}

                {/* Test Connection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={handleTestAllConnections}
                      disabled={testingAll}
                    >
                      {testingAll ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      Tes Koneksi
                    </Button>
                    {form.copilotConfig?.provider !== 'z-ai' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => {
                          const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                          setForm((prev) => ({ ...prev, copilotConfig: { ...current, apiKeys: { ...DEFAULT_AI_API_KEYS } } }));
                          setTestResults(null);
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset API Key
                      </Button>
                    )}
                  </div>
                  <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-emerald-50/50 border border-emerald-200/50 rounded-lg px-2.5 py-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    <span className="text-emerald-700">
                      Tes koneksi menggunakan nilai yang saat ini di form (belum perlu disimpan terlebih dahulu). 
                      Pastikan API Key dan Base URL sudah diisi dengan benar sebelum menekan tombol tes.
                    </span>
                  </div>
                </div>

                {/* Connection test results */}
                {testResults && (
                  <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hasil Tes Koneksi</p>
                    <div className={`grid gap-2 ${form.copilotConfig?.provider === 'z-ai' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                      {(form.copilotConfig?.provider === 'z-ai'
                        ? [
                            { key: 'llm', label: 'LLM / Chat', icon: Sparkles },
                            { key: 'vlm', label: 'Vision', icon: Eye },
                            { key: 'tts', label: 'TTS', icon: Volume2 },
                            { key: 'asr', label: 'ASR', icon: Mic },
                            { key: 'imageGen', label: 'Image Gen', icon: ImagePlus },
                            { key: 'webSearch', label: 'Web Search', icon: Globe },
                          ]
                        : [
                            { key: 'connection', label: 'Koneksi', icon: Wifi },
                          ]
                      ).map((svc) => {
                        const r = testResults[svc.key];
                        return (
                          <div
                            key={svc.key}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs ${
                              r?.status === 'success'
                                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700'
                                : r?.status === 'error'
                                  ? 'border-red-200 bg-red-50/30 text-red-700'
                                  : r?.status === 'loading'
                                    ? 'border-amber-200 bg-amber-50/30 text-amber-700'
                                    : 'border-border bg-card text-muted-foreground'
                            }`}
                          >
                            {r?.status === 'loading' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            ) : r?.status === 'success' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : r?.status === 'error' ? (
                              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            ) : (
                              <svc.icon className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium leading-tight">{svc.label}</p>
                              {r?.latency && <p className="text-[10px] opacity-60">{r.latency}ms</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Test error details with troubleshooting hints */}
                    {Object.values(testResults).some(r => r.status === 'error') && (
                      <div className="space-y-2 pt-1">
                        <div className="space-y-1">
                          {Object.entries(testResults).filter(([, r]) => r.status === 'error').map(([key, r]) => (
                            <p key={key} className="text-[10px] text-red-500 leading-tight">
                              <span className="font-medium capitalize">{key}:</span> {r.message}
                            </p>
                          ))}
                        </div>
                        {/* Troubleshooting hints */}
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/60 space-y-1.5">
                          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Tips Pemecahan Masalah</p>
                          <ul className="space-y-1 text-[10px] text-amber-800">
                            {form.copilotConfig?.provider !== 'z-ai' && !form.copilotConfig?.apiKeys?.apiKey && (
                              <li className="flex items-start gap-1.5">
                                <span>•</span>
                                <span>API Key belum diisi. Masukkan API Key yang valid dari dashboard provider Anda.</span>
                              </li>
                            )}
                            {form.copilotConfig?.provider !== 'z-ai' && form.copilotConfig?.apiKeys?.apiKey && (
                              <>
                                <li className="flex items-start gap-1.5">
                                  <span>•</span>
                                  <span>Pastikan API Key sudah benar dan tidak ada spasi di awal/akhir.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span>•</span>
                                  <span>Pastikan Base URL sesuai dengan provider yang dipilih.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span>•</span>
                                  <span>Cek apakah API Key Anda memiliki kredit/kuota yang cukup di dashboard provider.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span>•</span>
                                  <span>Beberapa provider memerlukan aktivasi billing terlebih dahulu sebelum API dapat digunakan.</span>
                                </li>
                              </>
                            )}
                            <li className="flex items-start gap-1.5">
                              <span>•</span>
                              <span>Jika masalah berlanjut, coba simpan pengaturan terlebih dahulu lalu tes ulang.</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Model & Advanced Settings */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  Pengaturan Lanjutan
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      Model
                    </Label>
                    <Input
                      value={form.copilotConfig?.model ?? DEFAULT_COPILOT_CONFIG.model}
                      onChange={(e) => {
                        const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                        setForm((prev) => ({ ...prev, copilotConfig: { ...current, model: e.target.value } }));
                      }}
                      placeholder="default"
                    />
                    <p className="text-[10px] text-muted-foreground">Kosongkan untuk menggunakan model default provider</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5" />
                      Temperature
                      <span className="ml-auto text-xs font-mono text-muted-foreground">
                        {form.copilotConfig?.temperature ?? DEFAULT_COPILOT_CONFIG.temperature}
                      </span>
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={form.copilotConfig?.temperature ?? DEFAULT_COPILOT_CONFIG.temperature}
                      onChange={(e) => {
                        const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                        setForm((prev) => ({ ...prev, copilotConfig: { ...current, temperature: parseFloat(e.target.value) } }));
                      }}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-500"
                      style={{
                        background: `linear-gradient(to right, ${currentPengaturan.warnaAccent} 0%, ${currentPengaturan.warnaAccent} ${((form.copilotConfig?.temperature ?? 0.7) / 2) * 100}%, #e2e8f0 ${((form.copilotConfig?.temperature ?? 0.7) / 2) * 100}%, #e2e8f0 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0 (Faktual)</span>
                      <span>1</span>
                      <span>2 (Kreatif)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    Max Tokens
                  </Label>
                  <Input
                    type="number"
                    min={256}
                    max={16384}
                    step={256}
                    value={form.copilotConfig?.maxTokens ?? DEFAULT_COPILOT_CONFIG.maxTokens}
                    onChange={(e) => {
                      const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                      setForm((prev) => ({ ...prev, copilotConfig: { ...current, maxTokens: parseInt(e.target.value) || 4096 } }));
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground">Panjang maksimal respons (256-16384)</p>
                </div>

                {/* Welcome Message */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Pesan Selamat Datang
                  </Label>
                  <Textarea
                    value={form.copilotConfig?.welcomeMessage ?? DEFAULT_COPILOT_CONFIG.welcomeMessage}
                    onChange={(e) => {
                      const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                      setForm((prev) => ({ ...prev, copilotConfig: { ...current, welcomeMessage: e.target.value } }));
                    }}
                    rows={2}
                    placeholder="Saya siap membantu menganalisis data keuangan daerah..."
                  />
                </div>

                {/* Custom System Prompt */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <BotMessageSquare className="w-3.5 h-3.5" />
                    System Prompt Tambahan
                  </Label>
                  <Textarea
                    value={form.copilotConfig?.systemPrompt ?? DEFAULT_COPILOT_CONFIG.systemPrompt}
                    onChange={(e) => {
                      const current = form.copilotConfig || DEFAULT_COPILOT_CONFIG;
                      setForm((prev) => ({ ...prev, copilotConfig: { ...current, systemPrompt: e.target.value } }));
                    }}
                    rows={4}
                    placeholder="Tambahkan instruksi khusus untuk AI, misalnya: 'Fokuskan analisis pada efisiensi belanja modal' atau 'Gunakan bahasa yang lebih sederhana'..."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Instruksi tambahan yang akan ditambahkan ke system prompt bawaan. Kosongkan untuk menggunakan prompt default.
                  </p>
                </div>

                {/* Config Preview */}
                <div className="p-3 rounded-xl bg-muted/30 border space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Konfigurasi Saat Ini</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-medium">{(() => {
                      const p = form.copilotConfig?.provider ?? DEFAULT_COPILOT_CONFIG.provider;
                      const labels: Record<string, string> = { 'z-ai': 'Z-AI', 'openai': 'OpenAI', 'google': 'Google Gemini', 'anthropic': 'Anthropic', 'mistral': 'Mistral', 'groq': 'Groq', 'deepseek': 'DeepSeek', 'custom': 'Custom' };
                      return labels[p] || p;
                    })()}</span>
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-medium">{form.copilotConfig?.model ?? (DEFAULT_COPILOT_CONFIG.model || "default")}</span>
                    <span className="text-muted-foreground">Temperature:</span>
                    <span className="font-medium">{form.copilotConfig?.temperature ?? DEFAULT_COPILOT_CONFIG.temperature}</span>
                    <span className="text-muted-foreground">Max Tokens:</span>
                    <span className="font-medium">{form.copilotConfig?.maxTokens ?? DEFAULT_COPILOT_CONFIG.maxTokens}</span>
                    <span className="text-muted-foreground">API Key:</span>
                    <span className="font-medium">
                      {form.copilotConfig?.provider === 'z-ai' ? 'Tidak diperlukan ✓' :
                       form.copilotConfig?.apiKeys?.apiKey ? 'Dikonfigurasi ✓' : 'Belum diisi ⚠'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Disabled state info */}
          {!(form.copilotConfig?.enabled ?? DEFAULT_COPILOT_CONFIG.enabled) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                AI Copilot dinonaktifkan. Menu &quot;AI Copilot&quot; di sidebar akan disembunyikan dan fitur chat tidak dapat diakses.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Reset Setup Wizard */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-amber-700">
            <RotateCcw className="w-5 h-5" />
            Setup Wizard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Jalankan kembali setup wizard untuk mengkonfigurasi ulang aplikasi dari awal. Data yang sudah ada tidak akan dihapus.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              if (!confirm("Apakah Anda yakin ingin menjalankan ulang Setup Wizard? Halaman akan di-refresh setelah konfirmasi.")) return;
              setResettingSetup(true);
              try {
                const res = await fetch("/api/admin/pengaturan", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ setupComplete: false }),
                });
                if (!res.ok) throw new Error("Gagal reset setup");
                window.location.reload();
              } catch (error) {
                toast({
                  title: "Error",
                  description: error instanceof Error ? error.message : "Gagal reset setup wizard",
                  variant: "destructive",
                });
                setResettingSetup(false);
              }
            }}
            disabled={resettingSetup}
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            {resettingSetup ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mereset...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Jalankan Ulang Setup Wizard
              </>
            )}
          </Button>
          <div className="flex items-start gap-2 mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Setup wizard akan muncul saat halaman di-refresh. Pastikan Anda mengingat kredensial admin yang ada.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 9: Backup & Restore Database */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Backup & Restore Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Cadangkan seluruh data aplikasi ke file JSON, atau pulihkan dari backup sebelumnya. Backup mencakup semua data termasuk tahun anggaran, pendapatan, belanja, pembiayaan, realisasi, OPD, pengguna, dan pengaturan.
          </p>

          {/* Backup */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={async () => {
                setBackingUp(true);
                try {
                  const res = await fetch("/api/admin/backup");
                  if (!res.ok) throw new Error("Gagal membuat backup");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  // Extract filename from Content-Disposition header
                  const disposition = res.headers.get("Content-Disposition");
                  const filenameMatch = disposition?.match(/filename="?(.+?)"?$/);
                  a.download = filenameMatch?.[1] || `backup-seruyan-${new Date().toISOString().slice(0, 10)}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast({
                    title: "Backup Berhasil",
                    description: `File backup ${a.download} berhasil diunduh.`,
                  });
                } catch (error) {
                  toast({
                    title: "Backup Gagal",
                    description: error instanceof Error ? error.message : "Gagal membuat backup database",
                    variant: "destructive",
                  });
                } finally {
                  setBackingUp(false);
                }
              }}
              disabled={backingUp || restoring}
              className="gap-2 min-w-[180px]"
              variant="outline"
            >
              {backingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Membuat Backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Backup
                </>
              )}
            </Button>

            <Button
              onClick={() => restoreFileInputRef.current?.click()}
              disabled={restoring || backingUp}
              className="gap-2 min-w-[180px]"
              variant="outline"
            >
              <Upload className="w-4 h-4" />
              Pulihkan dari Backup
            </Button>
            <input
              ref={restoreFileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setRestoreFile(file);
                try {
                  const text = await file.text();
                  const data = JSON.parse(text);
                  if (!data.version || !data.data || !data.tables) {
                    toast({
                      title: "File Tidak Valid",
                      description: "File yang dipilih bukan file backup yang valid.",
                      variant: "destructive",
                    });
                    setRestoreFile(null);
                    return;
                  }
                  setRestorePreview({
                    version: data.version,
                    timestamp: data.timestamp,
                    counts: data.counts,
                    tables: data.tables,
                  });
                  setRestoreConfirmOpen(true);
                } catch {
                  toast({
                    title: "File Tidak Valid",
                    description: "File tidak dapat dibaca. Pastikan file backup dalam format JSON yang benar.",
                    variant: "destructive",
                  });
                  setRestoreFile(null);
                }
                // Reset file input
                e.target.value = "";
              }}
            />
          </div>

          {/* Restore confirmation dialog */}
          {restoreConfirmOpen && restorePreview && (
            <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50/50 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-800">Konfirmasi Restore Database</h4>
                  <p className="text-xs text-red-700 mt-1">
                    <strong>PERINGATAN:</strong> Semua data yang ada saat ini akan dihapus dan diganti dengan data dari backup. Tindakan ini tidak dapat dibatalkan!
                  </p>
                </div>
              </div>

              {/* Backup file info */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-white/60 rounded-lg p-3 border">
                <div>
                  <span className="text-muted-foreground">Versi Backup:</span>
                  <span className="font-semibold ml-1">{restorePreview.version}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tanggal Backup:</span>
                  <span className="font-semibold ml-1">
                    {new Date(restorePreview.timestamp).toLocaleString("id-ID", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>

              {/* Table counts */}
              <div className="bg-white/60 rounded-lg p-3 border max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Data yang akan dipulihkan:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                  {restorePreview.tables.map((table) => {
                    const count = restorePreview.counts[table] || 0;
                    const labelMap: Record<string, string> = {
                      tahunAnggaran: "Tahun Anggaran",
                      opd: "OPD",
                      kategori: "Kategori",
                      pendapatan: "Pendapatan",
                      pendapatanHistory: "Riwayat Pendapatan",
                      belanja: "Belanja",
                      belanjaHistory: "Riwayat Belanja",
                      pembiayaan: "Pembiayaan",
                      pembiayaanHistory: "Riwayat Pembiayaan",
                      realisasiAkun: "Realisasi Akun",
                      realisasiAkunHistory: "Riwayat Realisasi Akun",
                      realisasiSkpd: "Realisasi SKPD",
                      realisasiSkpdHistory: "Riwayat Realisasi SKPD",
                      user: "Pengguna",
                      pengaturanAplikasi: "Pengaturan",
                      pengunjung: "Pengunjung",
                      sipdSyncLog: "Log SIPD",
                    };
                    return (
                      <div key={table} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{labelMap[table] || table}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-2">
                          {count}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRestoreConfirmOpen(false);
                    setRestorePreview(null);
                    setRestoreFile(null);
                  }}
                  disabled={restoring}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={restoring}
                  onClick={async () => {
                    if (!restoreFile) return;
                    setRestoring(true);
                    try {
                      const text = await restoreFile.text();
                      const backupData = JSON.parse(text);
                      const res = await fetch("/api/admin/backup", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(backupData),
                      });
                      if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || "Gagal memulihkan database");
                      }
                      const result = await res.json();
                      toast({
                        title: "Restore Berhasil",
                        description: "Database berhasil dipulihkan. Halaman akan di-refresh.",
                      });
                      // Refresh after a short delay
                      setTimeout(() => window.location.reload(), 1500);
                    } catch (error) {
                      toast({
                        title: "Restore Gagal",
                        description: error instanceof Error ? error.message : "Gagal memulihkan database",
                        variant: "destructive",
                      });
                      setRestoring(false);
                    }
                  }}
                  className="gap-2"
                >
                  {restoring ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memulihkan...
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3.5 h-3.5" />
                      Ya, Restore Database
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Backup</strong> menyimpan seluruh data database dalam format JSON yang dapat diunduh.</p>
              <p><strong>Restore</strong> menghapus semua data saat ini dan menggantinya dengan data dari file backup.</p>
              <p>Disarankan untuk membuat backup secara berkala, terutama sebelum melakukan perubahan besar.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 text-white min-w-[160px]"
          style={{
            backgroundColor: currentPengaturan.warnaPrimary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = currentPengaturan.warnaSecondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = currentPengaturan.warnaPrimary;
          }}
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
