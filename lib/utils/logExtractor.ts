/**
 * Utility to parse and extract individual log events from uploaded files or pasted text.
 * Handles:
 *  1. Single pretty-printed or compact JSON objects: { "src": "1.1.1.1", ... }
 *  2. JSON Arrays of log entries: [ { ... }, { ... } ]
 *  3. Concatenated multiline JSON objects: { ... }\n{ ... }
 *  4. Line-delimited logs: RFC 5424/3164 Syslog, ArcSight CEF, NDJSON (JSON Lines)
 */

export interface ExtractedLogData {
  logs: string[];
  isJsonArray: boolean;
  isSingleObject: boolean;
  totalCount: number;
  unrecognizedFormat?: boolean;
}

/**
 * Deterministic detection for individual log lines.
 * Returns true if the line matches any recognized security/system log format:
 * - JSON / NDJSON: { ... }
 * - ArcSight CEF: CEF:0|...
 * - Syslog RFC 5424: <PRI>1 TIMESTAMP HOSTNAME ...
 * - Syslog RFC 3164: <PRI>Mmm dd hh:mm:ss ... or Mmm dd hh:mm:ss host ...
 * - Syslog with PRI prefix: <165>...
 * - Network / Cisco syslog: %ASA-4-106023: ...
 * - ISO-8601 timestamped application logs: 2026-09-06T10:14:00 or [2026-09-06 10:14:00]
 * - Web server access logs: 192.168.1.1 - - [06/Sep/2026:10:15:30 ...
 * - Key-Value security logs: srcip=... dstip=... action=...
 */
export function isRecognizedLogLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // 1. JSON Object (NDJSON or compact JSON)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }

  // 2. ArcSight CEF header
  if (
    trimmed.toUpperCase().startsWith("CEF:0|") ||
    trimmed.toUpperCase().startsWith("CEF: 0|") ||
    /^CEF:\s*0\s*\|/i.test(trimmed)
  ) {
    return true;
  }

  // 3. Syslog RFC 5424: <PRI>1 TIMESTAMP HOSTNAME APP-NAME ...
  if (/^<\d{1,3}>1\s+\S+\s+\S+/.test(trimmed)) {
    return true;
  }

  // 4. Syslog RFC 3164 (BSD): <PRI>Mmm dd hh:mm:ss or Mmm dd hh:mm:ss hostname
  if (
    /^(?:<\d{1,3}>)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/i.test(
      trimmed
    )
  ) {
    return true;
  }

  // 5. Syslog with PRI prefix e.g. <165> or <134>
  if (/^<\d{1,3}>/.test(trimmed)) {
    return true;
  }

  // 6. Network error/event code (e.g. Cisco ASA, Fortinet, Snort)
  if (/%[A-Z0-9_]+-\d-[A-Z0-9_]+:/.test(trimmed) || /\[\d+:\d+:\d+\]/.test(trimmed)) {
    return true;
  }

  // 7. ISO-8601 or RFC 3339 timestamped security log
  // e.g., 2026-09-06T10:14:00.000Z or [2026-09-06 10:14:00] [INFO]
  if (/^(?:\[)?\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    return true;
  }

  // 8. Common web server access log (starts with IP address followed by timestamp)
  if (/^(?:\d{1,3}\.){3}\d{1,3}\s+-\s+-\s+\[\d{2}\/[A-Za-z]{3}\/\d{4}/.test(trimmed)) {
    return true;
  }

  // 9. Structured Key-Value logs with cybersecurity attributes (needs at least 2 distinct pairs)
  const kvMatches = [
    /\bsrc_?ip\s*=/i,
    /\bdst_?ip\s*=/i,
    /\bsrc_?port\s*=/i,
    /\bdst_?port\s*=/i,
    /\baction\s*=/i,
    /\bproto(?:col)?\s*=/i,
    /\bseverity\s*=/i,
    /\bthreat(?:_score)?\s*=/i,
    /\bmsg\s*=/i,
    /\bevent(?:_id)?\s*=/i,
    /\bdevice\s*=/i,
  ].filter((regex) => regex.test(trimmed));

  if (kvMatches.length >= 2) {
    return true;
  }

  return false;
}

export function extractLogsFromText(content: string): ExtractedLogData {
  // Strip UTF-8 BOM if present and trim whitespace
  const trimmed = content.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return {
      logs: [],
      isJsonArray: false,
      isSingleObject: false,
      totalCount: 0,
    };
  }

  // 1. Check if the entire payload is a single valid JSON object (even if multiline/indented)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        // If the user pasted an API envelope wrapper such as { "raw_log": "..." },
        // unwrap the inner log so the terminal and uploader work with pristine log content
        if (typeof parsed.raw_log === "string" && parsed.raw_log.trim().length > 0) {
          return extractLogsFromText(parsed.raw_log.trim());
        }

        return {
          logs: [trimmed],
          isJsonArray: false,
          isSingleObject: true,
          totalCount: 1,
        };
      }
    } catch {
      // Not a single valid JSON object, fall through
    }
  }

  // 2. Check if the payload is a JSON array of events
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const logs = parsed
          .map((item) => {
            if (typeof item === "string") return item.trim();
            return JSON.stringify(item);
          })
          .filter((s) => s.length > 0);

        return {
          logs,
          isJsonArray: true,
          isSingleObject: logs.length === 1,
          totalCount: logs.length,
        };
      }
    } catch {
      // Fall through to other parsers
    }
  }

  // 2b. Check if the text contains multiple concatenated or multiline JSON objects: { ... }\n{ ... }
  if (trimmed.startsWith("{")) {
    const extractedObjects: string[] = [];
    let depth = 0;
    let inString = false;
    let escape = false;
    let startIdx = -1;

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{") {
          if (depth === 0) startIdx = i;
          depth++;
        } else if (char === "}") {
          depth--;
          if (depth === 0 && startIdx !== -1) {
            const objStr = trimmed.slice(startIdx, i + 1).trim();
            try {
              JSON.parse(objStr);
              extractedObjects.push(objStr);
            } catch {
              // Not valid JSON, skip
            }
            startIdx = -1;
          }
        }
      }
    }

    if (extractedObjects.length > 1) {
      return {
        logs: extractedObjects,
        isJsonArray: false,
        isSingleObject: false,
        totalCount: extractedObjects.length,
      };
    }
  }

  // 3. Line-delimited stream (Syslog RFC 5424/3164, ArcSight CEF, NDJSON, structured security events)
  const rawLines = trimmed.split(/\r?\n/);
  // Filter out empty lines and header comments (# ...)
  const nonCommentLines = rawLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (nonCommentLines.length === 0) {
    return {
      logs: [],
      isJsonArray: false,
      isSingleObject: false,
      totalCount: 0,
    };
  }

  // Filter lines that match recognized cybersecurity log patterns
  const recognizedLogs = nonCommentLines.filter((l) => isRecognizedLogLine(l));

  // Single line payload evaluation
  if (nonCommentLines.length === 1) {
    const singleLine = nonCommentLines[0];
    if (isRecognizedLogLine(singleLine)) {
      return {
        logs: [singleLine],
        isJsonArray: false,
        isSingleObject: true,
        totalCount: 1,
      };
    } else {
      // Single line does not match known log formats (e.g. single recovery code or plain word)
      return {
        logs: [],
        isJsonArray: false,
        isSingleObject: false,
        totalCount: 0,
        unrecognizedFormat: true,
      };
    }
  }

  // Multiline payload: If ZERO lines match any recognized log format,
  // reject as arbitrary plain text, recovery codes, or unsupported files.
  if (recognizedLogs.length === 0) {
    return {
      logs: [],
      isJsonArray: false,
      isSingleObject: false,
      totalCount: 0,
      unrecognizedFormat: true,
    };
  }

  return {
    logs: recognizedLogs,
    isJsonArray: false,
    isSingleObject: recognizedLogs.length === 1,
    totalCount: recognizedLogs.length,
  };
}
