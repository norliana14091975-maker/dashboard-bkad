"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DashboardData,
  formatPersentase,
  safePercentage,
  getRealisasiBadgeClass,
} from "./types";
import RupiahCell from "./RupiahCell";
import { usePengaturan } from "@/context/PengaturanContext";
import { motion } from "framer-motion";
import {
  Calendar,
  Printer,
  Download,
  Building2,
  Search,
  ArrowUpDown,
  Eye,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Banknote,
} from "lucide-react";

type RealisasiSkpdViewProps = {
  data: DashboardData;
};

type SortField = "kodeSkpd" | "namaSkpd" | "anggaran" | "realisasi" | "persentase";
type SortDirection = "asc" | "desc";

type OpdDetailData = {
  opd: {
    id: string;
    kodeOpd: string;
    namaOpd: string;
    kepalaOpd: string | null;
  };
  pendapatan: Array<{
    id: string;
    kodeAkun: string;
    namaAkun: string;
    kategori: string;
    anggaran: number;
    realisasi: number;
    persentase: number;
    tanggalUpdate: string;
  }>;
  belanja: Array<{
    id: string;
    kodeAkun: string;
    namaAkun: string;
    kategori: string;
    anggaran: number;
    realisasi: number;
    persentase: number;
    tanggalUpdate: string;
  }>;
  pembiayaan: Array<{
    id: string;
    kodeAkun: string;
    namaAkun: string;
    kategori: string;
    anggaran: number;
    realisasi: number;
    persentase: number;
    tanggalUpdate: string;
  }>;
  ringkasan: {
    pendapatan: { anggaran: number; realisasi: number; persentase: number; jumlah: number };
    belanja: { anggaran: number; realisasi: number; persentase: number; jumlah: number };
    pembiayaan: { anggaran: number; realisasi: number; persentase: number; jumlah: number };
    totalAnggaran: number;
    totalRealisasi: number;
  };
};

export default function RealisasiSkpdView({ data }: RealisasiSkpdViewProps) {
  const { pengaturan } = usePengaturan();
  const [tanggalFilter, setTanggalFilter] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("kodeSkpd");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Dialog state
  const [selectedSkpd, setSelectedSkpd] = useState<{
    kodeSkpd: string;
    namaSkpd: string;
  } | null>(null);
  const [detailData, setDetailData] = useState<OpdDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"pendapatan" | "belanja" | "pembiayaan">("pendapatan");

  const items = data.realisasiSkpd;

  // Filter by search
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.kodeSkpd.toLowerCase().includes(term) ||
        item.namaSkpd.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // Sort
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [filteredItems, sortField, sortDir]);

  // Group SKPDs by their kode prefix
  const groupedData = useMemo(() => {
    const groups: Record<string, typeof items> = {};
    sortedItems.forEach((item) => {
      const prefix = item.kodeSkpd.split(".")[0];
      const groupLabels: Record<string, string> = {
        "1": "Sekretariat & Inspektorat",
        "2": "Dinas",
        "3": "Badan",
        "4": "Kecamatan",
      };
      const groupKey = groupLabels[prefix] || `Grup ${prefix}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [sortedItems]);

  // Totals from SKPD list
  const totalAnggaran = filteredItems.reduce((s, i) => s + i.anggaran, 0);
  const totalRealisasi = filteredItems.reduce((s, i) => s + i.realisasi, 0);
  const totalPersentase = safePercentage(totalRealisasi, totalAnggaran);

  // ─── Category Breakdowns (sesuai Permendagri 90/2019) ─────────────────────
  // Pendapatan Daerah = PAD + Transfer + Lain-lain Pendapatan yang Sah
  const padList = data.pendapatan.filter((p) => p.kategori === "PAD");
  const totalPADAnggaran = padList.reduce((s, p) => s + p.anggaran, 0);
  const totalPADRealisasi = padList.reduce((s, p) => s + p.realisasi, 0);
  const persentasePAD = safePercentage(totalPADRealisasi, totalPADAnggaran);

  const totalPendapatanAnggaran = data.pendapatan.reduce((s, p) => s + p.anggaran, 0);
  const totalPendapatanRealisasi = data.pendapatan.reduce((s, p) => s + p.realisasi, 0);
  const persentasePendapatan = safePercentage(totalPendapatanRealisasi, totalPendapatanAnggaran);

  const totalBelanjaAnggaran = data.belanja.reduce((s, b) => s + b.anggaran, 0);
  const totalBelanjaRealisasi = data.belanja.reduce((s, b) => s + b.realisasi, 0);
  const persentaseBelanja = safePercentage(totalBelanjaRealisasi, totalBelanjaAnggaran);

  const totalPembiayaanAnggaran = data.pembiayaan.reduce((s, p) => s + p.anggaran, 0);
  const totalPembiayaanRealisasi = data.pembiayaan.reduce((s, p) => s + p.realisasi, 0);
  const persentasePembiayaan = safePercentage(totalPembiayaanRealisasi, totalPembiayaanAnggaran);

  // Get latest update date from data
  const latestUpdateDate = items.length > 0
    ? items.reduce((latest, item) => {
        const d = new Date(item.tanggalUpdate);
        return d > latest ? d : latest;
      }, new Date(0))
    : null;

  // Format date in Indonesian
  const formatTanggalID = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return (
      <ArrowUpDown
        className="w-3 h-3"
        style={{ color: pengaturan.warnaAccent }}
      />
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Fetch OPD detail when a row is clicked
  const handleRowClick = async (kodeSkpd: string, namaSkpd: string) => {
    setSelectedSkpd({ kodeSkpd, namaSkpd });
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    setActiveDetailTab("pendapatan");

    try {
      const res = await fetch(
        `/api/admin/opd-detail?kodeSkpd=${encodeURIComponent(kodeSkpd)}&tahun=${data.tahun}`
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal memuat data OPD");
      }
      const result = await res.json();
      setDetailData(result);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDialog = () => {
    setSelectedSkpd(null);
    setDetailData(null);
    setDetailError(null);
  };

  // Tab config for detail dialog
  const detailTabs = [
    { key: "pendapatan" as const, label: "Pendapatan", icon: TrendingUp, color: "emerald" },
    { key: "belanja" as const, label: "Belanja", icon: CreditCard, color: "red" },
    { key: "pembiayaan" as const, label: "Pembiayaan", icon: Banknote, color: "amber" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="space-y-4"
    >
      {/* Formal Report Card */}
      <Card className="shadow-lg border-0 overflow-hidden print:shadow-none print:border print:border-gray-300">
        {/* Report Header */}
        <div
          className="text-white px-6 py-5 print:text-black print:bg-white print:border-b-2 print:border-black"
          style={{
            background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
          }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-2">
              <h1 className="text-xl lg:text-2xl font-bold tracking-wide uppercase">
                REALISASI ANGGARAN PER-SKPD
              </h1>
              <p className="text-sm lg:text-base text-emerald-100 print:text-gray-600 font-medium">
                {pengaturan.namaPemerintah}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-x-6 gap-y-1 mt-2 text-sm text-emerald-100 print:text-gray-600">
              <span className="font-semibold">
                TAHUN ANGGARAN {data.tahun}
              </span>
              <span>•</span>
              <span>
                SAMPAI DENGAN:{" "}
                {tanggalFilter
                  ? formatTanggalID(tanggalFilter)
                  : latestUpdateDate
                    ? formatTanggalID(latestUpdateDate.toISOString())
                    : "-"}
              </span>
            </div>
            <p className="text-[11px] mt-2 text-emerald-200/70 print:text-gray-400">
              Klik pada baris OPD untuk melihat rincian Pendapatan, Belanja & Pembiayaan
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 lg:px-6 py-3 bg-muted/30 border-b print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Tanggal</span>
              <Input
                type="date"
                value={tanggalFilter}
                onChange={(e) => setTanggalFilter(e.target.value)}
                className="w-auto h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari SKPD/OPD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-auto h-8 text-sm min-w-[200px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              Ekspor
            </Button>
          </div>
        </div>

        {/* Summary Cards — Breakdown sesuai Permendagri 90/2019 */}
        <div className="px-4 lg:px-6 py-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: pengaturan.warnaPrimary }}
            >
              Ringkasan APBD per Kategori
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {filteredItems.length} OPD · TA {data.tahun}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            {/* Total Pendapatan (PAD) */}
            <div className="bg-teal-50 dark:bg-teal-950/20 rounded-lg p-3 border border-teal-200 dark:border-teal-800 print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wallet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <p className="text-[10px] lg:text-xs text-teal-600 dark:text-teal-400 print:text-gray-500 font-semibold uppercase tracking-wide">
                  Pendapatan (PAD)
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-muted-foreground uppercase">Anggaran</span>
                  <p className="text-xs lg:text-sm font-bold text-teal-800 dark:text-teal-200 print:text-black">
                    <RupiahCell value={totalPADAnggaran} />
                  </p>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-muted-foreground uppercase">Realisasi</span>
                  <p className="text-xs lg:text-sm font-bold text-teal-700 dark:text-teal-300">
                    <RupiahCell value={totalPADRealisasi} />
                  </p>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex-1 h-1.5 bg-teal-200 dark:bg-teal-800 rounded-full overflow-hidden mr-2">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(persentasePAD, 100)}%` }}
                    />
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(persentasePAD)}`}>
                    {formatPersentase(persentasePAD)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Total Pendapatan Daerah */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800 print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-[10px] lg:text-xs text-emerald-600 dark:text-emerald-400 print:text-gray-500 font-semibold uppercase tracking-wide">
                  Total Pendapatan
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-muted-foreground uppercase">Anggaran</span>
                  <p className="text-xs lg:text-sm font-bold text-emerald-800 dark:text-emerald-200 print:text-black">
                    <RupiahCell value={totalPendapatanAnggaran} />
                  </p>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-muted-foreground uppercase">Realisasi</span>
                  <p className="text-xs lg:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    <RupiahCell value={totalPendapatanRealisasi} />
                  </p>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex-1 h-1.5 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden mr-2">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(persentasePendapatan, 100)}%` }}
                    />
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(persentasePendapatan)}`}>
                    {formatPersentase(persentasePendapatan)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Total Belanja */}
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-800 print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <p className="text-[10px] lg:text-xs text-red-600 dark:text-red-400 print:text-gray-500 font-semibold uppercase tracking-wide">
                  Total Belanja
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-muted-foreground uppercase">Anggaran</span>
                  <p className="text-xs lg:text-sm font-bold text-red-800 dark:text-red-200 print:text-black">
                    <RupiahCell value={totalBelanjaAnggaran} />
                  </p>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-muted-foreground uppercase">Realisasi</span>
                  <p className="text-xs lg:text-sm font-bold text-red-700 dark:text-red-300">
                    <RupiahCell value={totalBelanjaRealisasi} />
                  </p>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex-1 h-1.5 bg-red-200 dark:bg-red-800 rounded-full overflow-hidden mr-2">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(persentaseBelanja, 100)}%` }}
                    />
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(persentaseBelanja)}`}>
                    {formatPersentase(persentaseBelanja)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Total Pembiayaan */}
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800 print:bg-gray-50 print:border-gray-200">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Banknote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <p className="text-[10px] lg:text-xs text-amber-600 dark:text-amber-400 print:text-gray-500 font-semibold uppercase tracking-wide">
                  Total Pembiayaan
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-muted-foreground uppercase">Anggaran</span>
                  <p className="text-xs lg:text-sm font-bold text-amber-800 dark:text-amber-200 print:text-black">
                    <RupiahCell value={totalPembiayaanAnggaran} />
                  </p>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] text-muted-foreground uppercase">Realisasi</span>
                  <p className="text-xs lg:text-sm font-bold text-amber-700 dark:text-amber-300">
                    <RupiahCell value={totalPembiayaanRealisasi} />
                  </p>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex-1 h-1.5 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden mr-2">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(persentasePembiayaan, 100)}%` }}
                    />
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(persentasePembiayaan)}`}>
                    {formatPersentase(persentasePembiayaan)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="px-2 lg:px-4 pb-4">
          {Object.entries(groupedData).map(([groupLabel, groupItems]) => {
            const subAnggaran = groupItems.reduce((s, i) => s + i.anggaran, 0);
            const subRealisasi = groupItems.reduce((s, i) => s + i.realisasi, 0);
            const subPersentase = safePercentage(subRealisasi, subAnggaran);

            return (
              <div key={groupLabel} className="mb-4">
                {/* Group Header */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-t-lg bg-muted/70 border border-b-0 font-bold text-sm uppercase tracking-wide print:rounded-none">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {groupLabel}
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {groupItems.length} OPD
                    </Badge>
                  </div>
                  <span className="text-xs font-mono hidden sm:inline">
                    {formatPersentase(subPersentase)}
                  </span>
                </div>

                {/* Table */}
                <div className="border-x border-b rounded-b-lg overflow-hidden print:rounded-none">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/50">
                        <TableHead className="text-[11px] font-semibold w-[40px] text-center">
                          No
                        </TableHead>
                        <TableHead
                          className="text-[11px] font-semibold w-[100px] cursor-pointer select-none"
                          onClick={() => handleSort("kodeSkpd")}
                        >
                          <span className="flex items-center gap-1">
                            Kode SKPD <SortIcon field="kodeSkpd" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-[11px] font-semibold cursor-pointer select-none"
                          onClick={() => handleSort("namaSkpd")}
                        >
                          <span className="flex items-center gap-1">
                            Nama SKPD/OPD <SortIcon field="namaSkpd" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-[11px] font-semibold text-right w-[150px] cursor-pointer select-none"
                          onClick={() => handleSort("anggaran")}
                        >
                          <span className="flex items-center justify-end gap-1">
                            Anggaran (Rp) <SortIcon field="anggaran" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-[11px] font-semibold text-right w-[150px] cursor-pointer select-none"
                          onClick={() => handleSort("realisasi")}
                        >
                          <span className="flex items-center justify-end gap-1">
                            Realisasi (Rp) <SortIcon field="realisasi" />
                          </span>
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-right w-[120px]">
                          Selisih (Rp)
                        </TableHead>
                        <TableHead
                          className="text-[11px] font-semibold text-center w-[100px] cursor-pointer select-none"
                          onClick={() => handleSort("persentase")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            Persentase <SortIcon field="persentase" />
                          </span>
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-center w-[50px] print:hidden">
                          Detail
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupItems.map((item, idx) => {
                        const selisih = item.anggaran - item.realisasi;
                        const isOverBudget = selisih < 0;
                        const isSelected = selectedSkpd?.kodeSkpd === item.kodeSkpd;

                        return (
                          <TableRow
                            key={item.id}
                            className={`group transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 hover:bg-primary/15"
                                : "hover:bg-muted/40"
                            }`}
                            onClick={() => handleRowClick(item.kodeSkpd, item.namaSkpd)}
                          >
                            <TableCell className="text-[11px] text-muted-foreground text-center">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-[11px] font-mono font-medium">
                              {item.kodeSkpd}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              <div className="flex items-center gap-2">
                                {item.namaSkpd}
                                <Eye className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
                              </div>
                            </TableCell>
                            <TableCell className="text-[11px] text-right">
                              <RupiahCell value={item.anggaran} />
                            </TableCell>
                            <TableCell className="text-[11px] text-right font-medium">
                              <RupiahCell value={item.realisasi} />
                            </TableCell>
                            <TableCell
                              className={`text-[11px] text-right ${isOverBudget ? "text-red-600" : "text-emerald-600"}`}
                            >
                              <RupiahCell value={Math.abs(selisih)} prefix={isOverBudget ? "+" : ""} className={isOverBudget ? "text-red-600" : "text-emerald-600"} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <div className="hidden lg:flex flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[50px]">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      item.persentase >= 90
                                    ? "bg-emerald-500"
                                    : item.persentase >= 75
                                      ? "bg-amber-500"
                                      : item.persentase >= 50
                                        ? "bg-orange-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{ width: `${Math.min(item.persentase, 100)}%` }}
                                  />
                                </div>
                                <Badge
                                  className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(item.persentase)}`}
                                >
                                  {formatPersentase(item.persentase)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center print:hidden">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(item.kodeSkpd, item.namaSkpd);
                                }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Subtotal */}
                  <div className="px-4 py-3 bg-muted/30 border-t-2 flex items-center justify-between">
                    <span className="text-sm font-bold uppercase text-muted-foreground">
                      Subtotal {groupLabel}
                    </span>
                    <div className="flex items-center gap-4 lg:gap-6">
                      <div className="text-xs font-bold min-w-[180px] flex justify-end">
                        <RupiahCell value={subAnggaran} />
                      </div>
                      <div className="text-xs font-bold min-w-[180px] flex justify-end">
                        <RupiahCell value={subRealisasi} />
                      </div>
                      <div
                        className={`text-xs font-bold min-w-[150px] flex justify-end ${
                          subAnggaran - subRealisasi < 0
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        <RupiahCell value={Math.abs(subAnggaran - subRealisasi)} prefix={subAnggaran - subRealisasi < 0 ? "+" : ""} className={subAnggaran - subRealisasi < 0 ? "text-red-600" : "text-emerald-600"} />
                      </div>
                      <Badge
                        className={`text-[11px] px-2 py-0.5 h-6 border font-bold ${getRealisasiBadgeClass(subPersentase)}`}
                      >
                        {formatPersentase(subPersentase)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grand Total — Breakdown per Kategori sesuai Permendagri 90/2019 */}
          <div
            className="mt-4 rounded-lg border-2 overflow-hidden print:rounded-none"
            style={{
              borderColor: pengaturan.warnaPrimary,
              backgroundColor: `${pengaturan.warnaPrimary}08`,
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b"
              style={{
                backgroundColor: `${pengaturan.warnaPrimary}15`,
                borderColor: `${pengaturan.warnaPrimary}30`,
              }}
            >
              <h3
                className="text-sm lg:text-base font-bold uppercase tracking-wide"
                style={{ color: pengaturan.warnaPrimary }}
              >
                Total Realisasi APBD per Kategori
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Sesuai Permendagri 90/2019 — Pendapatan Daerah, Belanja Daerah & Pembiayaan
              </p>
            </div>

            {/* Breakdown Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2" style={{ borderColor: `${pengaturan.warnaPrimary}30` }}>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide pl-4">
                      Kategori
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-right">Anggaran (Rp)</TableHead>
                    <TableHead className="text-[11px] font-bold text-right">Realisasi (Rp)</TableHead>
                    <TableHead className="text-[11px] font-bold text-right">Selisih (Rp)</TableHead>
                    <TableHead className="text-[11px] font-bold text-center pr-4">Persentase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Row 1: Pendapatan (PAD) */}
                  <TableRow className="hover:bg-teal-50/50 dark:hover:bg-teal-950/10">
                    <TableCell className="text-xs font-semibold pl-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-500" />
                        Pendapatan (PAD)
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      <RupiahCell value={totalPADAnggaran} />
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-teal-700 dark:text-teal-300">
                      <RupiahCell value={totalPADRealisasi} className="text-teal-700 dark:text-teal-300" />
                    </TableCell>
                    <TableCell className={`text-xs text-right font-semibold ${totalPADAnggaran - totalPADRealisasi < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      <RupiahCell value={Math.abs(totalPADAnggaran - totalPADRealisasi)} prefix={totalPADAnggaran - totalPADRealisasi < 0 ? "+" : ""} className={totalPADAnggaran - totalPADRealisasi < 0 ? "text-red-600" : "text-emerald-600"} />
                    </TableCell>
                    <TableCell className="text-center pr-4">
                      <Badge className={`text-[10px] px-2 py-0.5 h-5 border ${getRealisasiBadgeClass(persentasePAD)}`}>
                        {formatPersentase(persentasePAD)}
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Row 2: Total Pendapatan */}
                  <TableRow className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10">
                    <TableCell className="text-xs font-semibold pl-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Total Pendapatan Daerah
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      <RupiahCell value={totalPendapatanAnggaran} />
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-emerald-700 dark:text-emerald-300">
                      <RupiahCell value={totalPendapatanRealisasi} className="text-emerald-700 dark:text-emerald-300" />
                    </TableCell>
                    <TableCell className={`text-xs text-right font-semibold ${totalPendapatanAnggaran - totalPendapatanRealisasi < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      <RupiahCell value={Math.abs(totalPendapatanAnggaran - totalPendapatanRealisasi)} prefix={totalPendapatanAnggaran - totalPendapatanRealisasi < 0 ? "+" : ""} className={totalPendapatanAnggaran - totalPendapatanRealisasi < 0 ? "text-red-600" : "text-emerald-600"} />
                    </TableCell>
                    <TableCell className="text-center pr-4">
                      <Badge className={`text-[10px] px-2 py-0.5 h-5 border ${getRealisasiBadgeClass(persentasePendapatan)}`}>
                        {formatPersentase(persentasePendapatan)}
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Row 3: Total Belanja */}
                  <TableRow className="hover:bg-red-50/50 dark:hover:bg-red-950/10">
                    <TableCell className="text-xs font-semibold pl-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Total Belanja Daerah
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      <RupiahCell value={totalBelanjaAnggaran} />
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-red-700 dark:text-red-300">
                      <RupiahCell value={totalBelanjaRealisasi} className="text-red-700 dark:text-red-300" />
                    </TableCell>
                    <TableCell className={`text-xs text-right font-semibold ${totalBelanjaAnggaran - totalBelanjaRealisasi < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      <RupiahCell value={Math.abs(totalBelanjaAnggaran - totalBelanjaRealisasi)} prefix={totalBelanjaAnggaran - totalBelanjaRealisasi < 0 ? "+" : ""} className={totalBelanjaAnggaran - totalBelanjaRealisasi < 0 ? "text-red-600" : "text-emerald-600"} />
                    </TableCell>
                    <TableCell className="text-center pr-4">
                      <Badge className={`text-[10px] px-2 py-0.5 h-5 border ${getRealisasiBadgeClass(persentaseBelanja)}`}>
                        {formatPersentase(persentaseBelanja)}
                      </Badge>
                    </TableCell>
                  </TableRow>

                  {/* Row 4: Total Pembiayaan */}
                  <TableRow className="hover:bg-amber-50/50 dark:hover:bg-amber-950/10">
                    <TableCell className="text-xs font-semibold pl-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        Total Pembiayaan
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      <RupiahCell value={totalPembiayaanAnggaran} />
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-amber-700 dark:text-amber-300">
                      <RupiahCell value={totalPembiayaanRealisasi} className="text-amber-700 dark:text-amber-300" />
                    </TableCell>
                    <TableCell className={`text-xs text-right font-semibold ${totalPembiayaanAnggaran - totalPembiayaanRealisasi < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      <RupiahCell value={Math.abs(totalPembiayaanAnggaran - totalPembiayaanRealisasi)} prefix={totalPembiayaanAnggaran - totalPembiayaanRealisasi < 0 ? "+" : ""} className={totalPembiayaanAnggaran - totalPembiayaanRealisasi < 0 ? "text-red-600" : "text-emerald-600"} />
                    </TableCell>
                    <TableCell className="text-center pr-4">
                      <Badge className={`text-[10px] px-2 py-0.5 h-5 border ${getRealisasiBadgeClass(persentasePembiayaan)}`}>
                        {formatPersentase(persentasePembiayaan)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Footer Summary */}
            <div
              className="px-4 py-3 border-t flex items-center justify-between flex-wrap gap-2"
              style={{ borderColor: `${pengaturan.warnaPrimary}30` }}
            >
              <span
                className="text-[11px] uppercase tracking-wide font-semibold"
                style={{ color: pengaturan.warnaPrimary }}
              >
                Jumlah OPD Tercatat: {filteredItems.length}
              </span>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-teal-500" /> PAD
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Pendapatan
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" /> Belanja
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" /> Pembiayaan
                </span>
              </div>
            </div>
          </div>

          {/* Top 5 OPD by realisasi */}
          <div className="mt-6">
            <h3
              className="text-sm font-bold uppercase tracking-wide mb-3"
              style={{ color: pengaturan.warnaPrimary }}
            >
              Top 5 OPD — Realisasi Tertinggi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[...filteredItems]
                .sort((a, b) => b.persentase - a.persentase)
                .slice(0, 5)
                .map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-lg border p-3 hover:shadow-md transition-shadow cursor-pointer"
                    style={{
                      borderColor: `${pengaturan.warnaPrimary}30`,
                      backgroundColor: `${pengaturan.warnaPrimary}05`,
                    }}
                    onClick={() => handleRowClick(item.kodeSkpd, item.namaSkpd)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: pengaturan.warnaPrimary }}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">
                          {item.namaSkpd}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.kodeSkpd}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Anggaran</span>
                        <RupiahCell value={item.anggaran} />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Realisasi</span>
                        <span className="font-medium text-blue-700">
                          <RupiahCell value={item.realisasi} className="text-blue-700" />
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.persentase >= 90
                              ? "bg-emerald-500"
                              : item.persentase >= 75
                                ? "bg-amber-500"
                                : item.persentase >= 50
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(item.persentase, 100)}%` }}
                        />
                      </div>
                      <div className="text-center">
                        <Badge
                          className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(item.persentase)}`}
                        >
                          {formatPersentase(item.persentase)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Bottom 5 OPD by realisasi */}
          <div className="mt-6">
            <h3
              className="text-sm font-bold uppercase tracking-wide mb-3"
              style={{ color: "#dc2626" }}
            >
              Top 5 OPD — Realisasi Terendah
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[...filteredItems]
                .sort((a, b) => a.persentase - b.persentase)
                .slice(0, 5)
                .map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-lg border p-3 hover:shadow-md transition-shadow border-red-200 bg-red-50/30 dark:bg-red-950/10 dark:border-red-800 cursor-pointer"
                    onClick={() => handleRowClick(item.kodeSkpd, item.namaSkpd)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-red-600">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">
                          {item.namaSkpd}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.kodeSkpd}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Anggaran</span>
                        <RupiahCell value={item.anggaran} />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Realisasi</span>
                        <span className="font-medium text-blue-700">
                          <RupiahCell value={item.realisasi} className="text-blue-700" />
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.persentase >= 90
                              ? "bg-emerald-500"
                              : item.persentase >= 75
                                ? "bg-amber-500"
                                : item.persentase >= 50
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(item.persentase, 100)}%` }}
                        />
                      </div>
                      <div className="text-center">
                        <Badge
                          className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(item.persentase)}`}
                        >
                          {formatPersentase(item.persentase)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/20 text-center print:bg-white">
          <p className="text-[10px] text-muted-foreground">
            Data terakhir diperbarui:{" "}
            {latestUpdateDate
              ? latestUpdateDate.toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </p>
        </div>
      </Card>

      {/* ========== OPD Detail Dialog — Extra Large ========== */}
      <Dialog open={!!selectedSkpd} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent
          className="sm:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] 2xl:max-w-[80vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0"
        >
          {/* Dialog Header — Gradient banner */}
          {selectedSkpd && (
            <DialogHeader className="px-8 py-5 border-b-0 shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold tracking-wide">
                      {selectedSkpd.namaSkpd}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-white/80 mt-0.5">
                      Kode OPD: {selectedSkpd.kodeSkpd} — Tahun Anggaran {data.tahun}
                    </DialogDescription>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <Badge className="bg-white/20 text-white border-white/30 text-xs px-3 py-1 h-7 backdrop-blur-sm">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    TA {data.tahun}
                  </Badge>
                </div>
              </div>
            </DialogHeader>
          )}

          {/* Loading state */}
          {detailLoading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-muted-foreground/20" />
                  <Loader2 className="w-16 h-16 animate-spin text-primary absolute inset-0" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-muted-foreground">Memuat Rincian Data OPD</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Mengambil data Pendapatan, Belanja & Pembiayaan...</p>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {detailError && !detailLoading && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-sm text-destructive font-medium">{detailError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedSkpd && handleRowClick(selectedSkpd.kodeSkpd, selectedSkpd.namaSkpd)}
                >
                  Coba Lagi
                </Button>
              </div>
            </div>
          )}

          {/* Detail content */}
          {detailData && !detailLoading && !detailError && (
            <div className="flex-1 overflow-y-auto">
              {/* Ringkasan Cards — Larger for XL modal */}
              <div className="px-8 py-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/20 border-b">
                {/* Pendapatan */}
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
                      Pendapatan Daerah
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-emerald-500 uppercase">Anggaran</p>
                      <p className="text-base font-bold text-emerald-800 dark:text-emerald-200">
                        <RupiahCell value={detailData.ringkasan.pendapatan.anggaran} />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-500 uppercase">Realisasi</p>
                      <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                        <RupiahCell value={detailData.ringkasan.pendapatan.realisasi} />
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex-1 h-2 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden mr-3">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(detailData.ringkasan.pendapatan.persentase, 100)}%` }}
                        />
                      </div>
                      <Badge className={`text-xs px-2.5 py-0.5 h-6 border font-bold ${getRealisasiBadgeClass(detailData.ringkasan.pendapatan.persentase)}`}>
                        {formatPersentase(detailData.ringkasan.pendapatan.persentase)}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {detailData.ringkasan.pendapatan.jumlah} akun
                    </p>
                  </div>
                </div>
                {/* Belanja */}
                <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-5 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-900/50">
                      <CreditCard className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-xs text-red-600 font-bold uppercase tracking-wider">
                      Belanja Daerah
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-red-500 uppercase">Anggaran</p>
                      <p className="text-base font-bold text-red-800 dark:text-red-200">
                        <RupiahCell value={detailData.ringkasan.belanja.anggaran} />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-red-500 uppercase">Realisasi</p>
                      <p className="text-base font-bold text-red-700 dark:text-red-300">
                        <RupiahCell value={detailData.ringkasan.belanja.realisasi} />
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex-1 h-2 bg-red-200 dark:bg-red-800 rounded-full overflow-hidden mr-3">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(detailData.ringkasan.belanja.persentase, 100)}%` }}
                        />
                      </div>
                      <Badge className={`text-xs px-2.5 py-0.5 h-6 border font-bold ${getRealisasiBadgeClass(detailData.ringkasan.belanja.persentase)}`}>
                        {formatPersentase(detailData.ringkasan.belanja.persentase)}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {detailData.ringkasan.belanja.jumlah} akun
                    </p>
                  </div>
                </div>
                {/* Pembiayaan */}
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/50">
                      <Banknote className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">
                      Pembiayaan
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-amber-500 uppercase">Anggaran</p>
                      <p className="text-base font-bold text-amber-800 dark:text-amber-200">
                        <RupiahCell value={detailData.ringkasan.pembiayaan.anggaran} />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-500 uppercase">Realisasi</p>
                      <p className="text-base font-bold text-amber-700 dark:text-amber-300">
                        <RupiahCell value={detailData.ringkasan.pembiayaan.realisasi} />
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex-1 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden mr-3">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(detailData.ringkasan.pembiayaan.persentase, 100)}%` }}
                        />
                      </div>
                      <Badge className={`text-xs px-2.5 py-0.5 h-6 border font-bold ${getRealisasiBadgeClass(detailData.ringkasan.pembiayaan.persentase)}`}>
                        {formatPersentase(detailData.ringkasan.pembiayaan.persentase)}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {detailData.ringkasan.pembiayaan.jumlah} akun
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs — Larger for XL modal */}
              <div className="px-8 pt-4 flex gap-2 border-b">
                {detailTabs.map((tab) => {
                  const Icon = tab.icon;
                  const count = detailData[tab.key].length;
                  const isActive = activeDetailTab === tab.key;
                  const colorClasses = {
                    pendapatan: isActive
                      ? "text-emerald-700 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm"
                      : "text-muted-foreground border-transparent hover:text-emerald-600 hover:bg-emerald-50/50",
                    belanja: isActive
                      ? "text-red-700 border-red-600 bg-red-50 dark:bg-red-950/20 shadow-sm"
                      : "text-muted-foreground border-transparent hover:text-red-600 hover:bg-red-50/50",
                    pembiayaan: isActive
                      ? "text-amber-700 border-amber-600 bg-amber-50 dark:bg-amber-950/20 shadow-sm"
                      : "text-muted-foreground border-transparent hover:text-amber-600 hover:bg-amber-50/50",
                  };

                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveDetailTab(tab.key)}
                      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 rounded-t-lg transition-all ${colorClasses[tab.key]}`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                      <span className="text-[11px] bg-muted/80 rounded-full px-2 py-0.5 font-mono">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tab content table — Larger for XL modal */}
              <div className="px-8 pb-6 pt-3">
                {(() => {
                  const tabItems = detailData[activeDetailTab];
                  if (tabItems.length === 0) {
                    return (
                      <div className="text-center py-16 text-muted-foreground">
                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-base font-medium">Belum Ada Data {activeDetailTab === "pendapatan" ? "Pendapatan" : activeDetailTab === "belanja" ? "Belanja" : "Pembiayaan"}</p>
                        <p className="text-xs mt-1">Data akan muncul setelah OPD menginput rincian</p>
                      </div>
                    );
                  }

                  const tabTotalAnggaran = tabItems.reduce((s, i) => s + i.anggaran, 0);
                  const tabTotalRealisasi = tabItems.reduce((s, i) => s + i.realisasi, 0);
                  const tabTotalPersentase = safePercentage(tabTotalRealisasi, tabTotalAnggaran);

                  const colorMap = {
                    pendapatan: {
                      headerBg: "bg-emerald-100 dark:bg-emerald-900/30",
                      headerText: "text-emerald-800 dark:text-emerald-200",
                      border: "border-emerald-300 dark:border-emerald-700",
                      bg: "bg-emerald-50 dark:bg-emerald-950/10",
                      accent: "#10b981",
                    },
                    belanja: {
                      headerBg: "bg-red-100 dark:bg-red-900/30",
                      headerText: "text-red-800 dark:text-red-200",
                      border: "border-red-300 dark:border-red-700",
                      bg: "bg-red-50 dark:bg-red-950/10",
                      accent: "#ef4444",
                    },
                    pembiayaan: {
                      headerBg: "bg-amber-100 dark:bg-amber-900/30",
                      headerText: "text-amber-800 dark:text-amber-200",
                      border: "border-amber-300 dark:border-amber-700",
                      bg: "bg-amber-50 dark:bg-amber-950/10",
                      accent: "#f59e0b",
                    },
                  };
                  const colors = colorMap[activeDetailTab];

                  return (
                    <div className={`border-2 ${colors.border} rounded-xl overflow-hidden`}>
                      <Table>
                        <TableHeader>
                          <TableRow className={`hover:bg-transparent ${colors.headerBg}`}>
                            <TableHead className="text-xs font-bold w-[50px] text-center">No</TableHead>
                            <TableHead className="text-xs font-bold w-[120px]">Kode Akun</TableHead>
                            <TableHead className="text-xs font-bold min-w-[200px]">Nama Akun</TableHead>
                            <TableHead className="text-xs font-bold text-right w-[180px]">Anggaran (Rp)</TableHead>
                            <TableHead className="text-xs font-bold text-right w-[180px]">Realisasi (Rp)</TableHead>
                            <TableHead className="text-xs font-bold text-right w-[160px]">Selisih (Rp)</TableHead>
                            <TableHead className="text-xs font-bold text-center w-[130px]">Persentase</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tabItems.map((item, idx) => {
                            const selisih = item.anggaran - item.realisasi;
                            const isOver = selisih < 0;
                            return (
                              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-xs text-muted-foreground text-center py-3">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="text-xs font-mono font-semibold py-3">
                                  {item.kodeAkun}
                                </TableCell>
                                <TableCell className="text-sm font-medium py-3 max-w-[250px]">
                                  {item.namaAkun}
                                </TableCell>
                                <TableCell className="text-xs text-right py-3">
                                  <RupiahCell value={item.anggaran} />
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold py-3">
                                  <RupiahCell value={item.realisasi} />
                                </TableCell>
                                <TableCell className={`text-xs text-right font-semibold py-3 ${isOver ? "text-red-600" : "text-emerald-600"}`}>
                                  <RupiahCell value={Math.abs(selisih)} prefix={isOver ? "+" : ""} className={isOver ? "text-red-600" : "text-emerald-600"} />
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="hidden md:flex flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[60px]">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          item.persentase >= 90
                                            ? "bg-emerald-500"
                                            : item.persentase >= 75
                                              ? "bg-amber-500"
                                              : item.persentase >= 50
                                                ? "bg-orange-500"
                                                : "bg-red-500"
                                        }`}
                                        style={{ width: `${Math.min(item.persentase, 100)}%` }}
                                      />
                                    </div>
                                    <Badge className={`text-[11px] px-2 py-0 h-5 border ${getRealisasiBadgeClass(item.persentase)}`}>
                                      {formatPersentase(item.persentase)}
                                    </Badge>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {/* Subtotal — Larger */}
                      <div className={`px-5 py-4 ${colors.bg} border-t-2 ${colors.border} flex items-center justify-between`}>
                        <span className={`text-sm font-bold ${colors.headerText} uppercase tracking-wide`}>
                          Subtotal {activeDetailTab === "pendapatan" ? "Pendapatan" : activeDetailTab === "belanja" ? "Belanja" : "Pembiayaan"}
                        </span>
                        <div className="flex items-center gap-4">
                          <div className="text-xs font-bold min-w-[200px] flex justify-end">
                            <RupiahCell value={tabTotalAnggaran} />
                          </div>
                          <div className="text-xs font-bold min-w-[200px] flex justify-end">
                            <RupiahCell value={tabTotalRealisasi} />
                          </div>
                          <div className={`text-xs font-bold min-w-[170px] flex justify-end ${tabTotalAnggaran - tabTotalRealisasi < 0 ? "text-red-600" : "text-emerald-600"}`}>
                            <RupiahCell value={Math.abs(tabTotalAnggaran - tabTotalRealisasi)} prefix={tabTotalAnggaran - tabTotalRealisasi < 0 ? "+" : ""} className={tabTotalAnggaran - tabTotalRealisasi < 0 ? "text-red-600" : "text-emerald-600"} />
                          </div>
                          <Badge className={`text-xs px-3 py-0.5 h-6 border font-bold ${getRealisasiBadgeClass(tabTotalPersentase)}`}>
                            {formatPersentase(tabTotalPersentase)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Grand Total Footer — Breakdown sesuai Permendagri 90/2019 */}
              {detailData && (
                <div
                  className="px-8 py-4 border-t-2"
                  style={{
                    borderColor: pengaturan.warnaPrimary,
                    backgroundColor: `${pengaturan.warnaPrimary}08`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-sm uppercase tracking-wide font-bold"
                      style={{ color: pengaturan.warnaPrimary }}
                    >
                      Total Keseluruhan OPD
                    </span>
                    <Badge
                      className="text-xs px-2 py-0.5 h-6 border font-bold"
                      style={{
                        backgroundColor: `${pengaturan.warnaPrimary}15`,
                        color: pengaturan.warnaPrimary,
                        borderColor: pengaturan.warnaPrimary,
                      }}
                    >
                      {detailData.ringkasan.pendapatan.jumlah +
                        detailData.ringkasan.belanja.jumlah +
                        detailData.ringkasan.pembiayaan.jumlah}{" "}
                      akun
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Pendapatan */}
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">
                        Pendapatan
                      </p>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Anggaran</span>
                        <span className="font-bold">
                          <RupiahCell value={detailData.ringkasan.pendapatan.anggaran} />
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Realisasi</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                          <RupiahCell value={detailData.ringkasan.pendapatan.realisasi} className="text-emerald-700 dark:text-emerald-300" />
                        </span>
                      </div>
                      <div className="flex justify-end mt-1">
                        <Badge className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(detailData.ringkasan.pendapatan.persentase)}`}>
                          {formatPersentase(detailData.ringkasan.pendapatan.persentase)}
                        </Badge>
                      </div>
                    </div>
                    {/* Belanja */}
                    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3">
                      <p className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase tracking-wide mb-1">
                        Belanja
                      </p>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Anggaran</span>
                        <span className="font-bold">
                          <RupiahCell value={detailData.ringkasan.belanja.anggaran} />
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Realisasi</span>
                        <span className="font-bold text-red-700 dark:text-red-300">
                          <RupiahCell value={detailData.ringkasan.belanja.realisasi} className="text-red-700 dark:text-red-300" />
                        </span>
                      </div>
                      <div className="flex justify-end mt-1">
                        <Badge className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(detailData.ringkasan.belanja.persentase)}`}>
                          {formatPersentase(detailData.ringkasan.belanja.persentase)}
                        </Badge>
                      </div>
                    </div>
                    {/* Pembiayaan */}
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">
                        Pembiayaan
                      </p>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Anggaran</span>
                        <span className="font-bold">
                          <RupiahCell value={detailData.ringkasan.pembiayaan.anggaran} />
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Realisasi</span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                          <RupiahCell value={detailData.ringkasan.pembiayaan.realisasi} className="text-amber-700 dark:text-amber-300" />
                        </span>
                      </div>
                      <div className="flex justify-end mt-1">
                        <Badge className={`text-[10px] px-1.5 py-0 h-5 border ${getRealisasiBadgeClass(detailData.ringkasan.pembiayaan.persentase)}`}>
                          {formatPersentase(detailData.ringkasan.pembiayaan.persentase)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
