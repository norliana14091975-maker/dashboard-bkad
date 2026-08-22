"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardData } from "./types";
import { usePengaturan, DEFAULT_COPILOT_CONFIG } from "@/context/PengaturanContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  BotMessageSquare,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  Landmark,
  Clock,
  Loader2,
  User,
  Bot,
  MessageCircle,
  X,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type FloatingCopilotProps = {
  data: DashboardData | null;
};

const suggestedQuestions = [
  {
    question: "Berapa realisasi pendapatan saat ini?",
    icon: TrendingUp,
    color: "from-emerald-500 to-green-600",
  },
  {
    question: "OPD mana yang paling rendah penyerapannya?",
    icon: TrendingDown,
    color: "from-red-500 to-rose-600",
  },
  {
    question: "Berapa prediksi SILPA?",
    icon: BarChart3,
    color: "from-amber-500 to-orange-500",
  },
  {
    question: "Apakah ada risiko defisit?",
    icon: AlertTriangle,
    color: "from-violet-500 to-purple-600",
  },
  {
    question: "Belanja modal sudah berapa persen?",
    icon: Landmark,
    color: "from-teal-500 to-cyan-600",
  },
  {
    question: "Bandingkan dengan tahun lalu.",
    icon: Clock,
    color: "from-slate-500 to-gray-600",
  },
];

function formatMessageContent(content: string): string {
  let html = content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, '<h4 class="text-sm font-bold mt-3 mb-1">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 text-sm">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 text-sm">$1. $2</li>')
    .replace(/\n\n/g, "</p><p class='text-sm leading-relaxed mt-2'>")
    .replace(/\n/g, "<br/>");

  if (!html.startsWith("<")) {
    html = `<p class="text-sm leading-relaxed">${html}</p>`;
  }

  return html;
}

export default function FloatingCopilot({ data }: FloatingCopilotProps) {
  const { pengaturan } = usePengaturan();
  const copilotConfig = pengaturan.copilotConfig || DEFAULT_COPILOT_CONFIG;
  const copilotEnabled = copilotConfig.enabled;
  const welcomeMsg = copilotConfig.welcomeMessage || DEFAULT_COPILOT_CONFIG.welcomeMessage;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen, scrollToBottom]);

  // Hide notification badge after first open
  useEffect(() => {
    if (isOpen) setShowBadge(false);
  }, [isOpen]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !data) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/dashboard/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history,
          tahun: data.tahun,
        }),
      });

      if (!res.ok) throw new Error("Gagal menghubungi AI");

      const json = await res.json();

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: json.response || "Maaf, saya tidak dapat memproses pertanyaan tersebut.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content:
          "Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan coba lagi.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (question: string) => {
    sendMessage(question);
  };

  const clearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  // Don't render if copilot is disabled or no data
  if (!copilotEnabled || !data) return null;

  return (
    <>
      {/* ====== Floating Bubble Button (Mobile Only) ====== */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-20 right-4 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform active:scale-90"
          style={{
            background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
            boxShadow: `0 8px 24px ${pengaturan.warnaPrimary}40, 0 4px 8px rgba(0,0,0,0.15)`,
          }}
          aria-label="Buka AI Copilot"
        >
          {/* Pulsing ring animation */}
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: pengaturan.warnaAccent }}
          />

          {/* Bot icon */}
          <BotMessageSquare className="w-6 h-6 text-white relative z-10" />

          {/* Sparkles accent */}
          <Sparkles
            className="absolute -top-1 -right-1 w-4 h-4 text-yellow-300 relative z-10"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
          />

          {/* Notification badge */}
          {showBadge && messages.length === 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white z-20"
              style={{ backgroundColor: "#ef4444" }}
            >
              1
            </span>
          )}
        </button>
      </motion.div>

      {/* ====== Drawer with Chat Interface ====== */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="h-[88vh] max-h-[88vh] p-0 flex flex-col">
          {/* Header */}
          <DrawerHeader className="px-0 py-0 shrink-0">
            <div
              className="relative overflow-hidden text-white px-5 py-4"
              style={{
                background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
              }}
            >
              {/* Background decoration */}
              <div className="absolute -right-8 -top-8 w-32 h-32 border border-white/10 rounded-full" />
              <div className="absolute w-24 h-24 bg-white/5 rounded-full blur-2xl -right-4 top-1/2 -translate-y-1/2" />

              <div className="relative flex items-center gap-3">
                <div className="shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <BotMessageSquare className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="w-3 h-3 text-yellow-300" />
                    <span className="text-[9px] font-medium text-white/80 uppercase tracking-widest">
                      AI-Powered
                    </span>
                  </div>
                  <DrawerTitle className="text-base font-extrabold tracking-wide text-white">
                    AI Financial Copilot
                  </DrawerTitle>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[9px] text-white/80 bg-white/10 rounded-full px-2 py-0.5">
                      TA {data.tahun}
                    </span>
                    <Badge className="text-[8px] bg-white/15 text-white border-0 hover:bg-white/20 h-4 px-1.5">
                      Online
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {messages.length > 0 && (
                    <Button
                      onClick={clearChat}
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DrawerHeader>
          <DrawerDescription className="sr-only">
            Chat dengan AI Financial Copilot untuk menganalisis data keuangan daerah
          </DrawerDescription>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-muted/20">
            {/* Empty state with suggestions */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3"
                >
                  <MessageCircle className="w-7 h-7 text-primary" />
                </motion.div>
                <h3 className="text-base font-bold text-foreground mb-1">
                  Tanya AI Keuangan
                </h3>
                <p className="text-xs text-muted-foreground mb-5 text-center max-w-xs px-4">
                  {welcomeMsg}
                </p>

                <div className="grid grid-cols-1 gap-2 w-full max-w-md px-2">
                  {suggestedQuestions.map((item, idx) => (
                    <motion.button
                      key={item.question}
                      onClick={() => handleSuggestionClick(item.question)}
                      className="group flex items-center gap-2.5 text-left p-2.5 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:shadow-md transition-all duration-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05, duration: 0.3 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-sm`}
                      >
                        <item.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-medium text-foreground leading-tight flex-1">
                        {item.question}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-md mt-0.5"
                      style={{
                        background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
                      }}
                    >
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl ${
                      msg.role === "user"
                        ? "text-white rounded-br-md"
                        : "bg-card border border-border/50 rounded-bl-md"
                    }`}
                    style={
                      msg.role === "user"
                        ? {
                            background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
                          }
                        : undefined
                    }
                  >
                    <div className="px-3.5 py-2.5">
                      {msg.role === "assistant" ? (
                        <div
                          className="prose prose-sm max-w-none text-foreground"
                          dangerouslySetInnerHTML={{
                            __html: formatMessageContent(msg.content),
                          }}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                    <div
                      className={`px-3.5 pb-1.5 text-[9px] ${
                        msg.role === "user" ? "text-white/60" : "text-muted-foreground"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shrink-0 shadow-md mt-0.5">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5 justify-start"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
                  }}
                >
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">
                      Menganalisis...
                    </span>
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        backgroundColor: pengaturan.warnaPrimary,
                        animationDelay: "0ms",
                      }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        backgroundColor: pengaturan.warnaPrimary,
                        animationDelay: "150ms",
                      }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        backgroundColor: pengaturan.warnaPrimary,
                        animationDelay: "300ms",
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border/50 p-3 bg-card shrink-0">
            {/* Quick suggestions (when chat has messages) */}
            {messages.length > 0 && !isLoading && (
              <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 custom-scrollbar">
                {suggestedQuestions.slice(0, 4).map((item) => (
                  <button
                    key={item.question}
                    onClick={() => handleSuggestionClick(item.question)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full border border-border/50 bg-muted/30 text-[10px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors whitespace-nowrap shrink-0"
                  >
                    <item.icon className="w-2.5 h-2.5" />
                    {item.question}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya AI Keuangan..."
                disabled={isLoading}
                className="flex-1 h-10 px-3.5 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-10 w-10 rounded-xl shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${pengaturan.warnaPrimary}, ${pengaturan.warnaSecondary})`,
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
              AI Copilot menganalisis data keuangan real-time. Hasil dapat bervariasi.
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
