"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantProps {
  context?: { courseName?: string; lessonTitle?: string };
}

const QUICK_QUESTIONS = [
  "Làm thế nào để tăng open rate email?",
  "Gợi ý cách tạo lead magnet hiệu quả",
  "Cách chọn niche cho personal brand",
  "Bắt đầu bán digital product từ đâu?",
];

export default function AIAssistant({ context }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Xin chào! Tôi là AI Assistant của Đăng Khương Academy 👋\n\nBạn đang gặp khó khăn gì trong học tập hay triển khai? Tôi sẵn sàng giúp!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;
    const userMsg: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, context }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau nhé!",
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Không kết nối được. Kiểm tra internet và thử lại!",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, #FFD814, #FFA41C)", boxShadow: "0 4px 24px rgba(255,216,20,0.4)" }}>
        <MessageCircle size={22} className="text-[#131921]" />
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", height: "480px" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: "linear-gradient(135deg, #166534, #14532d)", borderBottom: "1px solid #2a2a2a" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white text-sm">AI Assistant</div>
              <div className="text-[11px] text-amber-300">Đăng Khương Academy</div>
            </div>
            <button onClick={() => setOpen(false)}
              className="text-amber-300 hover:text-white transition-colors p-1">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: msg.role === "user" ? "#D4A843" : "#333" }}>
                  {msg.role === "user"
                    ? <User size={12} className="text-white" />
                    : <Bot size={12} className="text-[#D4A843]" />}
                </div>
                <div className="max-w-[80%]">
                  <div className="text-xs leading-relaxed whitespace-pre-wrap rounded-2xl px-3 py-2"
                    style={msg.role === "user"
                      ? { background: "#D4A843", color: "white", borderBottomRightRadius: "4px" }
                      : { background: "#252525", color: "#e5e7eb", borderBottomLeftRadius: "4px" }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#333" }}>
                  <Bot size={12} className="text-[#D4A843]" />
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm"
                  style={{ background: "#252525" }}>
                  <Loader2 size={14} className="text-[#D4A843] animate-spin" />
                </div>
              </div>
            )}

            {/* Quick questions — only show when just 1 message (initial) */}
            {messages.length === 1 && !loading && (
              <div className="space-y-1.5 pt-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl transition-colors"
                    style={{ background: "#222", color: "#9ca3af", border: "1px solid #333" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#2a2a2a"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#222"; e.currentTarget.style.color = "#9ca3af"; }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid #2a2a2a" }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Nhập câu hỏi..."
                disabled={loading}
                className="input-dark flex-1 text-sm py-2"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: "#FFD814" }}>
                <Send size={14} className="text-[#131921]" />
              </button>
            </div>
            <div className="text-center text-[10px] text-gray-600 mt-2">Powered by Claude AI · Đăng Khương Academy</div>
          </div>
        </div>
      )}
    </>
  );
}
