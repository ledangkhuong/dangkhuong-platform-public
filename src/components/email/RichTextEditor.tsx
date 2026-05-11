"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ComponentProps } from "react";

// Dynamic import with SSR disabled — Quill requires browser DOM
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        background: "#1f1f1f",
        border: "1px solid #2a2a2a",
        minHeight: 300,
      }}
    >
      <p className="text-gray-500 text-sm">Dang tai trinh soan thao...</p>
    </div>
  ),
});

// Import Quill styles
import "react-quill-new/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhap noi dung email...",
  minHeight = 300,
}: RichTextEditorProps) {
  // Quill modules config — memoized to prevent re-renders
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote"],
        ["link", "image"],
        ["clean"],
      ],
      clipboard: {
        matchVisual: false,
      },
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "list",
    "blockquote",
    "link",
    "image",
  ];

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight }}
      />

      {/* Dark theme overrides scoped to this wrapper */}
      <style jsx global>{`
        .rich-text-editor-wrapper .ql-toolbar.ql-snow {
          background: #252525;
          border: 1px solid #2a2a2a;
          border-radius: 8px 8px 0 0;
          padding: 8px;
        }

        .rich-text-editor-wrapper .ql-container.ql-snow {
          background: #1f1f1f;
          border: 1px solid #2a2a2a;
          border-top: none;
          border-radius: 0 0 8px 8px;
          color: #f5f5f5;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
          font-size: 14px;
          min-height: ${minHeight}px;
        }

        .rich-text-editor-wrapper .ql-editor {
          min-height: ${minHeight - 20}px;
          padding: 16px;
          line-height: 1.6;
          color: #f5f5f5;
        }

        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #555;
          font-style: normal;
        }

        /* Toolbar buttons */
        .rich-text-editor-wrapper .ql-snow .ql-stroke {
          stroke: #9ca3af;
        }
        .rich-text-editor-wrapper .ql-snow .ql-fill {
          fill: #9ca3af;
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker-label {
          color: #9ca3af;
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker-label::before {
          color: #9ca3af;
        }

        /* Toolbar button hover */
        .rich-text-editor-wrapper .ql-snow button:hover .ql-stroke,
        .rich-text-editor-wrapper .ql-snow .ql-picker-label:hover .ql-stroke {
          stroke: #22c55e;
        }
        .rich-text-editor-wrapper .ql-snow button:hover .ql-fill,
        .rich-text-editor-wrapper .ql-snow .ql-picker-label:hover .ql-fill {
          fill: #22c55e;
        }
        .rich-text-editor-wrapper .ql-snow button:hover,
        .rich-text-editor-wrapper .ql-snow .ql-picker-label:hover {
          color: #22c55e;
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker-label:hover::before {
          color: #22c55e;
        }

        /* Active toolbar buttons */
        .rich-text-editor-wrapper .ql-snow button.ql-active .ql-stroke {
          stroke: #22c55e;
        }
        .rich-text-editor-wrapper .ql-snow button.ql-active .ql-fill {
          fill: #22c55e;
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker-item.ql-selected,
        .rich-text-editor-wrapper .ql-snow .ql-picker-label.ql-active {
          color: #22c55e;
        }
        .rich-text-editor-wrapper
          .ql-snow
          .ql-picker-label.ql-active::before {
          color: #22c55e;
        }

        /* Dropdown menus */
        .rich-text-editor-wrapper .ql-snow .ql-picker-options {
          background: #252525;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker-item {
          color: #9ca3af;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker-item:hover {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.08);
        }
        .rich-text-editor-wrapper .ql-snow .ql-picker-item.ql-selected {
          color: #22c55e;
        }

        /* Color picker */
        .rich-text-editor-wrapper .ql-snow .ql-color-picker .ql-picker-options {
          padding: 6px;
          width: auto;
        }

        /* Links */
        .rich-text-editor-wrapper .ql-editor a {
          color: #22c55e;
          text-decoration: underline;
        }

        /* Blockquote */
        .rich-text-editor-wrapper .ql-editor blockquote {
          border-left: 3px solid #22c55e;
          padding-left: 12px;
          color: #9ca3af;
        }

        /* Headers */
        .rich-text-editor-wrapper .ql-editor h1 {
          color: #ffffff;
          font-size: 1.75em;
          font-weight: 700;
        }
        .rich-text-editor-wrapper .ql-editor h2 {
          color: #ffffff;
          font-size: 1.4em;
          font-weight: 700;
        }
        .rich-text-editor-wrapper .ql-editor h3 {
          color: #f3f4f6;
          font-size: 1.15em;
          font-weight: 600;
        }

        /* Tooltip (link input) */
        .rich-text-editor-wrapper .ql-snow .ql-tooltip {
          background: #252525;
          border: 1px solid #2a2a2a;
          color: #f5f5f5;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          padding: 8px 12px;
        }
        .rich-text-editor-wrapper .ql-snow .ql-tooltip input[type="text"] {
          background: #1f1f1f;
          border: 1px solid #2a2a2a;
          color: #f5f5f5;
          border-radius: 4px;
          padding: 4px 8px;
          outline: none;
        }
        .rich-text-editor-wrapper .ql-snow .ql-tooltip input[type="text"]:focus {
          border-color: #22c55e;
        }
        .rich-text-editor-wrapper .ql-snow .ql-tooltip a {
          color: #22c55e;
        }
        .rich-text-editor-wrapper .ql-snow .ql-tooltip a:hover {
          color: #16a34a;
        }

        /* Lists */
        .rich-text-editor-wrapper .ql-editor ol,
        .rich-text-editor-wrapper .ql-editor ul {
          padding-left: 1.5em;
        }
        .rich-text-editor-wrapper .ql-editor li {
          color: #f5f5f5;
        }
      `}</style>
    </div>
  );
}
