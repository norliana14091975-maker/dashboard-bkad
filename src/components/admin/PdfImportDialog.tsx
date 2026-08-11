"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Building2,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  ShieldCheck,
  ShieldX,
  Filter,
  CheckSquare,
  Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type JenisData = "pendapatan" | "belanja" | "pembiayaan";

type ExtractedAkun = {
  kodeAkun: string;
  namaAkun: string;
  anggaran: number;
  realisasi: number;
  line: number;
  rawLine: string;
  detectedJenis: JenisData | null;
  detectedKategori: string;
};

type ImportRow = {
  kodeAkun: string;
  namaAkun: string;
  kategori: string;
  anggaran: number;
  realisasi: number;
  jenis?: JenisData; // for auto-detect mode: which DB model to import into
  detectedJenis?: JenisData | null;
  detectedKategori?: string;
};

type OpdOption = {
  id: string;
  kodeOpd: string;
  namaOpd: string;
};

type PdfImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jenis?: JenisData | "auto"; // optional: 'auto' = detect from kode akun
  tahunAnggaranId: string | null;
  onSuccess: () => void;
};

const jenisLabels: Record<JenisData, string> = {
  pendapatan: "Pendapatan",
  belanja: "Belanja",
  pembiayaan: "Pembiayaan",
};

const jenisColors: Record<JenisData, string> = {
  pendapatan: "bg-emerald-500",
  belanja: "bg-red-500",
  pembiayaan: "bg-amber-500",
};

const jenisGradients: Record<JenisData, string> = {
  pendapatan: "from-emerald-500 to-green-600",
  belanja: "from-red-500 to-rose-600",
  pembiayaan: "from-amber-500 to-orange-500",
};

// Default kategori per jenis
const defaultKategori: Record<JenisData, string> = {
  pendapatan: "PAD",
  belanja: "Operasi",
  pembiayaan: "Penerimaan",
};

// Badge color classes for detected jenis
const jenisBadgeClasses: Record<JenisData, string> = {
  pendapatan: "bg-emerald-100 text-emerald-800 border-emerald-300",
  belanja: "bg-red-100 text-red-800 border-red-300",
  pembiayaan: "bg-amber-100 text-amber-800 border-amber-300",
};

// Common kode akun prefixes with labels (standard Indonesian government account codes)
const KODE_AKUN_PREFIXES: Record<string, string> = {
  "4": "Pendapatan",
  "4.1": "Pendapatan - PAD",
  "4.2": "Pendapatan - Transfer",
  "4.3": "Pendapatan - Lain-Lain",
  "5": "Belanja",
  "5.1": "Belanja Operasi",
  "5.1.01": "Belanja Operasi - Pegawai",
  "5.1.02": "Belanja Operasi - Barang/Jasa",
  "5.1.03": "Belanja Operasi - Modal",
  "5.1.04": "Belanja Operasi - Bunga",
  "5.1.05": "Belanja Operasi - Subsidi",
  "5.1.06": "Belanja Operasi - Bantuan Sosial",
  "5.1.07": "Belanja Operasi - Bantuan Keuangan",
  "5.1.08": "Belanja Operasi - Tidak Terduga",
  "5.2": "Belanja Modal",
  "5.2.01": "Belanja Modal - Tanah",
  "5.2.02": "Belanja Modal - Peralatan & Mesin",
  "5.2.03": "Belanja Modal - Gedung & Bangunan",
  "5.2.04": "Belanja Modal - Jalan, Irigasi & Jaringan",
  "5.2.05": "Belanja Modal - Aset Tetap Lainnya",
  "5.2.06": "Belanja Modal - Konstruksi Dalam Pengerjaan",
  "5.3": "Belanja Tidak Terduga",
  "5.4": "Belanja Transfer",
  "6": "Pembiayaan",
  "6.1": "Pembiayaan - Penerimaan",
  "6.2": "Pembiayaan - Pengeluaran",
  "7": "Surplus/Defisit",
};

// Extract prefixes from a list of kode akun
function extractPrefixesFromKodeAkun(kodeAkunList: string[]): Array<{ prefix: string; label: string; count: number }> {
  const prefixCount = new Map<string, number>();

  for (const kode of kodeAkunList) {
    const segments = kode.split(".");
    if (segments.length < 2) continue;

    // Level 1: "4", "5", "6"
    const l1 = segments[0];
    prefixCount.set(l1, (prefixCount.get(l1) || 0) + 1);

    // Level 2: "4.1", "5.1", "5.2"
    if (segments.length >= 2) {
      const l2 = `${segments[0]}.${segments[1]}`;
      prefixCount.set(l2, (prefixCount.get(l2) || 0) + 1);
    }

    // Level 3: "5.1.01", "5.2.02"
    if (segments.length >= 3) {
      const l3 = `${segments[0]}.${segments[1]}.${segments[2]}`;
      prefixCount.set(l3, (prefixCount.get(l3) || 0) + 1);
    }
  }

  return Array.from(prefixCount.entries())
    .map(([prefix, count]) => ({
      prefix,
      label: KODE_AKUN_PREFIXES[prefix] || `Kode ${prefix}`,
      count,
    }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix));
}

export default function PdfImportDialog({
  open,
  onOpenChange,
  jenis,
  tahunAnggaranId,
  onSuccess,
}: PdfImportDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [mode, setMode] = useState<"upsert" | "replace">("upsert");
  const [extractedData, setExtractedData] = useState<ExtractedAkun[]>([]);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // OPD selection
  const [opdList, setOpdList] = useState<OpdOption[]>([]);
  const [selectedOpdId, setSelectedOpdId] = useState<string>("");
  const [opdLoading, setOpdLoading] = useState(false);
  const [opdSearch, setOpdSearch] = useState("");

  // Auto-detect mode
  const isAutoDetect = !jenis || jenis === "auto";
  const effectiveJenis = jenis === "auto" ? undefined : jenis;

  // Kategori per row (for batch set)
  const [globalKategori, setGlobalKategori] = useState<string>(effectiveJenis ? defaultKategori[effectiveJenis] : "");
  const [kategoriList, setKategoriList] = useState<string[]>([]);

  // Detected jenis summary from parse
  const [jenisSummary, setJenisSummary] = useState<Record<string, number>>({});

  // Kode akun prefix filter
  const [availablePrefixes, setAvailablePrefixes] = useState<Array<{ prefix: string; label: string; count: number }>>([]);
  const [selectedPrefixes, setSelectedPrefixes] = useState<Set<string>>(new Set());
  const [prefixFilterEnabled, setPrefixFilterEnabled] = useState(false);

  // Result
  const [result, setResult] = useState<{
    success: boolean;
    imported: number;
    created: number;
    updated: number;
    message: string;
  } | null>(null);

  // Selected rows for import (checkbox)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [allSelected, setAllSelected] = useState(true);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isOpdUser = user?.role === "opd";

  // Fetch OPD list when dialog opens (admin/superadmin only)
  useEffect(() => {
    if (open && isAdmin && tahunAnggaranId) {
      fetchOpdList();
    }
  }, [open, isAdmin, tahunAnggaranId]);

  // Fetch kategori list for the selected jenis
  useEffect(() => {
    if (open) {
      fetchKategoriList();
      if (effectiveJenis) {
        setGlobalKategori(defaultKategori[effectiveJenis]);
      }
    }
  }, [open, jenis]);

  const fetchOpdList = async () => {
    setOpdLoading(true);
    try {
      const url = tahunAnggaranId
        ? `/api/admin/opd-list?tahunAnggaranId=${tahunAnggaranId}`
        : "/api/admin/opd-list";
      const res = await fetch(url);
      const data = await res.json();
      if (data.data) {
        setOpdList(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch OPD list:", err);
    } finally {
      setOpdLoading(false);
    }
  };

  const fetchKategoriList = async () => {
    try {
      // In auto-detect mode, fetch kategori for all jenis types
      if (isAutoDetect) {
        const allKategori: string[] = [];
        for (const j of ["Pendapatan", "Belanja", "Pembiayaan"] as const) {
          const res = await fetch(`/api/admin/kategori?jenis=${j}&pageSize=100`);
          const data = await res.json();
          if (data.data) {
            allKategori.push(...data.data.map((k: { namaKategori: string }) => k.namaKategori));
          }
        }
        setKategoriList([...new Set(allKategori)]);
        return;
      }
      const jenisMap: Record<JenisData, string> = {
        pendapatan: "Pendapatan",
        belanja: "Belanja",
        pembiayaan: "Pembiayaan",
      };
      if (!effectiveJenis) return;
      const res = await fetch(`/api/admin/kategori?jenis=${jenisMap[effectiveJenis]}&pageSize=100`);
      const data = await res.json();
      if (data.data) {
        setKategoriList(data.data.map((k: { namaKategori: string }) => k.namaKategori));
      }
    } catch (err) {
      console.error("Failed to fetch kategori:", err);
    }
  };

  const reset = useCallback(() => {
    setStep("upload");
    setExtractedData([]);
    setImportRows([]);
    setParsing(false);
    setImporting(false);
    setResult(null);
    setPdfFile(null);
    setUploadedFileName("");
    setSelectedOpdId("");
    setSelectedRows(new Set());
    setAllSelected(true);
    setGlobalKategori(effectiveJenis ? defaultKategori[effectiveJenis] : "");
    setAvailablePrefixes([]);
    setSelectedPrefixes(new Set());
    setPrefixFilterEnabled(false);
  }, [jenis]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Computed: filtered import rows based on selected prefixes
  const filteredImportRows = useMemo(() => {
    if (!prefixFilterEnabled || selectedPrefixes.size === 0) {
      return importRows;
    }
    return importRows.filter(row => {
      return Array.from(selectedPrefixes).some(prefix => row.kodeAkun.startsWith(prefix));
    });
  }, [importRows, prefixFilterEnabled, selectedPrefixes]);

  // Computed: filtered indices (mapping from filteredImportRows index to importRows index)
  const filteredToOriginalIndex = useMemo(() => {
    if (!prefixFilterEnabled || selectedPrefixes.size === 0) {
      return importRows.map((_, i) => i);
    }
    const indices: number[] = [];
    importRows.forEach((row, i) => {
      if (Array.from(selectedPrefixes).some(prefix => row.kodeAkun.startsWith(prefix))) {
        indices.push(i);
      }
    });
    return indices;
  }, [importRows, prefixFilterEnabled, selectedPrefixes]);

  // Toggle a prefix filter
  const togglePrefix = (prefix: string) => {
    setSelectedPrefixes(prev => {
      const next = new Set(prev);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
      }
      return next;
    });
  };

  // Select all prefixes
  const selectAllPrefixes = () => {
    setSelectedPrefixes(new Set(availablePrefixes.map(p => p.prefix)));
  };

  // Clear all prefixes
  const clearAllPrefixes = () => {
    setSelectedPrefixes(new Set());
  };

  // Apply global kategori to all rows
  const applyGlobalKategori = () => {
    setImportRows(prev => prev.map(row => ({ ...row, kategori: globalKategori })));
  };

  // Toggle row selection
  const toggleRow = (index: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedRows(new Set());
      setAllSelected(false);
    } else {
      setSelectedRows(new Set(importRows.map((_, i) => i)));
      setAllSelected(true);
    }
  };

  // Handle PDF file upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({
        title: "Format tidak didukung",
        description: "Hanya file PDF yang dapat diimpor",
        variant: "destructive",
      });
      return;
    }

    if (!tahunAnggaranId) {
      toast({
        title: "Tahun Anggaran Belum Dipilih",
        description: "Pilih tahun anggaran terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setPdfFile(file);
    setUploadedFileName(file.name);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jenis", isAutoDetect ? "auto" : (effectiveJenis || "auto"));
      formData.append("tahunAnggaranId", tahunAnggaranId);
      formData.append("action", "parse");
      if (selectedOpdId && selectedOpdId !== "__none__") {
        formData.append("opdId", selectedOpdId);
      }

      const res = await fetch("/api/admin/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Gagal memproses PDF",
          description: data.error || "Terjadi kesalahan saat memproses file PDF",
          variant: "destructive",
        });
        setParsing(false);
        return;
      }

      setExtractedData(data.extracted);
      setJenisSummary(data.jenisSummary || {});

      // Convert to import rows with auto-detected kategori and jenis
      const rows: ImportRow[] = data.extracted.map((item: ExtractedAkun) => ({
        kodeAkun: item.kodeAkun,
        namaAkun: item.namaAkun,
        kategori: isAutoDetect
          ? (item.detectedKategori || defaultKategori[item.detectedJenis || "pendapatan"])
          : globalKategori,
        anggaran: item.anggaran || 0,
        realisasi: item.realisasi || 0,
        jenis: isAutoDetect ? item.detectedJenis : effectiveJenis,
        detectedJenis: item.detectedJenis,
        detectedKategori: item.detectedKategori,
      }));
      setImportRows(rows);
      setSelectedRows(new Set(rows.map((_, i) => i)));
      setAllSelected(true);

      // Extract available prefixes from the kode akun list
      const prefixes = extractPrefixesFromKodeAkun(rows.map(r => r.kodeAkun));
      setAvailablePrefixes(prefixes);
      // Auto-select all prefixes initially
      setSelectedPrefixes(new Set(prefixes.map(p => p.prefix)));
      setPrefixFilterEnabled(prefixes.length > 1); // Enable filter if multiple prefixes found

      setStep("preview");
    } catch (err) {
      toast({
        title: "Error",
        description: "Gagal membaca file PDF. Pastikan file tidak rusak.",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  // Handle file input change
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Handle drag and drop
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Perform the actual import
  const doImport = async () => {
    if (!pdfFile || !tahunAnggaranId) return;

    const selectedImportRows = importRows.filter((_, i) => selectedRows.has(i));
    if (selectedImportRows.length === 0) {
      toast({
        title: "Tidak ada data dipilih",
        description: "Pilih minimal satu baris data untuk diimpor",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("jenis", isAutoDetect ? "auto" : (effectiveJenis || "auto"));
      formData.append("tahunAnggaranId", tahunAnggaranId);
      formData.append("action", "import");
      formData.append("mode", mode);
      // Include per-row jenis for auto-detect mode
      formData.append("rows", JSON.stringify(selectedImportRows));
      if (selectedOpdId && selectedOpdId !== "__none__") {
        formData.append("opdId", selectedOpdId);
      }

      const res = await fetch("/api/admin/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Import Gagal",
          description: data.error || "Terjadi kesalahan saat mengimpor data",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      setResult({
        success: data.success,
        imported: data.imported,
        created: data.created,
        updated: data.updated,
        message: data.message,
      });
      setStep("result");
      onSuccess();
    } catch (err) {
      toast({
        title: "Error",
        description: "Gagal mengimpor data dari PDF",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // Update a single row's kategori
  const updateRowKategori = (index: number, kategori: string) => {
    setImportRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], kategori };
      return next;
    });
  };

  // Update a single row's namaAkun
  const updateRowNamaAkun = (index: number, namaAkun: string) => {
    setImportRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], namaAkun };
      return next;
    });
  };

  // Format number as Rupiah
  const formatRupiah = (val: number) => {
    if (!val || val === 0) return "-";
    return new Intl.NumberFormat("id-ID").format(val);
  };

  // Filtered OPD list
  const filteredOpds = opdList.filter(opd =>
    opd.namaOpd.toLowerCase().includes(opdSearch.toLowerCase()) ||
    opd.kodeOpd.toLowerCase().includes(opdSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${effectiveJenis ? jenisGradients[effectiveJenis] : 'from-sky-500 to-blue-600'} flex items-center justify-center`}>
              <FileText className="w-4 h-4 text-white" />
            </div>
            Import PDF{isAutoDetect ? " — Auto-Detect" : ` — ${jenisLabels[effectiveJenis!]}`}
          </DialogTitle>
          <DialogDescription>
            Upload file PDF untuk mengekstrak kode akun 17 digit+. {isAutoDetect ? "Kategori (Pendapatan/Belanja/Pembiayaan) akan terdeteksi otomatis dari kode akun." : `Mengimpor data ${jenisLabels[effectiveJenis!].toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* OPD Selection for Admin/Superadmin */}
                {isAdmin && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="w-4 h-4" />
                      OPD Tujuan Import
                    </Label>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {user?.role === "superadmin" ? "Super Admin" : "Admin"} — dapat memilih OPD
                      </Badge>
                    </div>
                    {opdLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memuat daftar OPD...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Cari OPD..."
                            value={opdSearch}
                            onChange={e => setOpdSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Select value={selectedOpdId} onValueChange={setSelectedOpdId}>
                          <SelectTrigger>
                            <SelectValue placeholder="-- Tanpa OPD (Data Global) --" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- Tanpa OPD (Data Global) --</SelectItem>
                            {filteredOpds.map(opd => (
                              <SelectItem key={opd.id} value={opd.id}>
                                {opd.kodeOpd} — {opd.namaOpd}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedOpdId && selectedOpdId !== "__none__" && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Data akan diimpor ke OPD: {opdList.find(o => o.id === selectedOpdId)?.namaOpd}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* OPD User Info */}
                {isOpdUser && (
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                      <ShieldX className="w-4 h-4" />
                      OPD User — Data hanya dapat diimpor ke OPD Anda sendiri
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      Sebagai pengguna OPD, Anda hanya dapat mengimpor data ke OPD yang terkait dengan akun Anda.
                    </div>
                  </div>
                )}

                {/* Import Mode */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Mode Import</Label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={mode === "replace"}
                      onCheckedChange={checked => setMode(checked ? "replace" : "upsert")}
                    />
                    <div className="text-sm">
                      {mode === "upsert" ? (
                        <span>Timpa Data Sama — data dengan kode akun sama akan ditimpa</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Ganti Semua — semua data {isAdmin ? "" : "OPD Anda "}akan dihapus lalu diganti
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kategori Default */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kategori Default</Label>
                  <div className="flex items-center gap-2">
                    {kategoriList.length > 0 ? (
                      <Select value={globalKategori} onValueChange={setGlobalKategori}>
                        <SelectTrigger className="w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {kategoriList.map(k => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={globalKategori}
                        onChange={e => setGlobalKategori(e.target.value)}
                        className="w-64"
                        placeholder="Kategori"
                      />
                    )}
                    <Badge variant="secondary" className="text-xs">Diterapkan ke semua baris</Badge>
                  </div>
                </div>

                {/* PDF File Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">File PDF</Label>
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                      dragOver
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                    }`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={onFileChange}
                    />
                    <div className="space-y-3">
                      <div className={`mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${jenisGradients[jenis]} flex items-center justify-center shadow-lg`}>
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          {dragOver ? "Lepaskan file PDF di sini" : "Klik atau seret file PDF ke sini"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          File PDF yang berisi kode akun 17 digit (termasuk titik) akan diekstrak secara otomatis
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Format: .pdf saja
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Info about what gets extracted */}
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-sm font-medium mb-2">📋 Cara Kerja Import PDF</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Upload file PDF (DPA, APBD, dokumen keuangan)</li>
                    <li>Sistem otomatis mengekstrak <strong>kode akun 17 digit</strong> (termasuk titik) dari teks PDF</li>
                    <li>Nama akun, anggaran, dan realisasi juga diekstrak jika tersedia</li>
                    <li>Anda dapat mengedit data sebelum mengimpor ke database</li>
                    <li>OPD User hanya dapat mengimpor ke OPD sendiri</li>
                    <li>Admin / Super Admin dapat memilih OPD tujuan</li>
                  </ul>
                </div>

                {parsing && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-sm font-medium">Membaca dan mengekstrak kode akun dari PDF...</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Summary header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isAutoDetect ? (
                      // Show auto-detect summary with per-jenis badges
                      <>
                        <Badge className="bg-sky-500 text-white">
                          {extractedData.length} akun ditemukan
                        </Badge>
                        {Object.entries(jenisSummary).map(([j, count]) => {
                          const jd = j as JenisData;
                          return (
                            <Badge
                              key={j}
                              variant="outline"
                              className={`text-xs ${j === 'unknown' ? 'bg-gray-100 text-gray-600 border-gray-300' : jenisBadgeClasses[jd]}`}
                            >
                              {j === 'unknown' ? 'Tidak dikenal' : jenisLabels[jd]}: {count}
                            </Badge>
                          );
                        })}
                      </>
                    ) : (
                      <Badge className={`${effectiveJenis ? jenisColors[effectiveJenis] : 'bg-sky-500'} text-white`}>
                        {extractedData.length} kode akun ditemukan ({filteredImportRows.length} ditampilkan)
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploadedFileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStep("upload");
                        setExtractedData([]);
                        setImportRows([]);
                        setPdfFile(null);
                        setUploadedFileName("");
                      }}
                    >
                      Upload Ulang
                    </Button>
                  </div>
                </div>

                {/* OPD Info */}
                {isAdmin && selectedOpdId && selectedOpdId !== "__none__" && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>Import ke OPD: <strong>{opdList.find(o => o.id === selectedOpdId)?.namaOpd}</strong></span>
                  </div>
                )}
                {isOpdUser && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <ShieldX className="w-4 h-4" />
                    <span>Import ke OPD Anda sendiri</span>
                  </div>
                )}

                {/* Kode Akun Prefix Filter */}
                {availablePrefixes.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 overflow-hidden">
                    <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Filter Kode Akun</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={prefixFilterEnabled}
                          onCheckedChange={setPrefixFilterEnabled}
                        />
                        <span className="text-xs text-muted-foreground">
                          {prefixFilterEnabled ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </div>
                    {prefixFilterEnabled && (
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllPrefixes}>
                            Pilih Semua
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={clearAllPrefixes}>
                            Kosongkan
                          </Button>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {selectedPrefixes.size} dari {availablePrefixes.length} prefix dipilih
                            → <strong>{filteredImportRows.length}</strong> baris
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {availablePrefixes.map(({ prefix, label, count }) => {
                            const isSelected = selectedPrefixes.has(prefix);
                            // Determine indent level based on dots
                            const level = prefix.split(".").length - 1;
                            return (
                              <button
                                key={prefix}
                                onClick={() => togglePrefix(prefix)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 border ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-background text-foreground border-muted-foreground/20 hover:border-primary/50 hover:bg-muted"
                                } ${level > 0 ? "ml-" + (level * 2) : ""}`}
                              >
                                <code className="font-mono">{prefix}</code>
                                <span className="opacity-70">—</span>
                                <span className="truncate max-w-[120px]">{label}</span>
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                                  {count}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Batch Kategori */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                  <Label className="text-sm font-medium whitespace-nowrap">Kategori Semua Baris:</Label>
                  {kategoriList.length > 0 ? (
                    <Select value={globalKategori} onValueChange={val => { setGlobalKategori(val); setImportRows(prev => prev.map(row => ({ ...row, kategori: val }))); }}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {kategoriList.map(k => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={globalKategori}
                      onChange={e => {
                        setGlobalKategori(e.target.value);
                        setImportRows(prev => prev.map(row => ({ ...row, kategori: e.target.value })));
                      }}
                      className="w-48"
                    />
                  )}
                  <span className="text-xs text-muted-foreground">
                    ({selectedRows.size} dari {filteredImportRows.length} baris tampil, {importRows.length} total)
                  </span>
                </div>

                {/* Preview Table */}
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleAll}
                              className="rounded"
                            />
                          </TableHead>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead className="min-w-[140px]">Kode Akun</TableHead>
                          {isAutoDetect && <TableHead className="w-28">Jenis</TableHead>}
                          <TableHead className="min-w-[200px]">Nama Akun</TableHead>
                          <TableHead className="w-32">Kategori</TableHead>
                          <TableHead className="w-32 text-right">Anggaran</TableHead>
                          <TableHead className="w-32 text-right">Realisasi</TableHead>
                          <TableHead className="w-20 text-center">Panjang</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredImportRows.map((row, filteredIdx) => {
                          const originalIdx = filteredToOriginalIndex[filteredIdx];
                          const is17Digit = row.kodeAkun.length === 17;
                          return (
                            <TableRow
                              key={filteredIdx}
                              className={`${!selectedRows.has(originalIdx) ? "opacity-40" : ""} ${is17Digit ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(originalIdx)}
                                  onChange={() => toggleRow(originalIdx)}
                                  className="rounded"
                                />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{filteredIdx + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                    {row.kodeAkun}
                                  </code>
                                  {is17Digit && (
                                    <Badge variant="default" className="text-[10px] px-1 py-0 bg-emerald-600">
                                      17
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              {isAutoDetect && (
                                <TableCell>
                                  {row.detectedJenis ? (
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 ${jenisBadgeClasses[row.detectedJenis]}`}
                                    >
                                      {jenisLabels[row.detectedJenis]}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600 border-gray-300">
                                      ?
                                    </Badge>
                                  )}
                                </TableCell>
                              )}
                              <TableCell>
                                <Input
                                  value={row.namaAkun}
                                  onChange={e => updateRowNamaAkun(originalIdx, e.target.value)}
                                  className="h-7 text-xs"
                                />
                              </TableCell>
                              <TableCell>
                                {kategoriList.length > 0 ? (
                                  <Select
                                    value={row.kategori}
                                    onValueChange={val => updateRowKategori(originalIdx, val)}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {kategoriList.map(k => (
                                        <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={row.kategori}
                                    onChange={e => updateRowKategori(originalIdx, e.target.value)}
                                    className="h-7 text-xs"
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono">
                                {formatRupiah(row.anggaran)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-mono">
                                {formatRupiah(row.realisasi)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={is17Digit ? "default" : "secondary"}
                                  className={`text-[10px] ${is17Digit ? "bg-emerald-600" : ""}`}
                                >
                                  {row.kodeAkun.length}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Badge variant="default" className="text-[10px] px-1 py-0 bg-emerald-600">17</Badge>
                    <span>Persis 17 karakter (termasuk titik)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">n</Badge>
                    <span>Panjang karakter lainnya</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Result */}
            {step === "result" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 py-8"
              >
                <div className="text-center space-y-4">
                  <div className={`mx-auto w-20 h-20 rounded-full ${result.success ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"} flex items-center justify-center`}>
                    {result.success ? (
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {result.success ? "Import Berhasil!" : "Import Gagal"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-primary">{result.imported}</div>
                      <div className="text-xs text-muted-foreground">Total Diimpor</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-emerald-600">{result.created}</div>
                      <div className="text-xs text-muted-foreground">Data Baru</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-amber-600">{result.updated}</div>
                      <div className="text-xs text-muted-foreground">Diperbarui</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t bg-muted/20">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              {step === "preview" && `${selectedRows.size} baris dipilih untuk import`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {step === "result" ? "Tutup" : "Batal"}
              </Button>
              {step === "preview" && (
                <Button
                  onClick={doImport}
                  disabled={importing || selectedRows.size === 0}
                  className={`bg-gradient-to-r ${jenisGradients[jenis]} text-white`}
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Mengimpor...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {selectedRows.size} Baris
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
