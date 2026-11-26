export interface SecurityHeader {
  key: string;
  value: string;
}

/**
 * Builds global HTTP security headers including CSP for Cloudinary, Supabase,
 * Google Fonts, and embedded Google Maps, plus clickjacking and MIME protections.
 */
export function buildSecurityHeaders(): SecurityHeader[] {
  const isDev = process.env.NODE_ENV === "development";

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co",
    "media-src 'self' https://res.cloudinary.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://res.cloudinary.com",
    "frame-src 'self' https://www.google.com https://maps.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  return [
    {
      key: "Content-Security-Policy",
      value: cspDirectives.join("; "),
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}
