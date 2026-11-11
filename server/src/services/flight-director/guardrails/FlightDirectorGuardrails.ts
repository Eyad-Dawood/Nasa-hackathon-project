export interface ValidatedUserInput {
  ok: boolean;
  sanitizedMessage: string;
  wasTruncated: boolean;
  rejectedReason?: string;
}

const MAX_MESSAGE_LENGTH = 1000;

const SECRET_PATTERNS: RegExp[] = [
  /AIza[0-9A-Za-z_-]{20,}/g,
  /AQ\.[0-9A-Za-z._-]{20,}/g,
  /(?:GEMINI_API_KEY|API_KEY)\s*[:=]\s*["']?[^\s"']+/gi,
];

export function validateAndSanitizeUserInput(raw: unknown): ValidatedUserInput {
  if (typeof raw !== "string") {
    return {
      ok: false,
      sanitizedMessage: "",
      wasTruncated: false,
      rejectedReason: "Message must be a non-empty text string.",
    };
  }

  // Remove control characters except standard newlines and tabs
  const cleaned = raw
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (cleaned.length === 0) {
    return {
      ok: false,
      sanitizedMessage: "",
      wasTruncated: false,
      rejectedReason: "Message cannot be empty.",
    };
  }

  const wasTruncated = cleaned.length > MAX_MESSAGE_LENGTH;
  const sanitizedMessage = wasTruncated
    ? cleaned.slice(0, MAX_MESSAGE_LENGTH)
    : cleaned;

  return {
    ok: true,
    sanitizedMessage,
    wasTruncated,
  };
}

export function redactPotentialSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "[REDACTED_SECRET]");
  }
  return result;
}

export function stripUnsafeHtml(text: string): string {
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*(['"])[\s\S]*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

