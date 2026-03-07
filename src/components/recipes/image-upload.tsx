"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

interface ImageUploadProps {
  recipeId?: string;
  currentImageUrl?: string;
  onImageChange: (url: string) => void;
  /** Exposes the selected File to the parent (useful for new recipes before save) */
  onFileSelect?: (file: File | null) => void;
}

export function ImageUpload({
  recipeId,
  currentImageUrl,
  onImageChange,
  onFileSelect,
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please use JPEG, PNG, or WebP.");
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("File is too large. Maximum size is 10 MB.");
      return false;
    }
    return true;
  };

  const uploadToServer = async (file: File) => {
    if (!recipeId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/recipes/${recipeId}/image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload failed");
      }
      const data = await res.json();
      const url: string = data.url ?? data.imageUrl ?? "";
      setPreviewUrl(url);
      onImageChange(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = useCallback(
    (file: File) => {
      if (!validate(file)) return;

      if (recipeId) {
        // Existing recipe — upload immediately
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        uploadToServer(file);
      } else {
        // New recipe — store preview locally
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        onImageChange(localUrl);
        onFileSelect?.(file);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipeId, onImageChange, onFileSelect]
  );

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageChange("");
    onFileSelect?.(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border">
          <img
            src={previewUrl}
            alt="Recipe image"
            className="w-full h-48 object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
            p-8 cursor-pointer transition-colors text-muted-foreground
            ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }
          `}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Camera className="h-8 w-8" />
          )}
          <p className="text-sm">Drop an image or click to browse</p>
          <p className="text-xs">JPEG, PNG, or WebP up to 10 MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
