"use client";

import { useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { sanitizeHtml } from "../lib/sanitizeHtml";

export default function PostComposer({ userId, username, avatarUrl, onPosted }) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const [toolbar, setToolbar] = useState({ visible: false, top: 0, left: 0 });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  function handleSelectionChange() {
    const selection = window.getSelection();

    if (
      !selection ||
      selection.isCollapsed ||
      !editorRef.current ||
      !selection.anchorNode ||
      !editorRef.current.contains(selection.anchorNode)
    ) {
      setToolbar((t) => (t.visible ? { ...t, visible: false } : t));
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = editorRef.current.parentElement.getBoundingClientRect();

    setToolbar({
      visible: true,
      top: rect.top - containerRect.top - 44,
      left: rect.left - containerRect.left + rect.width / 2,
    });
  }

  function applyFormat(command) {
    document.execCommand(command, false, null);
    editorRef.current?.focus();
  }

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Изображение слишком большое (максимум 5 МБ)");
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePublish() {
    const rawHtml = editorRef.current?.innerHTML || "";
    const textOnly = editorRef.current?.textContent?.trim() || "";

    if (!textOnly && !imageFile) {
      setError("Напишите что-нибудь или прикрепите изображение");
      return;
    }

    setPosting(true);
    setError("");

    let imageUrl = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, imageFile);

      if (uploadError) {
        setError("Ошибка загрузки изображения: " + uploadError.message);
        setPosting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-images").getPublicUrl(path);
      imageUrl = publicUrl;
    }

    const { data, error: insertError } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        username,
        avatar_url: avatarUrl || null,
        content_html: sanitizeHtml(rawHtml),
        image_url: imageUrl,
      })
      .select()
      .single();

    setPosting(false);

    if (insertError) {
      setError("Ошибка публикации: " + insertError.message);
      return;
    }

    if (editorRef.current) editorRef.current.innerHTML = "";
    removeImage();
    onPosted?.(data);
  }

  return (
    <div className="rounded-lg border border-paper/10 bg-panel p-4">
      <div className="relative">
        {toolbar.visible && (
          <div
            className="absolute z-10 flex -translate-x-1/2 gap-1 rounded-lg border border-paper/10 bg-ink px-2 py-1 shadow-xl"
            style={{ top: toolbar.top, left: toolbar.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              onClick={() => applyFormat("bold")}
              className="rounded px-2 py-1 text-sm font-bold text-paper hover:bg-panel"
            >
              Ж
            </button>
            <button
              onClick={() => applyFormat("italic")}
              className="rounded px-2 py-1 text-sm italic text-paper hover:bg-panel"
            >
              К
            </button>
            <button
              onClick={() => applyFormat("underline")}
              className="rounded px-2 py-1 text-sm text-paper underline hover:bg-panel"
            >
              Ч
            </button>
            <button
              onClick={() => applyFormat("strikeThrough")}
              className="rounded px-2 py-1 text-sm text-paper line-through hover:bg-panel"
            >
              З
            </button>
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          data-placeholder="Поделитесь чем-нибудь..."
          className="min-h-[80px] rounded-lg bg-ink px-4 py-3 text-paper outline-none focus:ring-1 focus:ring-sakura empty:before:text-muted empty:before:content-[attr(data-placeholder)]"
        />
      </div>

      {imagePreview && (
        <div className="relative mt-3 inline-block">
          <img
            src={imagePreview}
            alt=""
            className="max-h-56 rounded-lg object-cover"
          />
          <button
            onClick={removeImage}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-paper"
          >
            ✕
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-sakura">{error}</p>}

      <div className="mt-3 flex items-center justify-between">
        <label className="cursor-pointer text-sm text-muted transition hover:text-paper">
          📷 Добавить изображение
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImagePick}
            className="hidden"
          />
        </label>

        <button
          onClick={handlePublish}
          disabled={posting}
          className="rounded-full bg-sakura px-5 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {posting ? "Публикуем..." : "Опубликовать"}
        </button>
      </div>
    </div>
  );
}
