"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { usePengaturan } from "@/context/PengaturanContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";
import { motion } from "framer-motion";

export default function LoginForm() {
  const { pengaturan, logoSrc } = usePengaturan();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email dan password harus diisi");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      }
      // If successful, the session will update automatically
    } catch {
      setError("Terjadi kesalahan saat login. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT PANEL — Brand / Decorative (hidden on mobile) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden p-12"
        style={{
          background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
        }}
      >
        {/* Floating decorative orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-72 h-72 rounded-full bg-white/10 animate-float-orb" />
          <div className="absolute bottom-[10%] left-[-8%] w-96 h-96 rounded-full bg-white/8 animate-float-orb-slow" />
          <div className="absolute top-[40%] right-[20%] w-40 h-40 rounded-full bg-white/6 animate-float-orb-fast" />
          <div className="absolute bottom-[-5%] right-[30%] w-56 h-56 rounded-full bg-white/5 animate-pulse-ring" />
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-center max-w-md"
        >
          {/* Logo */}
          <div className="mx-auto w-24 h-24 rounded-2xl flex items-center justify-center mb-8 modern-glass shadow-2xl">
            <img
              src={logoSrc}
              alt="Logo"
              className="w-16 h-16 object-contain"
            />
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
            Dashboard Keuangan
          </h1>
          <p className="text-lg text-white/75 font-medium mb-2">
            {pengaturan.namaPemerintah}
          </p>
          <p className="text-sm text-white/50">
            {pengaturan.namaInstansi}
          </p>

          {/* Decorative line */}
          <div className="mt-10 mx-auto w-24 h-1 rounded-full bg-white/20" />
        </motion.div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 relative">
        {/* Background orbs for mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div
            className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-[0.07]"
            style={{ backgroundColor: pengaturan.warnaPrimary }}
          />
          <div
            className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.07]"
            style={{ backgroundColor: pengaturan.warnaSecondary }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.1,
          }}
          className="w-full max-w-md relative"
        >
          <div className="modern-glass rounded-2xl p-8 sm:p-10 shadow-xl">
            {/* Mobile-only header (visible on < lg) */}
            <div className="lg:hidden text-center mb-6">
              <div
                className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-4 modern-glass shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
                }}
              >
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                Dashboard Keuangan
              </h2>
              <p className="text-sm text-muted-foreground">
                {pengaturan.namaPemerintah}
              </p>
            </div>

            {/* Desktop form heading */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-2xl font-bold tracking-tight mb-1">
                Selamat Datang
              </h2>
              <p className="text-sm text-muted-foreground">
                Masuk ke panel administrator
              </p>
            </div>

            {/* Admin badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl mb-6 mx-auto w-fit modern-badge-glow"
              style={{
                backgroundColor: `${pengaturan.warnaPrimary}12`,
                color: pengaturan.warnaPrimary,
              }}
            >
              <Shield className="w-4 h-4" />
              <span className="text-sm font-semibold">Login Admin / OPD</span>
            </motion.div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Alert
                  variant="destructive"
                  className="mb-5 rounded-xl border-0 bg-red-50 dark:bg-red-950/50"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.25 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="email"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  Email
                </Label>
                <div className="modern-input-focus rounded-xl">
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@seruyankab.go.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-12 rounded-xl border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-black/15 dark:focus-visible:border-white/15 transition-all"
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              {/* Password field */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.3 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="password"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  Password
                </Label>
                <div className="modern-input-focus rounded-xl relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-12 rounded-xl border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm text-sm pr-11 placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-black/15 dark:focus-visible:border-white/15 transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Submit button */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.35 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] border-0"
                  style={{
                    background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Masuk
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            <p className="text-xs text-center text-muted-foreground/70 mt-7 leading-relaxed">
              Administrator dan OPD dapat mengakses panel pengelolaan data.
              <br />
              Hubungi {pengaturan.namaInstansi} jika Anda lupa kredensial.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
