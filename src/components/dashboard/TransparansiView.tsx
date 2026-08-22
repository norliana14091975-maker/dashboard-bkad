"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DashboardData,
  formatPersentase,
  formatRupiahShort,
  getRealisasiBadgeClass,
  getRealisasiBarClass,
  safePercentage,
} from "./types";
import RupiahCell from "./RupiahCell";
import { motion } from "framer-motion";
import {
  Eye,
  FileText,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Banknote,
  Scale,
  ShieldCheck,
} from "lucide-react";
import APBDTable from "./APBDTable";

type TransparansiViewProps = {
  data: DashboardData;
};

export default function TransparansiView({ data }: TransparansiViewProps) {
  const totalPendapatan = data.pendapatan.reduce((s, p) => s + p.anggaran, 0);
  const totalRealisasiPendapatan = data.pendapatan.reduce(
    (s, p) => s + p.realisasi,
    0
  );
  const totalBelanja = data.belanja.reduce((s, b) => s + b.anggaran, 0);
  const totalRealisasiBelanja = data.belanja.reduce(
    (s, b) => s + b.realisasi,
    0
  );
  const totalPembiayaan = data.pembiayaan.reduce(
    (s, p) => s + p.anggaran,
    0
  );
  const totalRealisasiPembiayaan = data.pembiayaan.reduce(
    (s, p) => s + p.realisasi,
    0
  );

  const pctPendapatan = safePercentage(totalRealisasiPendapatan, totalPendapatan);
  const pctBelanja = safePercentage(totalRealisasiBelanja, totalBelanja);
  const pctPembiayaan = safePercentage(totalRealisasiPembiayaan, totalPembiayaan);

  const surplus = totalPendapatan - totalBelanja;
  const surplusRealisasi = totalRealisasiPendapatan - totalRealisasiBelanja;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* ── Hero Card ── */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-md border-0 bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-100 shrink-0">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Transparansi Keuangan Daerah
                  </h2>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    TA {data.tahun}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Pemerintah Kabupaten Seruyan berkomitmen untuk memberikan
                  transparansi dalam pengelolaan keuangan daerah. Data APBD dan
                  Realisasi tersedia untuk diakses publik sesuai amanat:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <FileText className="w-3 h-3" />
                    Permendagri 90/2019
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-100 text-blue-700 hover:bg-blue-100">
                    <Eye className="w-3 h-3" />
                    UU 14/2008 (KIP)
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
                    <Landmark className="w-3 h-3" />
                    UU 23/2014 (PD)
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Summary Metric Cards — 3 Kategori APBD + SilPA sesuai Permendagri 90/2019 ── */}
      <motion.div variants={itemVariants}>
        <div className="space-y-2">
          <h3
            className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-1"
          >
            Ringkasan APBD per Kategori
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Pendapatan Daerah */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-md bg-emerald-100">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Pendapatan Daerah
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-emerald-700 truncate">
                  {formatRupiahShort(totalPendapatan)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  <Badge
                    className={`text-[9px] px-1 py-0 h-4 border ${getRealisasiBadgeClass(pctPendapatan)}`}
                  >
                    {formatPersentase(pctPendapatan)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Total Belanja Daerah */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-red-50 to-white overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-md bg-red-100">
                    <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Belanja Daerah
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-red-700 truncate">
                  {formatRupiahShort(totalBelanja)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                  <Badge
                    className={`text-[9px] px-1 py-0 h-4 border ${getRealisasiBadgeClass(pctBelanja)}`}
                  >
                    {formatPersentase(pctBelanja)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Total Pembiayaan */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-amber-50 to-white overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-md bg-amber-100">
                    <Banknote className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Pembiayaan
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-amber-700 truncate">
                  {formatRupiahShort(totalPembiayaan)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Wallet className="w-3 h-3 text-amber-500" />
                  <Badge
                    className={`text-[9px] px-1 py-0 h-4 border ${getRealisasiBadgeClass(pctPembiayaan)}`}
                  >
                    {formatPersentase(pctPembiayaan)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* SilPA / Defisit — Sisa Lebih Pembiayaan Anggaran */}
            <Card
              className={`shadow-sm border-0 bg-gradient-to-br overflow-hidden ${
                surplus >= 0
                  ? "from-teal-50 to-white"
                  : "from-red-50 to-white"
              }`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`p-1.5 rounded-md ${
                      surplus >= 0 ? "bg-teal-100" : "bg-red-100"
                    }`}
                  >
                    <Scale
                      className={`w-3.5 h-3.5 ${
                        surplus >= 0 ? "text-teal-600" : "text-red-600"
                      }`}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {surplus >= 0 ? "SilPA" : "Defisit"}
                  </span>
                </div>
                <p
                  className={`text-sm sm:text-base font-bold truncate ${
                    surplus >= 0 ? "text-teal-700" : "text-red-700"
                  }`}
                >
                  {formatRupiahShort(Math.abs(surplus))}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {surplus >= 0
                    ? "Sisa Lebih Pembiayaan Anggaran"
                    : "Belanja > Pendapatan"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="apbd" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="apbd" className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              APBD
            </TabsTrigger>
            <TabsTrigger value="realisasi" className="text-xs gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Realisasi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apbd" className="mt-4">
            <APBDTable data={data} />
          </TabsContent>

          <TabsContent value="realisasi" className="mt-4">
            <Card className="shadow-md border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  <div className="p-1.5 rounded-md bg-amber-100">
                    <CheckCircle className="w-4 h-4 text-amber-700" />
                  </div>
                  Laporan Realisasi Anggaran
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    TA {data.tahun}
                  </Badge>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Sesuai struktur Permendagri 90/2019 — Pendapatan Daerah, Belanja Daerah & Pembiayaan
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Ringkasan Realisasi Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Pendapatan */}
                  <div className="p-4 rounded-xl border bg-emerald-50/50">
                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Realisasi Pendapatan
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Anggaran</span>
                        <span className="font-semibold">
                          <RupiahCell value={totalPendapatan} />
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Realisasi</span>
                        <span className="font-semibold">
                          <RupiahCell value={totalRealisasiPendapatan} />
                        </span>
                      </div>
                      <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getRealisasiBarClass(pctPendapatan)}`}
                          style={{
                            width: `${Math.min(pctPendapatan, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-right">
                        <Badge
                          className={`text-[10px] border ${getRealisasiBadgeClass(pctPendapatan)}`}
                        >
                          {formatPersentase(pctPendapatan)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Belanja */}
                  <div className="p-4 rounded-xl border bg-red-50/50">
                    <h3 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Realisasi Belanja
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Anggaran</span>
                        <span className="font-semibold">
                          <RupiahCell value={totalBelanja} />
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Realisasi</span>
                        <span className="font-semibold">
                          <RupiahCell value={totalRealisasiBelanja} />
                        </span>
                      </div>
                      <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getRealisasiBarClass(pctBelanja)}`}
                          style={{
                            width: `${Math.min(pctBelanja, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-right">
                        <Badge
                          className={`text-[10px] border ${getRealisasiBadgeClass(pctBelanja)}`}
                        >
                          {formatPersentase(pctBelanja)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Pembiayaan */}
                  <div className="p-4 rounded-xl border bg-amber-50/50 sm:col-span-1 col-span-1">
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" />
                      Realisasi Pembiayaan
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Anggaran</span>
                        <span className="font-semibold">
                          <RupiahCell value={totalPembiayaan} />
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Realisasi</span>
                        <span className="font-semibold">
                          <RupiahCell value={totalRealisasiPembiayaan} />
                        </span>
                      </div>
                      <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getRealisasiBarClass(pctPembiayaan)}`}
                          style={{
                            width: `${Math.min(pctPembiayaan, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-right">
                        <Badge
                          className={`text-[10px] border ${getRealisasiBadgeClass(pctPembiayaan)}`}
                        >
                          {formatPersentase(pctPembiayaan)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per-SKPD Realisasi */}
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">
                    Realisasi Per SKPD/OPD
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {[...data.realisasiSkpd]
                      .sort((a, b) => b.anggaran - a.anggaran)
                      .map((skpd) => (
                        <div
                          key={skpd.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium truncate mr-2">
                                {skpd.namaSkpd}
                              </p>
                              <Badge
                                className={`text-[9px] px-1 py-0 h-4 border shrink-0 ${getRealisasiBadgeClass(skpd.persentase)}`}
                              >
                                {formatPersentase(skpd.persentase)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${getRealisasiBarClass(skpd.persentase)}`}
                                  style={{
                                    width: `${Math.min(skpd.persentase, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                              <span>
                                Anggaran: <RupiahCell value={skpd.anggaran} />
                              </span>
                              <span>
                                Realisasi: <RupiahCell value={skpd.realisasi} />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
