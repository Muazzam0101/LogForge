/**
 * LogForge Universal Log Pre-processing Framework (ULPF)
 * Multi-layer File & Input Validation Utility
 *
 * Enforces strict defense-in-depth against unsupported non-log formats:
 * - Images (.png, .jpg, .jpeg, .gif, .webp, .svg, .bmp, image/*)
 * - Documents (.pdf, .docx, .xlsx, .pptx, application/pdf)
 * - Binaries & Archives (.exe, .dll, .bin, .zip, .tar, .gz)
 * - Inspects magic bytes (file signatures) to detect renamed files (e.g. malicious.png.log)
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
}

// Whitelist of valid log file extensions
export const ALLOWED_EXTENSIONS = new Set([
  "log",
  "txt",
  "json",
  "cef",
  "syslog",
  "ndjson",
]);

// Explicit blacklist mapping with user-friendly descriptions
const DISALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: "PDF document",
  png: "PNG image",
  jpg: "JPEG image",
  jpeg: "JPEG image",
  gif: "GIF image",
  webp: "WebP image",
  svg: "SVG image",
  bmp: "Bitmap image",
  ico: "Icon image",
  tiff: "TIFF image",
  doc: "Word document",
  docx: "Word document",
  xls: "Excel spreadsheet",
  xlsx: "Excel spreadsheet",
  ppt: "PowerPoint presentation",
  pptx: "PowerPoint presentation",
  zip: "ZIP archive",
  tar: "TAR archive",
  gz: "GZ archive",
  "7z": "7z archive",
  rar: "RAR archive",
  exe: "Executable binary",
  dll: "Dynamic library",
  bin: "Binary file",
  iso: "Disk image",
  mp3: "Audio file",
  mp4: "Video file",
  mkv: "Video file",
  avi: "Video file",
};

// Patterns for confidential credential, secret, or key files
const SENSITIVE_FILENAME_PATTERNS: Array<{ pattern: RegExp; desc: string }> = [
  { pattern: /recovery[-_]?codes?/i, desc: "2FA / Account recovery codes" },
  { pattern: /backup[-_]?codes?/i, desc: "Account backup codes" },
  { pattern: /2fa[-_]?codes?/i, desc: "Two-factor authentication codes" },
  { pattern: /credentials?/i, desc: "Credential / secret configuration" },
  { pattern: /passwords?/i, desc: "Password dump / credential list" },
  { pattern: /api[-_]?keys?/i, desc: "API key file" },
  { pattern: /auth[-_]?tokens?/i, desc: "Authentication token" },
  { pattern: /id_rsa/i, desc: "SSH private key" },
  { pattern: /id_ed25519/i, desc: "SSH private key" },
  { pattern: /\.pem$/i, desc: "PEM certificate / private key" },
  { pattern: /\.key$/i, desc: "Private encryption key" },
  { pattern: /\.kdbx$/i, desc: "KeePass password database" },
  { pattern: /^\.env/i, desc: "Environment secrets file" },
];

// Maximum file size for client-side processing (10 MB)
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Checks magic bytes / file signatures from the first 1KB of raw array buffer.
 * Catches disguised files (e.g., sample.pdf renamed to sample.log).
 */
export function checkMagicBytes(buffer: ArrayBuffer): { isBinary: boolean; signatureType?: string } {
  const bytes = new Uint8Array(buffer.slice(0, 1024));
  if (bytes.length === 0) return { isBinary: false };

  // 1. PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { isBinary: true, signatureType: "PDF document" };
  }

  // 2. PNG signature: \x89PNG (0x89 0x50 0x4E 0x47)
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { isBinary: true, signatureType: "PNG image" };
  }

  // 3. JPEG signature: 0xFF 0xD8 0xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { isBinary: true, signatureType: "JPEG image" };
  }

  // 4. GIF signature: GIF87a or GIF89a (0x47 0x49 0x46 0x38)
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return { isBinary: true, signatureType: "GIF image" };
  }

  // 5. ZIP / Office XML signature: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    return { isBinary: true, signatureType: "ZIP/Office archive" };
  }

  // 6. WebP signature: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { isBinary: true, signatureType: "WebP image" };
  }

  // 7. General binary inspection: Check for null bytes (0x00)
  // Plain text logs (JSON, CEF, Syslog, NDJSON) NEVER contain null bytes in legitimate logs
  let nullByteCount = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x00) {
      nullByteCount++;
      if (nullByteCount > 0) {
        return { isBinary: true, signatureType: "binary stream" };
      }
    }
  }

  return { isBinary: false };
}

/**
 * Full asynchronous validation of a File object before loading into memory.
 */
export async function validateLogFile(file: File): Promise<ValidationResult> {
  // 1. File existence & empty check
  if (!file) {
    return { valid: false, error: "No file provided for validation." };
  }

  if (file.size === 0) {
    return { valid: false, error: "The selected file is empty (0 bytes)." };
  }

  // 2. File size limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 10 MB browser ingestion limit. For large PCAPs or bulk archives, use LogForge daemon stream listeners.`,
    };
  }

  // 3. Sensitive Credentials & Secret Files Prevention
  // Blocks accidentally ingesting recovery codes, private keys, password lists, .env, etc.
  for (const item of SENSITIVE_FILENAME_PATTERNS) {
    if (item.pattern.test(file.name)) {
      return {
        valid: false,
        detectedType: item.desc,
        error: `Security Alert: The file '${file.name}' matches known ${item.desc}. LogForge actively prevents ingesting confidential credentials or recovery codes into SIEM log pipelines.`,
      };
    }
  }

  // 4. Extension check
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (DISALLOWED_EXTENSIONS[ext]) {
    const desc = DISALLOWED_EXTENSIONS[ext];
    return {
      valid: false,
      detectedType: desc,
      error: `Unsupported file type: ${desc} (.${ext}). LogForge accepts plain-text and structured logs (.log, .txt, .json, .cef, .syslog) only.`,
    };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Unsupported extension '.${ext}'. Please upload a supported log format: .log, .json, .cef, .syslog, or .txt.`,
    };
  }

  // 4. MIME-type check
  const mime = file.type ? file.type.toLowerCase() : "";
  if (
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/zip" ||
    mime.includes("msword") ||
    mime.includes("officedocument")
  ) {
    return {
      valid: false,
      detectedType: mime,
      error: `Disallowed MIME type '${mime}'. Images, PDFs, and binary media cannot be ingested as logs.`,
    };
  }

  // 5. Deep Magic Byte / Binary Content Inspection
  try {
    const sampleBuffer = await readSampleBytes(file, 1024);
    const magicCheck = checkMagicBytes(sampleBuffer);

    if (magicCheck.isBinary) {
      return {
        valid: false,
        detectedType: magicCheck.signatureType,
        error: `Invalid file content: detected ${magicCheck.signatureType || "binary content"} inside '${file.name}'. Images, PDFs, and binary formats are not supported.`,
      };
    }
  } catch {
    return {
      valid: false,
      error: "Unable to read file content for security verification.",
    };
  }

  return { valid: true };
}

/**
 * Validates raw pasted text string from terminal or editor against binary/PDF artifacts.
 */
export function validateLogText(text: string): ValidationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, error: "Raw log payload cannot be empty." };
  }

  // Check for PDF signature in text
  if (trimmed.startsWith("%PDF-")) {
    return {
      valid: false,
      detectedType: "PDF document",
      error: "Pasted text contains a PDF document stream (%PDF-). LogForge accepts raw security logs (JSON, CEF, Syslog) only.",
    };
  }

  // Check for PNG / JPEG binary artifacts in text
  if (trimmed.startsWith("\x89PNG") || trimmed.includes("PNG\r\n\x1a\n")) {
    return {
      valid: false,
      detectedType: "PNG image",
      error: "Pasted content contains raw PNG image data. Images cannot be processed as logs.",
    };
  }

  // Check for null bytes (\x00)
  if (trimmed.includes("\x00")) {
    return {
      valid: false,
      detectedType: "binary stream",
      error: "Pasted content contains binary null bytes (\\x00). Please provide plain-text logs.",
    };
  }

  // Check for sensitive cryptographic secrets or tokens
  if (
    /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/.test(trimmed) ||
    /ghp_[a-zA-Z0-9]{36}/.test(trimmed) ||
    /github_pat_[a-zA-Z0-9_]{82}/.test(trimmed) ||
    /AKIA[0-9A-Z]{16}/.test(trimmed)
  ) {
    return {
      valid: false,
      detectedType: "sensitive secret / credential",
      error: "Security Alert: Submitted content contains private cryptographic keys or access tokens. Confidential credentials cannot be ingested into log pipelines.",
    };
  }

  return { valid: true };
}

/**
 * Helper to read initial bytes of a File into an ArrayBuffer without loading the whole file into RAM.
 */
function readSampleBytes(file: File, maxBytes: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const blob = file.slice(0, maxBytes);
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve((e.target?.result as ArrayBuffer) || new ArrayBuffer(0));
    };
    reader.onerror = () => reject(new Error("File slice read failed"));
    reader.readAsArrayBuffer(blob);
  });
}
