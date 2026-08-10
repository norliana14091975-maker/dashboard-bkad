"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import GenericCrudTable, { type ColumnDef, type RowAction } from "./GenericCrudTable";
import DataFormDialog, { type FormField } from "./DataFormDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { safePercentage } from "@/components/dashboard/types";
import RupiahCell from "@/components/dashboard/RupiahCell";
import {
  PencilLine,
  History,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import ImportDialog from "./ImportDialog";
import PdfImportDialog from "./PdfImportDialog";
import CurrencyInput from "./CurrencyInput";
import { usePengaturan } from "@/context/PengaturanContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Pendapatan = {
  id: string;
  tahunAnggaranId: string;
  kodeAkun: string;
  namaAkun: string;
  kategori: string;
  anggaran: number;
  realisasi: number;
  opdId: string | null;
  tanggalUpdate?: string;
  sourceIds?: string[];
  count?: number;
};

type HistoryRecord = {
  id: string;
  pendapatanId: string;
  realisasiLama: number;
  realisasiBaru: number;
  tanggalUpdate: string;
  keterangan: string | null;
  updatedBy: string | null;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const COLUMNS: ColumnDef[] = [
  { key: "kodeAkun", label: "Kode Akun", type: "text", width: "120px" },
  { key: "namaAkun", label: "Nama Akun", type: "text", wrap: true },
  { key: "kategori", label: "Kategori", type: "text", width: "120px" },
  { key: "anggaran", label: "Anggaran", type: "currency", width: "180px" },
  { key: "realisasi", label: "Realisasi", type: "currency", width: "180px" },
  { key: "tanggalUpdate", label: "Tgl Update", type: "date", width: "120px" },
  { key: "count", label: "Jumlah Sumber", type: "custom", width: "110px" },
];

interface PendapatanManagerProps {
  tahunAnggaranId: string | null;
}

export default function PendapatanManager({
  tahunAnggaranId,
}: PendapatanManagerProps) {
  const { toast } = useToast();
  const { pengaturan } = usePengaturan();
  const [data, setData] = useState<Pendapatan[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [kategoriOptions, setKategoriOptions] = useState<{ value: string; label: string }[]>([]);
  const [kategoriData, setKategoriData] = useState<Array<{ id: string; namaKategori: string; kodeKategori: string | null; aktif: boolean }>>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Pendapatan | null>(null);
  const [deletingItem, setDeletingItem] = useState<Pendapatan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [pdfImportOpen, setPdfImportOpen] = useState(false);

  // Update realisasi dialog state
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateItem, setUpdateItem] = useState<Pendapatan | null>(null);
  const [updateRealisasiNumber, setUpdateRealisasiNumber] = useState(0);
  const [updateTanggal, setUpdateTanggal] = useState("");
  const [updateKeterangan, setUpdateKeterangan] = useState("");
  const [updateSubmitting, setUpdateSubmitting] = useState(false);

  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<Pendapatan | null>(null);
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch categories from Kategori API
  const fetchKategoriOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/kategori?jenis=Pendapatan");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      const json = await res.json();
      const kategoris: Array<{ id: string; namaKategori: string; kodeKategori: string | null; aktif: boolean }> = json.data || [];
      // Store full kategori data for auto-fill
      setKategoriData(kategoris.filter((k) => k.aktif));
      // Only show active categories
      const activeKategoris = kategoris.filter((k) => k.aktif);
      setKategoriOptions(
        activeKategoris.length > 0
          ? activeKategoris.map((k) => ({ value: k.namaKategori, label: k.namaKategori }))
          : [
              { value: "PAD", label: "PAD" },
              { value: "Transfer", label: "Transfer" },
              { value: "Lainnya", label: "Lainnya" },
            ]
      );
    } catch {
      // Fallback to default options
      setKategoriData([]);
      setKategoriOptions([
        { value: "PAD", label: "PAD" },
        { value: "Transfer", label: "Transfer" },
        { value: "Lainnya", label: "Lainnya" },
      ]);
    }
  }, []);

  const FORM_FIELDS: FormField[] = [
    {
      name: "kategori",
      label: "Kategori",
      type: "select",
      required: true,
      options: kategoriOptions,
      onSelect: (selectedValue, setFormData) => {
        const selected = kategoriData.find((k) => k.namaKategori === selectedValue);
        if (selected) {
          setFormData((prev) => ({
            ...prev,
            kodeAkun: selected.kodeKategori || prev.kodeAkun,
            namaAkun: selected.namaKategori || prev.namaAkun,
          }));
        }
      },
    },
    {
      name: "kodeAkun",
      label: "Kode Akun",
      type: "text",
      placeholder: "Contoh: 1.01",
      required: true,
    },
    {
      name: "namaAkun",
      label: "Nama Akun",
      type: "text",
      placeholder: "Contoh: PAD",
      required: true,
    },
    {
      name: "anggaran",
      label: "Anggaran (Rp)",
      type: "currency",
      placeholder: "Contoh: 31.500.000.000,50",
      required: true,
      min: 0,
    },
    {
      name: "realisasi",
      label: "Realisasi (Rp)",
      type: "currency",
      placeholder: "Contoh: 28.000.000.000,50",
      required: true,
      min: 0,
    },
  ];

  const fetchData = useCallback(async () => {
    if (!tahunAnggaranId) {
      setData([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahunAnggaranId,
        search,
        page: String(pagination.page),
        limit: String(pagination.limit),
        grouped: 'true',
      });
      const res = await fetch(`/api/admin/pendapatan?${params}`);
      if (!res.ok) throw new Error("Gagal memuat data pendapatan");
      const json = await res.json();
      setData(json.data || []);
      if (json.pagination) {
        setPagination(json.pagination);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tahunAnggaranId, search, pagination.page, pagination.limit, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchKategoriOptions();
  }, [fetchKategoriOptions]);

  // Refresh categories when form opens
  const handleCreate = () => {
    setEditingItem(null);
    setFormKey((k) => k + 1);
    fetchKategoriOptions();
    setFormOpen(true);
  };

  const handleEdit = (row: Record<string, unknown>) => {
    setEditingItem(row as unknown as Pendapatan);
    setFormKey((k) => k + 1);
    fetchKategoriOptions();
    setFormOpen(true);
  };

  const handleDelete = (row: Record<string, unknown>) => {
    setDeletingItem(row as unknown as Pendapatan);
    setDeleteOpen(true);
  };

  // ---- Update Realisasi ----
  const handleOpenUpdateDialog = (row: Record<string, unknown>) => {
    const item = row as unknown as Pendapatan;
    setUpdateItem(item);
    setUpdateRealisasiNumber(item.realisasi ?? 0);
    // Set tanggal to today by default
    const today = new Date().toISOString().split("T")[0];
    setUpdateTanggal(today);
    setUpdateKeterangan("");
    setUpdateDialogOpen(true);
  };

  const handleSubmitUpdate = async () => {
    if (!updateItem) return;
    const realisasiValue = updateRealisasiNumber;
    if (isNaN(realisasiValue) || realisasiValue < 0) {
      toast({
        title: "Validasi",
        description: "Nilai realisasi harus berupa angka positif",
        variant: "destructive",
      });
      return;
    }
    if (!updateTanggal) {
      toast({
        title: "Validasi",
        description: "Tanggal update harus diisi",
        variant: "destructive",
      });
      return;
    }

    setUpdateSubmitting(true);
    try {
      const patchBody: Record<string, unknown> = {
        realisasi: realisasiValue,
        tanggalUpdate: new Date(updateTanggal).toISOString(),
        keterangan: updateKeterangan || undefined,
      };
      if (updateItem.sourceIds && updateItem.sourceIds.length > 0) {
        patchBody.sourceIds = updateItem.sourceIds;
      }
      const res = await fetch(`/api/admin/pendapatan?id=${updateItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengupdate realisasi");
      }
      toast({
        title: "Berhasil",
        description: `Realisasi ${updateItem.kodeAkun} — ${updateItem.namaAkun} berhasil diperbarui`,
      });
      setUpdateDialogOpen(false);
      fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setUpdateSubmitting(false);
    }
  };

  // ---- History ----
  const handleOpenHistory = async (row: Record<string, unknown>) => {
    const item = row as unknown as Pendapatan;
    setHistoryItem(item);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/pendapatan-history?pendapatanId=${item.id}`);
      if (!res.ok) throw new Error("Gagal memuat riwayat");
      const json = await res.json();
      setHistoryData(json.data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Gagal memuat riwayat",
        variant: "destructive",
      });
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate difference
  const calcDifference = (baru: number, lama: number) => {
    const diff = baru - lama;
    return diff;
  };

  // Row actions for the table
  const rowActions: RowAction[] = [
    {
      key: "update-realisasi",
      label: "Update Realisasi",
      icon: PencilLine,
      className: "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50",
      onClick: handleOpenUpdateDialog,
    },
    {
      key: "history",
      label: "Riwayat Realisasi",
      icon: History,
      className: "text-amber-600 hover:text-amber-800 hover:bg-amber-50",
      onClick: handleOpenHistory,
    },
  ];

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (!tahunAnggaranId) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        tahunAnggaranId,
        kodeAkun: String(formData.kodeAkun),
        namaAkun: String(formData.namaAkun),
        kategori: String(formData.kategori),
        anggaran: Number(formData.anggaran),
        realisasi: Number(formData.realisasi),
      };

      let res: Response;
      if (editingItem) {
        if (editingItem.sourceIds && editingItem.sourceIds.length > 0) {
          body.sourceIds = editingItem.sourceIds;
        }
        res = await fetch(`/api/admin/pendapatan?id=${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/admin/pendapatan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menyimpan data");
      }
      toast({
        title: "Berhasil",
        description: editingItem
          ? "Data pendapatan berhasil diperbarui"
          : "Data pendapatan berhasil ditambahkan",
      });
      setFormOpen(false);
      fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setSubmitting(true);
    try {
      const deleteBody: Record<string, unknown> = {};
      if (deletingItem.sourceIds && deletingItem.sourceIds.length > 0) {
        deleteBody.sourceIds = deletingItem.sourceIds;
      }
      const res = await fetch(`/api/admin/pendapatan?id=${deletingItem.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleteBody),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menghapus data");
      }
      toast({
        title: "Berhasil",
        description: "Data pendapatan berhasil dihapus",
      });
      setDeleteOpen(false);
      setDeletingItem(null);
      fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  if (!tahunAnggaranId) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground text-sm">
            Pilih tahun anggaran terlebih dahulu untuk mengelola data pendapatan
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-2 h-6 rounded-full" style={{ backgroundColor: pengaturan.warnaPrimary }} />
          Manajemen Pendapatan
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPdfImportOpen(true)}
              className="gap-1.5 text-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              Import PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="gap-1.5 text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Import Excel
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <GenericCrudTable
          columns={COLUMNS}
          data={data as unknown as Record<string, unknown>[]}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={fetchData}
          onCreate={handleCreate}
          loading={loading}
          searchPlaceholder="Cari nama atau kode akun..."
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          renderCustomCell={(key, value) => {
            if (key === "count") {
              const num = Number(value ?? 1);
              if (num <= 1) return <span className="text-xs text-muted-foreground">1</span>;
              return (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  {num} sumber
                </Badge>
              );
            }
            return String(value ?? "-");
          }}
          pagination={pagination}
          onPageChange={handlePageChange}
          itemName="Pendapatan"
          rowActions={rowActions}
        />

        <DataFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          title={editingItem ? "Edit Pendapatan" : "Tambah Pendapatan"}
          description="Masukkan data pendapatan daerah"
          fields={FORM_FIELDS}
          initialData={editingItem as unknown as Record<string, unknown> | null}
          onSubmit={handleSubmit}
          loading={submitting}
          resetKey={formKey}
        />

        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={
            deletingItem
              ? `${deletingItem.kodeAkun} - ${deletingItem.namaAkun}`
              : ""
          }
          onConfirm={handleConfirmDelete}
          loading={submitting}
        />

        {/* Update Realisasi Dialog */}
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PencilLine className="w-5 h-5 text-emerald-600" />
                Update Realisasi
              </DialogTitle>
              <DialogDescription>
                Update nilai realisasi untuk {updateItem?.kodeAkun} — {updateItem?.namaAkun}
              </DialogDescription>
            </DialogHeader>
            {updateItem && (
              <div className="space-y-4 py-2">
                <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Kategori</span>
                    <Badge variant="outline" className="text-xs">{updateItem.kategori}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Anggaran</span>
                    <RupiahCell value={updateItem.anggaran} className="text-sm font-medium" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Realisasi Saat Ini</span>
                    <RupiahCell value={updateItem.realisasi} className="text-sm font-medium text-blue-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-realisasi-pendapatan" className="text-sm font-medium">Realisasi Baru (Rp)</Label>
                  <CurrencyInput id="new-realisasi-pendapatan" placeholder="Masukkan nilai realisasi baru" value={updateRealisasiNumber} onChange={(num) => setUpdateRealisasiNumber(num)} min={0} />
                  {updateRealisasiNumber > 0 && updateItem.anggaran > 0 && (
                    <p className="text-xs text-muted-foreground">Persentase baru: <span className="font-medium">{((updateRealisasiNumber / updateItem.anggaran) * 100).toFixed(2)}%</span></p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-tanggal-pendapatan" className="text-sm font-medium flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" />Tanggal Update</Label>
                  <Input id="update-tanggal-pendapatan" type="date" value={updateTanggal} onChange={(e) => setUpdateTanggal(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-keterangan-pendapatan" className="text-sm font-medium">Keterangan (Opsional)</Label>
                  <Textarea id="update-keterangan-pendapatan" placeholder="Contoh: Realisasi triwulan 3" value={updateKeterangan} onChange={(e) => setUpdateKeterangan(e.target.value)} rows={2} />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setUpdateDialogOpen(false)} disabled={updateSubmitting}>Batal</Button>
              <Button onClick={handleSubmitUpdate} disabled={updateSubmitting} className="text-white gap-1.5" style={{ backgroundColor: pengaturan.warnaPrimary }}>
                {updateSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PencilLine className="w-4 h-4" />}
                {updateSubmitting ? "Menyimpan..." : "Update Realisasi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                Riwayat Realisasi
              </DialogTitle>
              <DialogDescription>
                Riwayat perubahan realisasi untuk {historyItem?.kodeAkun} — {historyItem?.namaAkun}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 max-h-[55vh] overflow-y-auto custom-scrollbar">
              {historyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-muted/30 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada riwayat perubahan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.map((record) => {
                    const diff = calcDifference(record.realisasiBaru, record.realisasiLama);
                    const isIncrease = diff > 0;
                    const isDecrease = diff < 0;

                    return (
                      <div
                        key={record.id}
                        className="relative p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                          style={{
                            backgroundColor: isIncrease
                              ? "#10b981"
                              : isDecrease
                              ? "#ef4444"
                              : "#6b7280",
                          }}
                        />

                        <div className="pl-3 space-y-2">
                          {/* Header: Date & User */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium">
                                {formatDate(record.tanggalUpdate)}
                              </span>
                            </div>
                            {record.updatedBy && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                oleh {record.updatedBy}
                              </span>
                            )}
                          </div>

                          {/* Value change */}
                          <div className="flex items-center gap-2 text-sm">
                            <RupiahCell value={record.realisasiLama} className="text-muted-foreground line-through" />
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                            <RupiahCell value={record.realisasiBaru} className="font-medium" />
                            {isIncrease && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-0.5">
                                <TrendingUp className="w-2.5 h-2.5" />
                                <RupiahCell value={Math.abs(diff)} prefix="+" />
                              </Badge>
                            )}
                            {isDecrease && (
                              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200 gap-0.5">
                                <TrendingDown className="w-2.5 h-2.5" />
                                <RupiahCell value={Math.abs(diff)} prefix="-" />
                              </Badge>
                            )}
                          </div>

                          {/* Keterangan */}
                          {record.keterangan && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {record.keterangan}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setHistoryDialogOpen(false)}
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          jenis="pendapatan"
          tahunAnggaranId={tahunAnggaranId}
          onSuccess={fetchData}
        />

        {/* PDF Import Dialog */}
        <PdfImportDialog
          open={pdfImportOpen}
          onOpenChange={setPdfImportOpen}
          jenis="pendapatan"
          tahunAnggaranId={tahunAnggaranId}
          onSuccess={fetchData}
        />
      </CardContent>
    </Card>
  );
}
