"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { useCallback, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Upload as UploadIcon,
  Film as YoutubeIcon,
  Undo,
  Redo,
  Minus,
  Loader2,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function MenuButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-[#D4A843]/20 text-[#D4A843]"
          : "text-gray-400 hover:text-white hover:bg-white/10"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung mô tả khoá học...",
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#D4A843] underline hover:text-[#e8c066]" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full my-4" },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        nocookie: true,
        controls: true,
        HTMLAttributes: { class: "rounded-lg my-4 max-w-full aspect-video" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  });

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Nhập URL:", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Nhập URL hình ảnh:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const triggerImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(
      "Dán link YouTube (vd: https://www.youtube.com/watch?v=xxxx hoặc https://youtu.be/xxxx):"
    );
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    // Basic YouTube URL validation
    if (!/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\//i.test(trimmed)) {
      alert("Link không phải YouTube. Vui lòng dán link YouTube hợp lệ.");
      return;
    }
    editor.commands.setYoutubeVideo({
      src: trimmed,
      width: 640,
      height: 360,
    });
  }, [editor]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert("Ảnh quá lớn. Tối đa 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload/blog-image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          editor.chain().focus().setImage({ src: data.url }).run();
        } else {
          alert(data.error || "Upload thất bại.");
        }
      } catch {
        alert("Lỗi upload ảnh. Vui lòng thử lại.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#151515", border: "1px solid #2a2a2a" }}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5"
        style={{ borderBottom: "1px solid #2a2a2a", background: "#1a1a1a" }}
      >
        {/* Text formatting */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="In đậm (Ctrl+B)"
        >
          <Bold size={15} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="In nghiêng (Ctrl+I)"
        >
          <Italic size={15} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Gạch chân (Ctrl+U)"
        >
          <UnderlineIcon size={15} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Gạch ngang"
        >
          <Strikethrough size={15} />
        </MenuButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Headings */}
        <MenuButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="Tiêu đề lớn"
        >
          <Heading2 size={15} />
        </MenuButton>
        <MenuButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          title="Tiêu đề nhỏ"
        >
          <Heading3 size={15} />
        </MenuButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Lists */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Danh sách"
        >
          <List size={15} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Danh sách đánh số"
        >
          <ListOrdered size={15} />
        </MenuButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Block elements */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Trích dẫn"
        >
          <Quote size={15} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code block"
        >
          <Code size={15} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Đường kẻ ngang"
        >
          <Minus size={15} />
        </MenuButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Media */}
        <MenuButton onClick={addLink} active={editor.isActive("link")} title="Thêm link">
          <LinkIcon size={15} />
        </MenuButton>
        <MenuButton onClick={addImage} title="Thêm ảnh từ URL">
          <ImageIcon size={15} />
        </MenuButton>
        <MenuButton
          onClick={triggerImageUpload}
          disabled={uploading}
          title="Upload ảnh từ máy tính (tối đa 10MB)"
        >
          {uploading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <UploadIcon size={15} />
          )}
        </MenuButton>
        <MenuButton onClick={addYoutube} title="Nhúng video YouTube">
          <YoutubeIcon size={15} />
        </MenuButton>

        <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

        {/* Undo/Redo */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Hoàn tác (Ctrl+Z)"
        >
          <Undo size={15} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Làm lại (Ctrl+Y)"
        >
          <Redo size={15} />
        </MenuButton>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Editor styles */}
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #555;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror {
          color: #e5e5e5;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror p {
          margin-bottom: 0.75rem;
          line-height: 1.7;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          margin-bottom: 0.25rem;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #D4A843;
          padding-left: 1rem;
          color: #aaa;
          font-style: italic;
          margin: 1rem 0;
        }
        .ProseMirror pre {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-family: monospace;
          font-size: 0.85rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .ProseMirror code {
          background: #2a2a2a;
          padding: 0.15rem 0.35rem;
          border-radius: 0.25rem;
          font-size: 0.85rem;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .ProseMirror iframe,
        .ProseMirror div[data-youtube-video] {
          max-width: 100%;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .ProseMirror div[data-youtube-video] iframe {
          width: 100%;
          aspect-ratio: 16 / 9;
          height: auto;
          border-radius: 0.5rem;
          border: none;
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #2a2a2a;
          margin: 1.5rem 0;
        }
        .ProseMirror a {
          color: #D4A843;
          text-decoration: underline;
        }
        .ProseMirror a:hover {
          color: #e8c066;
        }
        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
