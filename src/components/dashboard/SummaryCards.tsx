"use client";

import { DashboardData, formatRupiah, formatPersentase, formatRupiahShort } from "./types";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { usePengaturan } from "@/context/PengaturanContext";

type SummaryCardsProps = {
  data: DashboardData;
};

type CardData = {
  title: string;
  value: number;
  displayValue: string;
  fullValue: string;
  subtitle: string;
  Icon: LucideIcon;
  /** Tailwind class for icon container bg (10% opacity) */
  iconBg: string;
  /** Tailwind class for icon color (full opacity) */
  iconColor: string;
  /** Hex/oklch color for left border & progress gradient */
  accentColor: string;
  /** Lighter shade for progress bar gradient end */
  accentColorLight: string;
  /** Tailwind class for left border color */
  borderClass: string;
  persentase: number | undefined;
  realisasiValue: string | undefined;
  anggaranLabel: string | undefined;
  sisaLabel: string | undefined;
  sparkle: boolean;
};

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 2) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });

    const unsubscribe = motionValue.on("change", (v) => {
      setDisplay(v);
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [target, duration, motionValue]);

  return display;
}

function formatCounterValue(num: number): string {
  if (num >= 1_000_000_000_000) return `${(num / 1_000_000_000_000).toFixed(1)} T`;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} M`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} Jt`;
  return Math.round(num).toLocaleString("id-ID");
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function SummaryCards({ data }: SummaryCardsProps) {
  const { ringkasan } = data;
  const { pengaturan } = usePengaturan();

  const sisaPendapatan = ringkasan.totalPendapatan - ringkasan.realisasiPendapatan;
  const sisaBelanja = ringkasan.totalBelanja - ringkasan.realisasiBelanja;

  const cards: CardData[] = [
    {
      title: "Total APBD",
      value: ringkasan.totalAnggaran,
      displayValue: formatRupiah(ringkasan.totalAnggaran),
      fullValue: formatRupiahShort(ringkasan.totalAnggaran),
      subtitle: "Anggaran Pendapatan & Belanja Daerah",
      Icon: Landmark,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      accentColor: "#059669",
      accentColorLight: "#34d399",
      borderClass: "border-l-emerald-500",
      persentase: undefined,
      realisasiValue: undefined,
      anggaranLabel: undefined,
      sisaLabel: undefined,
      sparkle: true,
    },
    {
      title: "Pendapatan",
      value: ringkasan.totalPendapatan,
      displayValue: formatRupiah(ringkasan.totalPendapatan),
      fullValue: formatRupiahShort(ringkasan.totalPendapatan),
      subtitle: `Realisasi: ${formatPersentase(ringkasan.persentasePendapatan)}`,
      Icon: TrendingUp,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      accentColor: "#2563eb",
      accentColorLight: "#60a5fa",
      borderClass: "border-l-blue-500",
      persentase: ringkasan.persentasePendapatan,
      realisasiValue: formatRupiahShort(ringkasan.realisasiPendapatan),
      anggaranLabel: formatRupiahShort(ringkasan.totalPendapatan),
      sisaLabel: formatRupiahShort(sisaPendapatan),
      sparkle: false,
    },
    {
      title: "Belanja",
      value: ringkasan.totalBelanja,
      displayValue: formatRupiah(ringkasan.totalBelanja),
      fullValue: formatRupiahShort(ringkasan.totalBelanja),
      subtitle: `Realisasi: ${formatPersentase(ringkasan.persentaseBelanja)}`,
      Icon: TrendingDown,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
      accentColor: "#e11d48",
      accentColorLight: "#fb7185",
      borderClass: "border-l-rose-500",
      persentase: ringkasan.persentaseBelanja,
      realisasiValue: formatRupiahShort(ringkasan.realisasiBelanja),
      anggaranLabel: formatRupiahShort(ringkasan.totalBelanja),
      sisaLabel: formatRupiahShort(sisaBelanja),
      sparkle: false,
    },
    {
      title: "Pembiayaan",
      value: ringkasan.totalPembiayaan,
      displayValue: formatRupiah(ringkasan.totalPembiayaan),
      fullValue: formatRupiahShort(ringkasan.totalPembiayaan),
      subtitle: "Net Pembiayaan Daerah",
      Icon: DollarSign,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      accentColor: "#d97706",
      accentColorLight: "#fbbf24",
      borderClass: "border-l-amber-500",
      persentase: undefined,
      realisasiValue: undefined,
      anggaranLabel: undefined,
      sisaLabel: undefined,
      sparkle: false,
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card, index) => (
        <ModernSummaryCard key={card.title} card={card} index={index} />
      ))}
    </motion.div>
  );
}

function ModernSummaryCard({ card, index }: { card: CardData; index: number }) {
  const counterValue = useAnimatedCounter(card.value, 2);

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{
        y: -4,
        transition: { type: "spring", stiffness: 300 },
      }}
      className="group relative"
    >
      <div
        className={`modern-card rounded-2xl p-5 border-l-[4px] ${card.borderClass}
          hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.06),0_20px_40px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.15)]
          transition-all duration-300`}
      >
        {/* Icon + Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {card.title}
            </p>
            <div className="text-2xl font-bold tracking-tight mt-1">
              Rp {formatCounterValue(counterValue)}
            </div>
          </div>

          {/* Icon container */}
          <motion.div
            className={`${card.iconBg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <card.Icon className={`w-5 h-5 ${card.iconColor}`} />
          </motion.div>
        </div>

        {/* Subtitle with optional sparkle */}
        <div className="mt-2 flex items-center gap-1.5">
          {card.sparkle && (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <p className="text-xs text-muted-foreground">
            {card.subtitle}
          </p>
        </div>

        {/* Progress bar for realisasi */}
        {card.persentase !== undefined && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Realisasi
              </span>
              <span className="text-xs text-muted-foreground">
                {formatPersentase(card.persentase)}
              </span>
            </div>
            <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(to right, ${card.accentColor}, ${card.accentColorLight})`,
                }}
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(card.persentase, 100)}%`,
                }}
                transition={{
                  duration: 1.2,
                  delay: 0.3 + index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>
            {/* Sub-info: Anggaran & Sisa */}
            {card.anggaranLabel && card.sisaLabel && (
              <p className="text-xs text-muted-foreground">
                Anggaran: {card.anggaranLabel} &middot; Sisa: {card.sisaLabel}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
