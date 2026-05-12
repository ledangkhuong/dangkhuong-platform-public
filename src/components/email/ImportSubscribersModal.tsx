"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Upload, FileText, Check, AlertTriangle, Loader2 } from "lucide-react";

interface EmailList {
  id: string;
  name: string;
}

interface ImportSubscribersModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ColumnMapping {
  email: number;
  name: number;
  phone: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

export default function ImportSubscribersModal({
  open,
  onClose,
  onSuccess,
}: ImportSubscribersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    email: -1,
    name: -1,
    phone: -1,
  });
  const [listId, setListId] = useState("");
  const [lists, setLists] = useState<EmailList[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/email/lists")
        .then((r) => r.json())
        .then((data) => {
          if (data.lists) setLists(data.lists);
        })
        .catch(() => {});
    }
  }, [open]);

  const resetState = useCallback(() => {
    setFile(null);
    setCsvRows([]);
    setHeaders([]);
    setColumnMapping({ email: -1, name: -1, phone: -1 });
    setListId("");
    setImporting(false);
    setProgress(0);
    setResult(null);
    setError("");
    setDragOver(false);
  }, []);

  const parseCSV = useCallback((text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      setError("File CSV phải có ít nhất 1 dòng header và 1 dòng dữ liệu");
      return;
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerRow = parseLine(lines[0]);
    setHeaders(headerRow);

    const dataRows = lines.slice(1).map(parseLine);
    setCsvRows(dataRows);

    // Auto-detect columns
    const mapping: ColumnMapping = { email: -1, name: -1, phone: -1 };
    headerRow.forEach((h, i) => {
      const lower = h.toLowerCase().trim();
      if (
        lower === "email" ||
        lower === "e-mail" ||
        lower === "email_address"
      ) {
        mapping.email = i;
      } else if (
        lower === "name" ||
        lower === "full_name" ||
        lower === "fullname" ||
        lower.includes("tên") ||
        lower.includes("ten") ||
        lower === "họ và tên" ||
        lower === "ho va ten"
      ) {
        mapping.name = i;
      } else if (
        lower === "phone" ||
        lower === "phone_number" ||
        lower.includes("điện thoại") ||
        lower.includes("dien thoai") ||
        lower === "sđt" ||
        lower === "sdt"
      ) {
        mapping.phone = i;
      }
    });
    setColumnMapping(mapping);
    setError("");
  }, []);

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Chỉ chấp nhận file .csv");
        return;
      }
      setFile(selectedFile);
      setResult(null);
      setError("");

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(selectedFile);
    },
    [parseCSV]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const handleImport = async () => {
    if (!file || columnMapping.email < 0) {
      setError("Vui lòng chọn cột email");
      return;
    }

    setImporting(true);
    setProgress(10);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email_column", String(columnMapping.email));
      formData.append("name_column", String(columnMapping.name));
      formData.append("phone_column", String(columnMapping.phone));
      if (listId) formData.append("list_id", listId);

      setProgress(40);

      const res = await fetch("/api/email/subscribers/import", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi khi import");
      }

      const data = await res.json();
      setProgress(100);
      setResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? 0,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi khi import");
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  const previewRows = csvRows.slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          resetState();
          onClose();
        }
      }}
    >
      <div
        className="card-dark w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{
            borderBottom: "1px solid #2a2a2a",
            background: "#1a1a1a",
          }}
        >
          <h2 className="text-white font-semibold text-base">
            Import subscribers từ CSV
          </h2>
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div
              className="text-sm px-3 py-2 rounded-lg flex items-center gap-2"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className="px-4 py-3 rounded-lg"
              style={{
                background: "rgba(212,168,67,0.1)",
                border: "1px solid rgba(212,168,67,0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Check size={16} className="text-[#D4A843]" />
                <span className="text-[#D4A843] font-semibold text-sm">
                  Import hoàn tất!
                </span>
              </div>
              <div className="text-sm text-gray-300">
                Đã import{" "}
                <span className="text-white font-medium">
                  {result.imported}
                </span>{" "}
                subscribers.
                {result.skipped > 0 && (
                  <>
                    {" "}
                    <span className="text-[#f59e0b]">
                      {result.skipped}
                    </span>{" "}
                    bị bỏ qua (email trùng).
                  </>
                )}
                {result.errors > 0 && (
                  <>
                    {" "}
                    <span className="text-[#ef4444]">{result.errors}</span> lỗi.
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  resetState();
                  onClose();
                }}
                className="btn-green text-sm mt-3 w-full justify-center py-2"
              >
                Đóng
              </button>
            </div>
          )}

          {/* File upload area */}
          {!result && (
            <>
              {!file ? (
                <div
                  className="rounded-xl p-8 text-center cursor-pointer transition-colors"
                  style={{
                    border: `2px dashed ${dragOver ? "#D4A843" : "#2a2a2a"}`,
                    background: dragOver
                      ? "rgba(212,168,67,0.05)"
                      : "#151515",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Upload
                    size={32}
                    className="mx-auto mb-3"
                    style={{ color: dragOver ? "#D4A843" : "#6b7280" }}
                  />
                  <p className="text-white text-sm font-medium mb-1">
                    Kéo thả file CSV vào đây
                  </p>
                  <p className="text-gray-500 text-xs">
                    hoặc click để chọn file (.csv)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* Selected file */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-lg"
                    style={{
                      background: "#151515",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    <FileText size={18} className="text-[#D4A843] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {file.name}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {csvRows.length} dòng dữ liệu
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setCsvRows([]);
                        setHeaders([]);
                        setColumnMapping({
                          email: -1,
                          name: -1,
                          phone: -1,
                        });
                      }}
                      className="text-gray-500 hover:text-white text-xs"
                    >
                      Đổi file
                    </button>
                  </div>

                  {/* Column mapping */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">
                      Ánh xạ cột
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Email <span className="text-red-400">*</span>
                        </label>
                        <select
                          className="input-dark text-xs"
                          value={columnMapping.email}
                          onChange={(e) =>
                            setColumnMapping((m) => ({
                              ...m,
                              email: Number(e.target.value),
                            }))
                          }
                        >
                          <option value={-1}>-- Chọn --</option>
                          {headers.map((h, i) => (
                            <option key={i} value={i}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Tên
                        </label>
                        <select
                          className="input-dark text-xs"
                          value={columnMapping.name}
                          onChange={(e) =>
                            setColumnMapping((m) => ({
                              ...m,
                              name: Number(e.target.value),
                            }))
                          }
                        >
                          <option value={-1}>-- Bỏ qua --</option>
                          {headers.map((h, i) => (
                            <option key={i} value={i}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          SĐT
                        </label>
                        <select
                          className="input-dark text-xs"
                          value={columnMapping.phone}
                          onChange={(e) =>
                            setColumnMapping((m) => ({
                              ...m,
                              phone: Number(e.target.value),
                            }))
                          }
                        >
                          <option value={-1}>-- Bỏ qua --</option>
                          {headers.map((h, i) => (
                            <option key={i} value={i}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  {previewRows.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-white mb-2">
                        Xem trước ({Math.min(5, csvRows.length)}/{csvRows.length} dòng)
                      </h3>
                      <div
                        className="rounded-lg overflow-hidden"
                        style={{ border: "1px solid #2a2a2a" }}
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr
                                style={{
                                  borderBottom: "1px solid #2a2a2a",
                                  background: "#151515",
                                }}
                              >
                                {headers.map((h, i) => (
                                  <th
                                    key={i}
                                    className="text-left text-gray-500 font-medium px-3 py-2 whitespace-nowrap"
                                  >
                                    {h}
                                    {i === columnMapping.email && (
                                      <span className="text-[#D4A843] ml-1">
                                        (email)
                                      </span>
                                    )}
                                    {i === columnMapping.name && (
                                      <span className="text-[#3b82f6] ml-1">
                                        (tên)
                                      </span>
                                    )}
                                    {i === columnMapping.phone && (
                                      <span className="text-[#f59e0b] ml-1">
                                        (sđt)
                                      </span>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewRows.map((row, ri) => (
                                <tr
                                  key={ri}
                                  style={{
                                    borderBottom:
                                      ri < previewRows.length - 1
                                        ? "1px solid #222"
                                        : "none",
                                  }}
                                >
                                  {row.map((cell, ci) => (
                                    <td
                                      key={ci}
                                      className="px-3 py-1.5 text-gray-300 whitespace-nowrap"
                                    >
                                      {cell || (
                                        <span className="text-gray-600">
                                          --
                                        </span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target list */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">
                      Thêm vào danh sách{" "}
                      <span className="text-gray-600 text-xs">(tuỳ chọn)</span>
                    </label>
                    <select
                      className="input-dark text-sm"
                      value={listId}
                      onChange={(e) => setListId(e.target.value)}
                    >
                      <option value="">-- Không chọn --</option>
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Progress bar */}
                  {importing && (
                    <div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${progress}%`,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 text-center">
                        Đang import... {progress}%
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        resetState();
                        onClose();
                      }}
                      className="flex-1 py-2.5 text-sm font-medium text-gray-400 rounded-lg transition-colors hover:text-white"
                      style={{
                        background: "#1f1f1f",
                        border: "1px solid #2a2a2a",
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing || columnMapping.email < 0}
                      className="btn-green flex-1 justify-center text-sm py-2.5"
                    >
                      {importing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Upload size={15} /> Import {csvRows.length} dòng
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
