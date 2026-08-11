"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus,
  Eye,
  X,
  FileDown,
  Building2,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePengaturan } from "@/context/PengaturanContext";
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type JenisData = "pendapatan" | "belanja" | "pembiayaan";

type ImportRow = {
  kodeAkun: string;
  namaAkun: string;
  kategori: string;
  anggaran: number;
  realisasi: number;
  jenis?: JenisData; // for auto-detect mode
  detectedJenis?: JenisData | null;
  detectedKategori?: string;
};

type ImportDialogProps = {
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

const jenisBadgeClasses: Record<JenisData, string> = {
  pendapatan: "bg-emerald-100 text-emerald-800 border-emerald-300",
  belanja: "bg-red-100 text-red-800 border-red-300",
  pembiayaan: "bg-amber-100 text-amber-800 border-amber-300",
};

export default function ImportDialog({
  open,
  onOpenChange,
  jenis,
  tahunAnggaranId,
  onSuccess,
}: ImportDialogProps) {
  const { toast } = useToast();
  const { pengaturan } = usePengaturan();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAutoDetect = !jenis || jenis === "auto";
  const effectiveJenis = jenis === "auto" ? undefined : jenis;

  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [mode, setMode] = useState<"upsert" | "replace">("upsert");
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    imported: number;
    created: number;
    updated: number;
    message: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  // OPD selection
  const [opdList, setOpdList] = useState<Array<{ id: string; kodeOpd: string; namaOpd: string }>>([]);
  const [selectedOpdId, setSelectedOpdId] = useState<string>("");
  const [opdLoading, setOpdLoading] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isOpdUser = user?.role === "opd";

  // Fetch OPD list when dialog opens
  useEffect(() => {
    if (open && isAdmin && tahunAnggaranId) {
      setOpdLoading(true);
      fetch(`/api/admin/opd-list?tahunAnggaranId=${tahunAnggaranId}`)
        .then(res => res.json())
        .then(data => { if (data.data) setOpdList(data.data); })
        .catch(() => {})
        .finally(() => setOpdLoading(false));
    }
  }, [open, isAdmin, tahunAnggaranId]);

  const reset = useCallback(() => {
    setStep("upload");
    setParsedRows([]);
    setParseErrors([]);
    setImporting(false);
    setResult(null);
    setMode("upsert");
    setUploadedFileName("");
    setSelectedOpdId("");
  }, []);

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const downloadTemplate = async (format: 'xlsx' | 'csv') => {
    try {
      const res = await fetch(`/api/admin/import/template?jenis=${jenis}&format=${format}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Gagal mengunduh template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template_${jenis}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Berhasil",
        description: `Template ${format.toUpperCase()} berhasil diunduh`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Gagal mengunduh template",
        variant: "destructive",
      });
    }
  };

  /**
   * Split a CSV line respecting quoted fields.
   * Supports both comma and semicolon as delimiter (auto-detect).
   * Quoted fields (e.g., "31.500,5") are preserved as single values.
   */
  const splitCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string): { rows: ImportRow[]; errors: string[] } => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    if (lines.length === 0) {
      return { rows: [], errors: ["File kosong"] };
    }

    // Auto-detect delimiter: if first data line has semicolons, use semicolon
    // This is common in Indonesian/European CSV where comma is the decimal separator
    const firstDataLine = lines.find(l => !l.startsWith('#')) || '';
    const delimiter = firstDataLine.includes(';') ? ';' : ',';

    // Skip header line
    const dataLines = lines.slice(1);
    const rows: ImportRow[] = [];
    const errors: string[] = [];

    dataLines.forEach((line, idx) => {
      const cols = splitCSVLine(line, delimiter);
      if (cols.length < 5) {
        errors.push(`Baris ${idx + 2}: Kolom tidak lengkap (butuh 5 kolom)`);
        return;
      }

      const [kodeAkun, namaAkun, kategori, anggaranStr, realisasiStr] = cols;

      if (!kodeAkun) {
        errors.push(`Baris ${idx + 2}: Kode Akun kosong`);
        return;
      }
      if (!namaAkun) {
        errors.push(`Baris ${idx + 2}: Nama Akun kosong`);
        return;
      }
      if (!kategori) {
        errors.push(`Baris ${idx + 2}: Kategori kosong`);
        return;
      }

      const anggaran = parseNumber(anggaranStr);
      const realisasi = parseNumber(realisasiStr);

      if (isNaN(anggaran) || anggaran < 0) {
        errors.push(`Baris ${idx + 2}: Anggaran tidak valid ("${anggaranStr}")`);
        return;
      }
      if (isNaN(realisasi) || realisasi < 0) {
        errors.push(`Baris ${idx + 2}: Realisasi tidak valid ("${realisasiStr}")`);
        return;
      }

      rows.push({ kodeAkun, namaAkun, kategori, anggaran, realisasi });
    });

    return { rows, errors };
  };

  const parseXLSX = (data: ArrayBuffer): { rows: ImportRow[]; errors: string[] } => {
    try {
      const workbook = XLSX.read(data, { type: 'array' });

      // Try to find the "Template Data" sheet first, otherwise use first sheet
      let sheetName = workbook.SheetNames.find(name =>
        name.toLowerCase().includes('template') || name.toLowerCase().includes('data')
      );
      if (!sheetName) {
        sheetName = workbook.SheetNames[0];
      }

      const ws = workbook.Sheets[sheetName];
      if (!ws) {
        return { rows: [], errors: ["Sheet tidak ditemukan dalam file"] };
      }

      // Convert sheet to array of arrays
      const sheetData: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (sheetData.length === 0) {
        return { rows: [], errors: ["File kosong"] };
      }

      // Skip header row (first row)
      const dataRows = sheetData.slice(1);
      const rows: ImportRow[] = [];
      const errors: string[] = [];

      dataRows.forEach((row, idx) => {
        // Skip empty rows (but keep rows where anggaran/realisasi is 0)
        if (!row || row.length === 0 || row.every(cell => cell == null || cell === '')) {
          return;
        }

        const kodeAkun = String(row[0] ?? '').trim();
        const namaAkun = String(row[1] ?? '').trim();
        const kategori = String(row[2] ?? '').trim();
        // Use ?? instead of || to preserve 0 values (0 || '' evaluates to '')
        const anggaranStr = String(row[3] ?? '').trim();
        const realisasiStr = String(row[4] ?? '').trim();

        // Skip rows with no kode akun (likely empty template rows)
        if (!kodeAkun) return;

        if (!namaAkun) {
          errors.push(`Baris ${idx + 2}: Nama Akun kosong`);
          return;
        }
        if (!kategori) {
          errors.push(`Baris ${idx + 2}: Kategori kosong`);
          return;
        }

        const anggaran = parseNumber(anggaranStr);
        const realisasi = parseNumber(realisasiStr);

        if (isNaN(anggaran) || anggaran < 0) {
          errors.push(`Baris ${idx + 2}: Anggaran tidak valid ("${anggaranStr}")`);
          return;
        }
        if (isNaN(realisasi) || realisasi < 0) {
          errors.push(`Baris ${idx + 2}: Realisasi tidak valid ("${realisasiStr}")`);
          return;
        }

        rows.push({ kodeAkun, namaAkun, kategori, anggaran, realisasi });
      });

      return { rows, errors };
    } catch (err) {
      return { rows: [], errors: [`Gagal membaca file XLSX: ${err instanceof Error ? err.message : 'Unknown error'}`] };
    }
  };

  const parseNumber = (str: string): number => {
    if (!str || !str.trim()) return NaN;
    // Remove "Rp" / "Rp." prefix and whitespace
    let cleaned = str.replace(/Rp\.?\s*/gi, '').trim();
    // Remove dots as thousand separators (Indonesian format: 31.500.000.000)
    cleaned = cleaned.replace(/\./g, '');
    // Replace comma with dot as decimal separator (Indonesian format: 31500,5 → 31500.5)
    cleaned = cleaned.replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return num;
  };

  // Auto-detect jenis and kategori from kode akun prefix
  const enrichRowsWithAutoDetect = (rows: ImportRow[]): ImportRow[] => {
    if (!isAutoDetect) return rows;
    return rows.map(row => {
      const firstDigit = row.kodeAkun.trim().charAt(0);
      let detectedJenis: JenisData | null = null;
      let detectedKategori = row.kategori; // keep existing kategori from file

      switch (firstDigit) {
        case '4':
          detectedJenis = 'pendapatan';
          if (!row.kategori) {
            const seg2 = row.kodeAkun.split('.')[1];
            detectedKategori = seg2 === '1' ? 'PAD' : seg2 === '2' ? 'Transfer' : seg2 === '3' ? 'Lain-Lain' : 'PAD';
          }
          break;
        case '5':
          detectedJenis = 'belanja';
          if (!row.kategori) {
            const seg2 = row.kodeAkun.split('.')[1];
            detectedKategori = seg2 === '1' ? 'Operasi' : seg2 === '2' ? 'Modal' : seg2 === '3' ? 'Tidak Terduga' : seg2 === '4' ? 'Transfer' : 'Operasi';
          }
          break;
        case '6':
          detectedJenis = 'pembiayaan';
          if (!row.kategori) {
            const seg2 = row.kodeAkun.split('.')[1];
            detectedKategori = seg2 === '1' ? 'Penerimaan' : seg2 === '2' ? 'Pengeluaran' : 'Penerimaan';
          }
          break;
      }

      return {
        ...row,
        kategori: detectedKategori,
        jenis: detectedJenis || undefined,
        detectedJenis,
        detectedKategori,
      };
    });
  };

  const handleFile = (file: File) => {
    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv') || file.name.endsWith('.txt');

    if (!isXLSX && !isCSV) {
      toast({
        title: "Format Salah",
        description: "Hanya file XLSX (Excel) dan CSV yang didukung",
        variant: "destructive",
      });
      return;
    }

    setUploadedFileName(file.name);

    if (isXLSX) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as ArrayBuffer;
        const { rows, errors } = parseXLSX(data);
        setParseErrors(errors);
        setParsedRows(enrichRowsWithAutoDetect(rows));

        if (rows.length > 0) {
          setStep("preview");
        } else if (errors.length > 0) {
          toast({
            title: "Gagal Membaca File",
            description: "Tidak ada data valid yang dapat diimpor",
            variant: "destructive",
          });
        } else {
          toast({
            title: "File Kosong",
            description: "Tidak ada data ditemukan dalam file Excel",
            variant: "destructive",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { rows, errors } = parseCSV(text);
        setParseErrors(errors);
        setParsedRows(enrichRowsWithAutoDetect(rows));

        if (rows.length > 0) {
          setStep("preview");
        } else if (errors.length > 0) {
          toast({
            title: "Gagal Membaca File",
            description: "Tidak ada data valid yang dapat diimpor",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeRow = (index: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (!tahunAnggaranId || parsedRows.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jenis: isAutoDetect ? "auto" : effectiveJenis,
          tahunAnggaranId,
          rows: parsedRows,
          mode,
          opdId: selectedOpdId && selectedOpdId !== "__none__" ? selectedOpdId : null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.validationErrors) {
          const errMsg = json.validationErrors
            .slice(0, 5)
            .map((v: { row: number; error: string }) => `Baris ${v.row}: ${v.error}`)
            .join("\n");
          throw new Error(`Validasi gagal:\n${errMsg}`);
        }
        throw new Error(json.error || "Gagal mengimpor data");
      }

      setResult({
        success: true,
        imported: json.imported,
        created: json.created || 0,
        updated: json.updated || 0,
        message: json.message,
      });
      setStep("result");
      onSuccess();
    } catch (err) {
      toast({
        title: "Gagal Import",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
      setResult({
        success: false,
        imported: 0,
        created: 0,
        updated: 0,
        message: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
      setStep("result");
    } finally {
      setImporting(false);
    }
  };

  const formatRupiah = (value: number) => {
    if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)} T`;
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} M`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Jt`;
    return value.toLocaleString("id-ID");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${effectiveJenis ? jenisColors[effectiveJenis] : 'bg-sky-500'}`} />
            Import Data{isAutoDetect ? " — Auto-Detect" : ` ${jenisLabels[effectiveJenis!]}`}
          </DialogTitle>
          <DialogDescription>
            {isAutoDetect
              ? "Impor data dari file Excel/CSV. Kategori (Pendapatan/Belanja/Pembiayaan) terdeteksi otomatis dari kode akun."
              : `Impor data ${jenisLabels[effectiveJenis!]} dari file Excel (.xlsx) atau CSV`}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* ====== STEP 1: UPLOAD ====== */}
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
                    <Select value={selectedOpdId} onValueChange={setSelectedOpdId}>
                      <SelectTrigger>
                        <SelectValue placeholder="-- Tanpa OPD (Data Global) --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Tanpa OPD (Data Global) --</SelectItem>
                        {opdList.map(opd => (
                          <SelectItem key={opd.id} value={opd.id}>
                            {opd.kodeOpd} — {opd.namaOpd}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                </div>
              )}

              {/* Download template - Professional dual format card */}
              <div className="rounded-xl border bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
                <div className={`px-4 py-2.5 bg-gradient-to-r ${jenisGradients[jenis]}`}>
                  <div className="flex items-center gap-2 text-white">
                    <FileDown className="w-4 h-4" />
                    <span className="text-sm font-semibold">Unduh Template Import</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Pilih format template yang ingin Anda unduh, isi data, lalu upload kembali:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* XLSX Template */}
                    <button
                      onClick={() => downloadTemplate('xlsx')}
                      className="group flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-400 transition-all duration-200"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                        <FileSpreadsheet className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-emerald-700">Excel (.xlsx)</p>
                        <p className="text-[10px] text-emerald-600/70 mt-0.5">Direkomendasikan</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300 gap-1">
                        <Download className="w-2.5 h-2.5" />
                        XLSX
                      </Badge>
                    </button>

                    {/* CSV Template */}
                    <button
                      onClick={() => downloadTemplate('csv')}
                      className="group flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                        <FileDown className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-blue-700">CSV (.csv)</p>
                        <p className="text-[10px] text-blue-600/70 mt-0.5">Format sederhana</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-300 gap-1">
                        <Download className="w-2.5 h-2.5" />
                        CSV
                      </Badge>
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  dragOver
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-muted-foreground/25 hover:border-muted-foreground/40"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <motion.div
                  animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Upload
                    className={`w-10 h-10 mx-auto mb-3 ${
                      dragOver ? "text-primary" : "text-muted-foreground/50"
                    }`}
                  />
                </motion.div>
                <p className="text-sm font-medium mb-1">
                  Drag & drop file Excel/CSV di sini
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  atau klik untuk memilih file (.xlsx, .csv)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Pilih File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Format info */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <p className="font-medium">Format yang didukung:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="font-semibold text-emerald-700">Excel (.xlsx)</p>
                        <p>Template dengan petunjuk & contoh data</p>
                      </div>
                      <div>
                        <p className="font-semibold text-blue-700">CSV (.csv)</p>
                        <p>Kode Akun, Nama Akun, Kategori, Anggaran, Realisasi</p>
                      </div>
                    </div>
                    <p className="mt-1">Anggaran & Realisasi: angka tanpa prefix Rp. Mendukung koma desimal (contoh: 31500000000 atau 31.500.000.000,5). Nilai 0 juga dapat diimpor.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ====== STEP 2: PREVIEW ====== */}
          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Parse errors */}
              {parseErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      <p className="font-medium mb-1">
                        {parseErrors.length} baris dilewati:
                      </p>
                      <div className="max-h-20 overflow-y-auto custom-scrollbar space-y-0.5">
                        {parseErrors.map((err, i) => (
                          <p key={i}>{err}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview summary */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Eye className="w-3 h-3" />
                    Preview
                  </Badge>
                  <span className="text-sm font-medium">
                    {parsedRows.length} baris data
                  </span>
                  {uploadedFileName && (
                    <span className="text-xs text-muted-foreground">
                      dari {uploadedFileName}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("upload");
                    setParsedRows([]);
                    setParseErrors([]);
                    setUploadedFileName("");
                  }}
                  className="text-xs"
                >
                  Ganti File
                </Button>
              </div>

              {/* Import mode */}
              <div className="rounded-lg border overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 border-b">
                  <span className="text-xs font-semibold text-foreground">
                    Mode Import
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode("upsert")}
                      className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 ${
                        mode === "upsert"
                          ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        mode === "upsert" ? "bg-emerald-500" : "bg-muted"
                      }`}>
                        <Plus className="w-3 h-3 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold">Timpa Data Sama</div>
                        <div className={`text-[10px] ${mode === "upsert" ? "text-emerald-600" : "text-muted-foreground"}`}>
                          Data baru ditambah, data sama ditimpa
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setMode("replace")}
                      className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border-2 ${
                        mode === "replace"
                          ? "bg-red-50 border-red-400 text-red-700 shadow-sm"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        mode === "replace" ? "bg-red-500" : "bg-muted"
                      }`}>
                        <Trash2 className="w-3 h-3 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold">Ganti Semua</div>
                        <div className={`text-[10px] ${mode === "replace" ? "text-red-600" : "text-muted-foreground"}`}>
                          Hapus semua data lama, ganti baru
                        </div>
                      </div>
                    </button>
                  </div>
                  {mode === "upsert" && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-emerald-50/80 border border-emerald-200">
                      <AlertCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-emerald-700">
                        Data dengan <strong>Kode Akun</strong> dan <strong>Kategori</strong> yang sama akan <strong>ditimpa</strong> dengan data baru. Data yang berbeda akan ditambahkan.
                      </p>
                    </div>
                  )}
                  {mode === "replace" && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-red-50/80 border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-red-700">
                        <strong>Peringatan:</strong> Semua data lama akan dihapus terlebih dahulu sebelum data baru diimpor. Tindakan ini tidak dapat dibatalkan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Data preview table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/80 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-semibold w-8">#</th>
                        <th className="text-left p-2 font-semibold">Kode Akun</th>
                        {isAutoDetect && <th className="text-left p-2 font-semibold">Jenis</th>}
                        <th className="text-left p-2 font-semibold">Nama Akun</th>
                        <th className="text-left p-2 font-semibold">Kategori</th>
                        <th className="text-right p-2 font-semibold">Anggaran</th>
                        <th className="text-right p-2 font-semibold">Realisasi</th>
                        <th className="text-center p-2 font-semibold w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, idx) => (
                        <motion.tr
                          key={idx}
                          className="border-t hover:bg-muted/30 transition-colors"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                        >
                          <td className="p-2 text-muted-foreground">{idx + 1}</td>
                          <td className="p-2 font-mono">{row.kodeAkun}</td>
                          {isAutoDetect && (
                            <td className="p-2">
                              {row.detectedJenis ? (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${jenisBadgeClasses[row.detectedJenis]}`}>
                                  {jenisLabels[row.detectedJenis]}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600 border-gray-300">
                                  ?
                                </Badge>
                              )}
                            </td>
                          )}
                          <td className="p-2 max-w-[150px] truncate">{row.namaAkun}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[10px] h-5">
                              {row.kategori}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {formatRupiah(row.anggaran)}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {formatRupiah(row.realisasi)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => removeRow(idx)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ====== STEP 3: RESULT ====== */}
          {step === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center space-y-4"
            >
              {result.success ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-emerald-700">
                    Import Berhasil!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {result.message}
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <p className="text-2xl font-bold text-emerald-600">
                        {result.imported}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Data</p>
                    </div>
                    {mode === "upsert" && (result.created > 0 || result.updated > 0) && (
                      <>
                        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                          <p className="text-2xl font-bold text-blue-600">
                            {result.created}
                          </p>
                          <p className="text-xs text-muted-foreground">Data Baru</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                          <p className="text-2xl font-bold text-amber-600">
                            {result.updated}
                          </p>
                          <p className="text-xs text-muted-foreground">Ditimpa</p>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-destructive">
                    Import Gagal
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {result.message}
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Batal
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => { setStep("upload"); setParsedRows([]); setParseErrors([]); setUploadedFileName(""); }}>
                Kembali
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || parsedRows.length === 0}
                className="text-white gap-1.5"
                style={{ backgroundColor: pengaturan.warnaPrimary }}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengimpor...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {parsedRows.length} Data
                  </>
                )}
              </Button>
            </>
          )}
          {step === "result" && (
            <Button onClick={handleClose} className="text-white" style={{ backgroundColor: pengaturan.warnaPrimary }}>
              Selesai
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
