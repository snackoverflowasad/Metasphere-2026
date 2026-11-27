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

const EXTENSION_CANONICAL_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const BLOCKED_UPLOAD_EXTENSION_RE = /\.(svg|svgz|html?|xhtml)$/i;
const DANGEROUS_TEXT_PREFIX_RE = /^(?:\uFEFF|\s)*(?:<svg|<html|<!doctype|<script|<\?xml)/i;

const POSTGRES_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Zod schema validating PostgreSQL-compatible 8-4-4-4-12 hex UUID strings.
 */
export function uuidSchema(message = "Valid UUID is required") {
  return z.string().trim().regex(POSTGRES_UUID_RE, message);
}

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

/**
 * Zod schema accepting either a safe `http(s)://` URL or an empty string / null.
 */
export const optionalSafeHttpUrlSchema = z
  .union([safeHttpUrlSchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value.trim() : ""));

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

/**
 * Inspects binary magic-byte signatures for uploaded files so spoofed
 * `file.type` / renamed `.html` or `.svg` payloads cannot bypass metadata checks.
 */
export function verifyUploadMagicBytes(
  bytes: Uint8Array,
  fileName: string,
  claimedMime: string
): { ok: true; canonicalMime: string } | { ok: false; error: string } {
  const baseValidation = validateUploadFile({
    name: fileName,
    type: claimedMime,
    size: bytes.byteLength,
  });
  if (!baseValidation.ok) {
    return baseValidation;
  }

  const trimmedName = fileName.trim();
  const lastDot = trimmedName.lastIndexOf(".");
  const ext = lastDot >= 0 ? trimmedName.slice(lastDot).toLowerCase() : "";
  const canonicalMime = EXTENSION_CANONICAL_MIME[ext];
  const normalizedMime = claimedMime.trim().toLowerCase();

  if (!canonicalMime || canonicalMime !== normalizedMime) {
    return {
      ok: false,
      error: "File extension does not match the declared MIME type.",
    };
  }

  const headerText = new TextDecoder("utf-8", { fatal: false }).decode(
    bytes.subarray(0, Math.min(512, bytes.byteLength))
  );
  if (DANGEROUS_TEXT_PREFIX_RE.test(headerText)) {
    return {
      ok: false,
      error: "HTML, XML, or SVG content is not allowed in uploaded files.",
    };
  }

  if (canonicalMime === "image/png") {
    const isPng =
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    if (!isPng) {
      return { ok: false, error: "File bytes do not match a valid PNG image." };
    }
  } else if (canonicalMime === "image/jpeg") {
    const isJpeg =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    if (!isJpeg) {
      return { ok: false, error: "File bytes do not match a valid JPEG image." };
    }
  } else if (canonicalMime === "image/webp") {
    const isWebp =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    if (!isWebp) {
      return { ok: false, error: "File bytes do not match a valid WEBP image." };
    }
  } else if (canonicalMime === "application/pdf") {
    const isPdf =
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d;
    if (!isPdf) {
      return { ok: false, error: "File bytes do not match a valid PDF document." };
    }
  }

  return { ok: true, canonicalMime };
}
