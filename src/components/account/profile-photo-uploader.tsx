"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Badge } from "@/components/ui";

type Props = {
  userId: string;
  name?: string | null;
  currentUrl?: string | null;
  displayName: string;
  email: string;
  communityLabel: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const OUTPUT_SIZE = 512;
const PREVIEW_SIZE = 256;

export function ProfilePhotoUploader({ userId, name, currentUrl, displayName, email, communityLabel }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl ?? null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAvatarUrl(currentUrl ?? null), [currentUrl]);

  useEffect(() => {
    if (!previewUrl) return;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setOffset({ x: 0, y: 0 });
      setZoom(1);
    };
    image.onerror = () => setStatus("Could not preview that image. Please choose another photo.");
    image.src = previewUrl;
  }, [previewUrl]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectFile(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setStatus("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus("Choose an image smaller than 5 MB.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStatus(null);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not prepare image."))), "image/webp", 0.92);
    });
  }

  async function uploadPhoto() {
    const image = imageRef.current;
    if (!image) return;
    setBusy(true);
    setStatus("Uploading photo…");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser could not crop the image.");

      const baseScale = Math.max(OUTPUT_SIZE / image.naturalWidth, OUTPUT_SIZE / image.naturalHeight);
      const scale = baseScale * zoom;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const previewToOutput = OUTPUT_SIZE / PREVIEW_SIZE;
      const x = (OUTPUT_SIZE - width) / 2 + offset.x * previewToOutput;
      const y = (OUTPUT_SIZE - height) / 2 + offset.y * previewToOutput;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(image, x, y, width, height);

      const blob = await canvasToBlob(canvas);
      const path = `${userId}/avatar-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/webp",
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setStatus("Profile photo updated.");
      setPreviewUrl(null);
      imageRef.current = null;
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update profile photo.");
    } finally {
      setBusy(false);
    }
  }

  const transform = `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`;
  const visibleAvatarUrl = previewUrl ?? avatarUrl;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={name} src={visibleAvatarUrl} size={80} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight text-[var(--color-ink)]">{displayName}</p>
          <p className="mt-1 break-words text-sm text-[var(--color-muted)]">{email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{communityLabel}</Badge>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm self-start sm:self-center" onClick={() => fileInputRef.current?.click()}>
          Change photo
        </button>
      </div>

      <div className="border-t border-[var(--color-line)] pt-5">
        <p className="font-display text-base font-semibold text-[var(--color-ink)]">Profile photo</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Update your photo so other members can recognize you.</p>
        <input ref={fileInputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => selectFile(e.target.files?.[0])} />
        <p className="mt-3 text-xs font-semibold text-[var(--color-subtle)]">JPG, PNG or WebP · Max 5 MB</p>
        <p className="text-xs text-[var(--color-subtle)]">Your photo will be cropped to a square.</p>
      </div>

      {previewUrl ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
          <div
            className="relative mx-auto grid h-64 w-64 cursor-grab touch-none place-items-center overflow-hidden rounded-full bg-black/5 active:cursor-grabbing"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
            }}
            onPointerMove={(e) => {
              if (!dragStart) return;
              setOffset({ x: dragStart.ox + e.clientX - dragStart.x, y: dragStart.oy + e.clientY - dragStart.y });
            }}
            onPointerUp={() => setDragStart(null)}
            onPointerLeave={() => setDragStart(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Profile photo crop preview" className="h-full w-full select-none object-cover" style={{ transform }} draggable={false} />
          </div>
          <label className="mt-4 block text-sm font-semibold text-[var(--color-ink)]">
            Zoom
            <input className="mt-2 w-full accent-[var(--color-brand)]" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={uploadPhoto}>{busy ? "Saving…" : "Save photo"}</button>
            <button type="button" className="btn btn-quiet btn-sm" disabled={busy} onClick={() => setPreviewUrl(null)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {status ? <p className="text-sm text-[var(--color-muted)]">{status}</p> : null}
    </div>
  );
}
