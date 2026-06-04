"use client";

import { useRef } from "react";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandList,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorBubble,
  EditorBubbleItem,
  type JSONContent,
  type EditorInstance,
  handleCommandNavigation,
  createSuggestionItems,
  renderItems,
  Placeholder,
  StarterKit,
  TiptapLink,
  TiptapUnderline,
  TiptapImage,
  Youtube,
  TaskList,
  TaskItem,
  HighlightExtension,
  HorizontalRule,
  Color,
  TextStyle,
  useEditor,
  createImageUpload,
  handleImagePaste,
  handleImageDrop,
  UploadImagesPlugin,
} from "novel";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  TextQuote,
  Minus,
  CheckSquare,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Highlighter,
} from "lucide-react";
import "./novel-editor.css";

// ─── Image upload function ──────────────────────────────────────────────────

const uploadFn = createImageUpload({
  onUpload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload/blog-image", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url;
  },
  validateFn: (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("Ảnh không được vượt quá 2MB");
      return false;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      alert("Chỉ chấp nhận JPEG, PNG, WebP, GIF");
      return false;
    }
    return true;
  },
});

// ─── Extensions ─────────────────────────────────────────────────────────────

const extensions = [
  StarterKit.configure({
    horizontalRule: false,
    codeBlock: {
      HTMLAttributes: { class: "novel-code-block" },
    },
    heading: {
      levels: [1, 2, 3, 4],
    },
    bulletList: {
      HTMLAttributes: { class: "novel-bullet-list" },
    },
    orderedList: {
      HTMLAttributes: { class: "novel-ordered-list" },
    },
    blockquote: {
      HTMLAttributes: { class: "novel-blockquote" },
    },
  }),
  HorizontalRule,
  TiptapLink.configure({
    HTMLAttributes: {
      class: "novel-link",
      target: "_blank",
      rel: "noopener noreferrer nofollow",
    },
    openOnClick: false,
  }),
  TiptapImage.configure({
    HTMLAttributes: { class: "novel-image" },
    allowBase64: true,
  }),
  TiptapUnderline,
  TextStyle,
  Color,
  HighlightExtension.configure({ multicolor: true }),
  Youtube.configure({
    HTMLAttributes: { class: "novel-youtube" },
    inline: false,
  }),
  TaskList.configure({
    HTMLAttributes: { class: "novel-task-list" },
  }),
  TaskItem.configure({
    nested: true,
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return `Heading ${node.attrs.level}`;
      }
      return "Nhấn '/' để xem lệnh, hoặc bắt đầu viết...";
    },
    includeChildren: true,
  }),
  UploadImagesPlugin({ imageClass: "novel-image" }) as any,
];

// ─── Slash command suggestions ──────────────────────────────────────────────

const suggestionItems = createSuggestionItems([
  {
    title: "Heading 1",
    description: "Tiêu đề chính (H1)",
    searchTerms: ["title", "big", "h1", "tieu de"],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Tiêu đề phụ (H2)",
    searchTerms: ["subtitle", "h2", "tieu de phu"],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Tiêu đề nhỏ (H3)",
    searchTerms: ["h3", "small heading"],
    icon: <Heading3 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Danh sách gạch đầu dòng",
    searchTerms: ["unordered", "bullet", "ul", "danh sach"],
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Danh sách đánh số",
    searchTerms: ["ordered", "ol", "number", "so"],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Task List",
    description: "Danh sách checkbox",
    searchTerms: ["todo", "task", "checkbox", "check"],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }) => {
      (editor.chain().focus().deleteRange(range) as any).toggleTaskList?.()?.run() ?? editor.chain().focus().deleteRange(range).run();
    },
  },
  {
    title: "Quote",
    description: "Khối trích dẫn",
    searchTerms: ["blockquote", "quote", "trich dan"],
    icon: <TextQuote size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Khối mã nguồn",
    searchTerms: ["code", "codeblock", "ma nguon"],
    icon: <Code size={18} />,
    command: ({ editor, range }) => {
      (editor.chain().focus().deleteRange(range) as any).toggleCodeBlock?.()?.run() ?? editor.chain().focus().deleteRange(range).run();
    },
  },
  {
    title: "Divider",
    description: "Đường kẻ phân cách",
    searchTerms: ["hr", "divider", "separator", "duong ke"],
    icon: <Minus size={18} />,
    command: ({ editor, range }) => {
      (editor.chain().focus().deleteRange(range) as any).setHorizontalRule?.()?.run() ?? editor.chain().focus().deleteRange(range).run();
    },
  },
  {
    title: "Image",
    description: "Tải ảnh lên (tối đa 2MB)",
    searchTerms: ["image", "photo", "picture", "anh", "hinh"],
    icon: <ImageIcon size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp,image/gif";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert("Ảnh không được vượt quá 2MB"); return; }
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/blog-image", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok) {
          editor.chain().focus().setImage({ src: data.url }).run();
        } else {
          alert(data.error || "Lỗi tải ảnh");
        }
      };
      input.click();
    },
  },
  {
    title: "YouTube",
    description: "Nhúng video YouTube",
    searchTerms: ["youtube", "video", "embed"],
    icon: <Video size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt("Nhập URL YouTube:");
      if (url) {
        (editor.chain().focus() as any).setYoutubeVideo?.({ src: url })?.run();
      }
    },
  },
]);

// ─── Toolbar component (uses useEditor hook inside EditorContent) ───────────

function ToolbarButtons() {
  const { editor } = useEditor();
  if (!editor) return null;

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert("Ảnh không được vượt quá 2MB");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/blog-image", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        editor.chain().focus().setImage({ src: data.url }).run();
      } else {
        alert(data.error || "Lỗi tải ảnh");
      }
    };
    input.click();
  };

  const handleLinkInsert = () => {
    const url = window.prompt("Nhập URL:", "https://");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="novel-toolbar">
      {/* Text style select */}
      <select
        className="novel-toolbar-select"
        value={
          editor.isActive("heading", { level: 1 }) ? "h1" :
          editor.isActive("heading", { level: 2 }) ? "h2" :
          editor.isActive("heading", { level: 3 }) ? "h3" :
          "paragraph"
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === "paragraph") {
            editor.chain().focus().setParagraph().run();
          } else {
            const level = parseInt(val.replace("h", "")) as 1 | 2 | 3;
            editor.chain().focus().toggleHeading({ level }).run();
          }
        }}
      >
        <option value="paragraph">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <div className="novel-toolbar-divider" />

      {/* Bold */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("bold") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold size={16} />
      </button>

      {/* Italic */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("italic") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic size={16} />
      </button>

      {/* Underline */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("underline") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <Underline size={16} />
      </button>

      {/* Strikethrough */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("strike") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </button>

      <div className="novel-toolbar-divider" />

      {/* Bullet List */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("bulletList") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List size={16} />
      </button>

      {/* Numbered List */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("orderedList") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>

      <div className="novel-toolbar-divider" />

      {/* Blockquote */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("blockquote") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        <TextQuote size={16} />
      </button>

      {/* Code Block */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("codeBlock") ? "active" : ""}`}
        onClick={() => (editor.chain().focus() as any).toggleCodeBlock?.()?.run()}
        title="Code Block"
      >
        <Code size={16} />
      </button>

      <div className="novel-toolbar-divider" />

      {/* Link */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("link") ? "active" : ""}`}
        onClick={handleLinkInsert}
        title="Link"
      >
        <LinkIcon size={16} />
      </button>

      {/* Image Upload */}
      <button
        type="button"
        className="novel-toolbar-btn"
        onClick={handleImageUpload}
        title="Upload Image"
      >
        <ImageIcon size={16} />
      </button>

      <div className="novel-toolbar-divider" />

      {/* Divider / Horizontal Rule */}
      <button
        type="button"
        className="novel-toolbar-btn"
        onClick={() => (editor.chain().focus() as any).setHorizontalRule?.()?.run()}
        title="Divider"
      >
        <Minus size={16} />
      </button>

      {/* Highlight */}
      <button
        type="button"
        className={`novel-toolbar-btn ${editor.isActive("highlight") ? "active" : ""}`}
        onClick={() => (editor.chain().focus() as any).toggleHighlight?.()?.run()}
        title="Highlight"
      >
        <Highlighter size={16} />
      </button>
    </div>
  );
}

// ─── Main Editor Component ──────────────────────────────────────────────────

interface NovelEditorProps {
  initialContent?: JSONContent;
  initialHtml?: string;
  onChange?: (html: string, json: JSONContent) => void;
}

export default function NovelEditor({ initialContent, initialHtml, onChange }: NovelEditorProps) {
  const commandRef = useRef<HTMLDivElement>(null);

  // Tiptap's EditorProvider accepts both HTML string and JSONContent as `content`.
  // Novel wraps it as `initialContent` → `content`. We cast HTML string if needed.
  const editorContent: JSONContent = initialHtml
    ? (initialHtml as unknown as JSONContent)
    : initialContent || {
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      };

  return (
    <div className="novel-editor-wrapper">
      <EditorRoot>
        <EditorContent
          initialContent={editorContent}
          extensions={extensions}
          className="novel-editor-content"
          editorProps={{
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            attributes: {
              class: "novel-prose focus:outline-none",
            },
          }}
          onUpdate={({ editor }: { editor: EditorInstance }) => {
            const html = editor.getHTML();
            const json = editor.getJSON();
            onChange?.(html, json);
          }}
        >
          {/* ── Static toolbar ── */}
          <ToolbarButtons />

          {/* ── Slash command menu ── */}
          <EditorCommand
            ref={commandRef}
            className="novel-command-menu z-50 overflow-hidden rounded-xl border border-[#333] bg-[#1a1a1a] shadow-2xl transition-all"
          >
            <EditorCommandEmpty className="px-4 py-3 text-sm text-gray-500">
              Không tìm thấy lệnh nào
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  key={item.title}
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-[#252525] transition-colors aria-selected:bg-[#252525]"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg border border-[#333] bg-[#111] text-gray-400">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-200">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          {/* ── Bubble menu (select text to format) ── */}
          <EditorBubble className="novel-bubble-menu flex items-center gap-0.5 rounded-xl border border-[#333] bg-[#1a1a1a] px-1 py-1 shadow-2xl">
            <BubbleBtn
              action={(e) => e.chain().focus().toggleBold().run()}
              isActiveCheck={(e) => e.isActive("bold")}
              tooltip="Bold"
            >
              <Bold size={14} />
            </BubbleBtn>
            <BubbleBtn
              action={(e) => e.chain().focus().toggleItalic().run()}
              isActiveCheck={(e) => e.isActive("italic")}
              tooltip="Italic"
            >
              <Italic size={14} />
            </BubbleBtn>
            <BubbleBtn
              action={(e) => e.chain().focus().toggleUnderline().run()}
              isActiveCheck={(e) => e.isActive("underline")}
              tooltip="Underline"
            >
              <Underline size={14} />
            </BubbleBtn>
            <BubbleBtn
              action={(e) => e.chain().focus().toggleStrike().run()}
              isActiveCheck={(e) => e.isActive("strike")}
              tooltip="Strikethrough"
            >
              <Strikethrough size={14} />
            </BubbleBtn>
            <BubbleBtn
              action={(e) => e.chain().focus().toggleCode().run()}
              isActiveCheck={(e) => e.isActive("code")}
              tooltip="Code"
            >
              <Code size={14} />
            </BubbleBtn>
            <BubbleBtn
              action={(e) => (e.chain().focus() as any).toggleHighlight?.()?.run()}
              isActiveCheck={(e) => e.isActive("highlight")}
              tooltip="Highlight"
            >
              <Highlighter size={14} />
            </BubbleBtn>

            <div className="w-px h-5 bg-[#333] mx-1" />

            <BubbleBtn
              action={(e) => {
                const url = window.prompt("Nhập URL:", "https://");
                if (url) e.chain().focus().setLink({ href: url }).run();
              }}
              isActiveCheck={(e) => e.isActive("link")}
              tooltip="Link"
            >
              <LinkIcon size={14} />
            </BubbleBtn>
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    </div>
  );
}

// ─── Bubble menu button component ───────────────────────────────────────────

function BubbleBtn({
  children,
  action,
  isActiveCheck,
  tooltip,
}: {
  children: React.ReactNode;
  action: (editor: EditorInstance) => void;
  isActiveCheck?: (editor: EditorInstance) => boolean;
  tooltip?: string;
}) {
  return (
    <EditorBubbleItem
      onSelect={(editor) => action(editor)}
    >
      <button
        type="button"
        title={tooltip}
        className="novel-bubble-btn"
      >
        {children}
      </button>
    </EditorBubbleItem>
  );
}
