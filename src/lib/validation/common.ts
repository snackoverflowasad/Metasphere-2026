import { z } from "zod";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_UPLOAD_MIME_TYPES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

export const ALLOWED_UPLOAD_EXTENSIONS = new Set<string>([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".pdf",
]);

const BLOCKED_UPLOAD_EXTENSION_RE = /\.(svg|svgz|html?|xhtml)$/i;

/**
 * Zod schema accepting only explicit `http://` or `https://` URLs.
 * Rejects `javascript:`, `data:`, `vbscript:`, `file:`, and relative paths.
 */
export const safeHttpUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048, "URL must be at most 2048 characters")
  .refine(
    (value) => {
      if (/[\s\u0000-\u001f]/.test(value)) {
        return false;
      }

      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    {
      message: "URL must be a valid http:// or https:// URL",
    }
  );

export const publicationStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);

export const editionYearSchema = z
  .number()
  .int("Edition year must be a whole number")
  .min(2020, "Edition year must be 2020 or later")
  .max(2100, "Edition year must be 2100 or earlier");

/**
 * Validates an uploaded conference asset against the 10 MB size cap and safe
 * PNG/JPEG/WEBP/PDF allowlist, rejecting `.svg`, `.html`, `.htm`, `.xhtml`
 * even if the browser-supplied MIME type is spoofed.
 */
export function validateUploadFile(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  const trimmedName = file.name.trim();
  if (!trimmedName) {
    return { ok: false, error: "File name is required." };
  }

  if (BLOCKED_UPLOAD_EXTENSION_RE.test(trimmedName)) {
    return {
      ok: false,
      error:
        "SVG and HTML files are blocked for security reasons. Allowed types: PNG, JPEG, WEBP, PDF.",
    };
  }

  const lastDot = trimmedName.lastIndexOf(".");
  const ext = lastDot >= 0 ? trimmedName.slice(lastDot).toLowerCase() : "";
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error:
        "Unsupported file extension. Allowed extensions: .png, .jpg, .jpeg, .webp, .pdf.",
    };
  }

  const normalizedMime = file.type.trim().toLowerCase();
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(normalizedMime)) {
    return {
      ok: false,
      error:
        "Unsupported MIME type. Allowed types: image/png, image/jpeg, image/webp, application/pdf.",
    };
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: "Uploaded file must not be empty." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: "File size exceeds the 10 MB maximum upload limit.",
    };
  }

  return { ok: true };
}
