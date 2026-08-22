"use client";

import { useState } from "react";
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
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  CreditCard,
  Banknote,
} from "lucide-react";

type RealisasiAkunViewProps = {
  data: DashboardData;
};

export default function RealisasiAkunView({ data }: RealisasiAkunViewProps) {
  const { pengaturan } = usePengaturan();
  const [tanggalFilter, setTanggalFilter] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Pendapatan: true,
    Belanja: true,
    Pembiayaan: true,
  });

  const items = data.realisasiAkun;

  // Group by jenis
  const groupedData = items.reduce(
    (acc, item) => {
      const jenis = item.jenis;
      if (!acc[jenis]) acc[jenis] = [];
      acc[jenis].push(item);
      return acc;
    },
    {} as Record<string, typeof items>
  );

  const jenisLabels: Record<string, string> = {
    Pendapatan: "PENDAPATAN DAERAH",
    Belanja: "BELANJA DAERAH",
    Pembiayaan: "PEMBIAYAAN",
  };

  const jenisOrder = ["Pendapatan", "Belanja", "Pembiayaan"];

  // ─── Category Breakdowns (sesuai Permendagri 90/2019) ─────────────────────
  // Struktur APBD: Pendapatan Daerah, Belanja Daerah, Pembiayaan
  const pendapatanItems = items.filter((i) => i.jenis === "Pendapatan");
  const belanjaItems = items.filter((i) => i.jenis === "Belanja");
  const pembiayaanItems = items.filter((i) => i.jenis === "Pembiayaan");

  const totalPendapatanAnggaran = pendapatanItems.reduce((s, i) => s + i.anggaran, 0);
  const totalPendapatanRealisasi = pendapatanItems.reduce((s, i) => s + i.realisasi, 0);
  const persentasePendapatan = safePercentage(totalPendapatanRealisasi, totalPendapatanAnggaran);

  const totalBelanjaAnggaran = belanjaItems.reduce((s, i) => s + i.anggaran, 0);
  const totalBelanjaRealisasi = belanjaItems.reduce((s, i) => s + i.realisasi, 0);
  const persentaseBelanja = safePercentage(totalBelanjaRealisasi, totalBelanjaAnggaran);

  const totalPembiayaanAnggaran = pembiayaanItems.reduce((s, i) => s + i.anggaran, 0);
  const totalPembiayaanRealisasi = pembiayaanItems.reduce((s, i) => s + i.realisasi, 0);
  const persentasePembiayaan = safePercentage(totalPembiayaanRealisasi, totalPembiayaanAnggaran);

  const toggleGroup = (jenis: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [jenis]: !prev[jenis],
    }));
  };

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

  // Get latest update date from data
  const latestUpdateDate = items.length > 0
    ? items.reduce((latest, item) => {
        const d = new Date(item.tanggalUpdate);
        return d > latest ? d : latest;
      }, new Date(0))
    : null;

  const handlePrint = () => {
    window.print();
  };

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
                REALISASI ANGGARAN PER-AKUN
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
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 lg:px-6 py-3 bg-muted/30 border-b print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
              {items.length} Akun · TA {data.tahun}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
            {/* Total Pendapatan */}
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
          {jenisOrder.map((jenis) => {
            const groupItems = groupedData[jenis];
            if (!groupItems || groupItems.length === 0) return null;

            const subAnggaran = groupItems.reduce((s, i) => s + i.anggaran, 0);
            const subRealisasi = groupItems.reduce((s, i) => s + i.realisasi, 0);
            const subPersentase = safePercentage(subRealisasi, subAnggaran);
            const isExpanded = expandedGroups[jenis] !== false;

            // Color based on jenis
            const jenisColorMap: Record<string, { bg: string; headerBg: string; headerText: string; border: string; accent: string }> = {
              Pendapatan: {
                bg: "bg-emerald-50 dark:bg-emerald-950/10",
                headerBg: "bg-emerald-100 dark:bg-emerald-900/30",
                headerText: "text-emerald-800 dark:text-emerald-200",
                border: "border-emerald-300 dark:border-emerald-700",
                accent: "#10b981",
              },
              Belanja: {
                bg: "bg-red-50 dark:bg-red-950/10",
                headerBg: "bg-red-100 dark:bg-red-900/30",
                headerText: "text-red-800 dark:text-red-200",
                border: "border-red-300 dark:border-red-700",
                accent: "#ef4444",
              },
              Pembiayaan: {
                bg: "bg-amber-50 dark:bg-amber-950/10",
                headerBg: "bg-amber-100 dark:bg-amber-900/30",
                headerText: "text-amber-800 dark:text-amber-200",
                border: "border-amber-300 dark:border-amber-700",
                accent: "#f59e0b",
              },
            };
            const colors = jenisColorMap[jenis] || jenisColorMap.Pendapatan;

            return (
              <div key={jenis} className="mb-4">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(jenis)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-t-lg ${colors.headerBg} ${colors.headerText} font-bold text-sm uppercase tracking-wide border ${colors.border} print:rounded-none`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: colors.accent }} />
                    {jenisLabels[jenis] || jenis}
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {groupItems.length} Akun
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono hidden sm:inline">
                      {formatPersentase(subPersentase)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 print:hidden" />
                    ) : (
                      <ChevronDown className="w-4 h-4 print:hidden" />
                    )}
                  </div>
                </button>

                {/* Table */}
                {isExpanded && (
                  <div className={`border-x border-b ${colors.border} rounded-b-lg overflow-hidden print:rounded-none`}>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/50">
                          <TableHead className="text-[11px] font-semibold w-[40px] text-center">
                            No
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold w-[100px]">
                            Kode Akun
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold">
                            Nama Akun
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold text-right w-[150px]">
                            Anggaran (Rp)
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold text-right w-[150px]">
                            Realisasi (Rp)
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold text-right w-[120px]">
                            Selisih (Rp)
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold text-center w-[100px]">
                            Persentase
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupItems.map((item, idx) => {
                          const selisih = item.anggaran - item.realisasi;
                          const isOverBudget = selisih < 0;

                          return (
                            <TableRow
                              key={item.id}
                              className="group hover:bg-muted/40 transition-colors"
                            >
                              <TableCell className="text-[11px] text-muted-foreground text-center">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-[11px] font-mono font-medium">
                                {item.kodeAkun}
                              </TableCell>
                              <TableCell className="text-xs font-medium max-w-[250px]">
                                {item.namaAkun}
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
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {/* Subtotal */}
                    <div
                      className={`px-4 py-3 ${colors.bg} border-t-2 ${colors.border} flex items-center justify-between`}
                    >
                      <span className={`text-sm font-bold ${colors.headerText} uppercase`}>
                        Subtotal {jenisLabels[jenis] || jenis}
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
                )}
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
                  {/* Row 1: Total Pendapatan */}
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

                  {/* Row 2: Total Belanja */}
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

                  {/* Row 3: Total Pembiayaan */}
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
                Jumlah Akun Tercatat: {items.length}
              </span>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
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
    </motion.div>
  );
}
