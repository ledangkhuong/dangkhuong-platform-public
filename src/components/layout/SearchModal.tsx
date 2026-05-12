"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, BookOpen, FileText, MessageSquare, Clock, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResultItem {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

export interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "dk_recent_searches";
const MAX_RECENT = 5;

const TYPE_META: Record<string, { label: string; Icon: React.ElementType }> = {
  courses: { label: "Khoá học", Icon: BookOpen },
  blog: { label: "Blog", Icon: FileText },
  community: { label: "Cộng đồng", Icon: MessageSquare },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentSearches().filter((q) => q !== query);
    const updated = [query, ...existing].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Hook: global keyboard shortcut Ctrl+K / Cmd+K
// ---------------------------------------------------------------------------

export function useSearchShortcut(onOpen: () => void): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpen]);
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-lg" style={{ background: "#2a2a2a" }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 rounded" style={{ background: "#2a2a2a", width: "60%" }} />
        <div className="h-2.5 rounded" style={{ background: "#222", width: "40%" }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result row
// ---------------------------------------------------------------------------

interface ResultRowProps {
  item: SearchResultItem;
  selected: boolean;
  onSelect: () => void;
}

function ResultRow({ item, selected, onSelect }: ResultRowProps) {
  const meta = TYPE_META[item.type] ?? { label: item.type, Icon: Search };
  const { Icon } = meta;

  return (
    <button
      onMouseDown={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: selected ? "#1f1f1f" : "transparent",
        borderLeft: selected ? "2px solid #D4A843" : "2px solid transparent",
      }}
    >
      <span
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
      >
        <Icon size={15} className="text-[#D4A843]" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-white truncate">{item.title}</span>
        {item.subtitle && (
          <span className="block text-xs text-gray-500 truncate mt-0.5">{item.subtitle}</span>
        )}
      </span>
      <ArrowRight size={14} className="flex-shrink-0 text-gray-600" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// SearchModal
// ---------------------------------------------------------------------------

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Flat list of navigable items (results or recent)
  const showRecent = query.trim().length < 2;

  // Load recent searches when modal opens
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Auto-focus input
  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSelectedIndex(0);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&type=all`
        );
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: SearchResultItem[]; total: number };
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Navigate to a result
  const navigateTo = useCallback(
    (item: SearchResultItem) => {
      saveRecentSearch(item.title);
      onClose();
      router.push(item.url);
    },
    [onClose, router]
  );

  // Navigate to a recent search string
  const runRecent = useCallback((term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      const listLen = showRecent ? recentSearches.length : results.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, listLen - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (showRecent) {
          const term = recentSearches[selectedIndex];
          if (term) runRecent(term);
        } else {
          const item = results[selectedIndex];
          if (item) navigateTo(item);
        }
      }
    },
    [onClose, showRecent, recentSearches, results, selectedIndex, runRecent, navigateTo]
  );

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResultItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  // Build flat index map for keyboard navigation
  const flatResults = Object.values(grouped).flat();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onMouseDown={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 w-full max-w-lg left-1/2 top-[15%]"
        style={{ transform: "translateX(-50%)" }}
      >
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        >
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <Search size={18} className="flex-shrink-0 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm kiếm khoá học, bài viết, cộng đồng..."
              className="flex-1 bg-transparent text-white placeholder-gray-600 text-base py-4 outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                onMouseDown={() => setQuery("")}
                className="flex-shrink-0 text-gray-600 hover:text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <kbd
              className="flex-shrink-0 text-[10px] text-gray-600 px-1.5 py-0.5 rounded"
              style={{ background: "#2a2a2a" }}
            >
              Esc để đóng
            </kbd>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {/* Loading skeletons */}
            {loading && (
              <div className="py-2">
                {[1, 2, 3].map((i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            )}

            {/* Recent searches (when input is empty) */}
            {!loading && showRecent && recentSearches.length > 0 && (
              <div className="py-2">
                <p
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "#555" }}
                >
                  Tìm kiếm gần đây
                </p>
                {recentSearches.map((term, i) => (
                  <button
                    key={term}
                    onMouseDown={() => runRecent(term)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      background: selectedIndex === i ? "#1f1f1f" : "transparent",
                      borderLeft:
                        selectedIndex === i ? "2px solid #D4A843" : "2px solid transparent",
                    }}
                  >
                    <Clock size={14} className="flex-shrink-0 text-gray-600" />
                    <span className="text-sm text-gray-300">{term}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state for recent */}
            {!loading && showRecent && recentSearches.length === 0 && (
              <div className="py-10 text-center text-gray-600 text-sm">
                Nhập ít nhất 2 ký tự để tìm kiếm
              </div>
            )}

            {/* Results */}
            {!loading && !showRecent && flatResults.length > 0 && (
              <div className="py-2">
                {Object.entries(grouped).map(([type, items]) => {
                  const meta = TYPE_META[type] ?? { label: type };
                  return (
                    <div key={type}>
                      <p
                        className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "#555" }}
                      >
                        {meta.label}
                      </p>
                      {items.map((item) => {
                        const flatIdx = flatResults.indexOf(item);
                        return (
                          <ResultRow
                            key={`${item.type}-${item.id}`}
                            item={item}
                            selected={selectedIndex === flatIdx}
                            onSelect={() => navigateTo(item)}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {!loading && !showRecent && flatResults.length === 0 && (
              <div className="py-10 text-center text-gray-600 text-sm">
                Không tìm thấy kết quả cho&nbsp;
                <span className="text-gray-400">&ldquo;{query}&rdquo;</span>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div
            className="flex items-center gap-4 px-4 py-2.5 text-[11px] text-gray-600"
            style={{ borderTop: "1px solid #222" }}
          >
            <span>
              <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: "#2a2a2a" }}>↑↓</kbd>
              &nbsp;di chuyển
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: "#2a2a2a" }}>↵</kbd>
              &nbsp;chọn
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: "#2a2a2a" }}>Esc</kbd>
              &nbsp;đóng
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
