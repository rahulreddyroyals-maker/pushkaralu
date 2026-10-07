"use client";

import { useState, useRef } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFirebaseApp } from "@/lib/firebase/client";
import { Button } from "@/components/ui";

interface ImageUploaderProps {
  entityType:
    | "events" | "ghats" | "temples" | "hotels" | "purohits" | "businesses"
    // Sprint 6 admin-managed catalogs (storage.rules must allow staff writes under images/{type}/**)
    | "transport" | "boat-operators" | "boats" | "boat-routes" | "parking" | "restaurants" | "tourism" | "itineraries" | "packages";
  entityId: string;
  images: string[];
  onChange: (images: string[]) => void;
}

/**
 * Uploads directly from the browser to Firebase Storage — authorized by
 * storage.rules (staff-only write to images/{entityType}/{entityId}/**),
 * not by this component. If a non-staff user somehow reached this UI,
 * the upload would be rejected by Storage itself.
 */
export function ImageUploader({ entityType, entityId, images, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const storage = getStorage(getFirebaseApp());
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const path = `images/${entityType}/${entityId}/${Date.now()}-${file.name}`;
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, file, { contentType: file.type });
        uploaded.push(await getDownloadURL(fileRef));
      }
      onChange([...images, ...uploaded]);
    } catch {
      setError("Upload failed. Check the file is an image under 8MB.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(url: string) {
    onChange(images.filter((i) => i !== url));
    try {
      const storage = getStorage(getFirebaseApp());
      await deleteObject(ref(storage, url));
    } catch {
      // Non-fatal: the image is already removed from this entity's list,
      // which is what the admin actually cares about. An orphaned Storage
      // object left behind on failure is a minor cleanup issue, not a
      // reason to block the admin's edit.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Storage URLs, not worth next/image config for an admin-only thumbnail grid */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id={`image-upload-${entityId}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Add images"}
        </Button>
      </div>
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
