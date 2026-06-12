/** Allow-list of accepted document MIME types, mapped to their accepted file extensions. */
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "image/heic": ["heic"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/plain": ["txt"],
  "text/csv": ["csv"],
};

/**
 * Validates an uploaded file's MIME type and extension against an allow-list.
 * Returns the safe, lowercase extension to use for storage, or null if the
 * file's type/extension combination is not accepted.
 */
export function validateUploadedFile(file: File): string | null {
  const allowedExts = ALLOWED_MIME_TYPES[file.type];
  if (!allowedExts) return null;

  const dotIndex = file.name.lastIndexOf(".");
  const rawExt = dotIndex >= 0 ? file.name.slice(dotIndex + 1).toLowerCase() : "";

  if (!allowedExts.includes(rawExt)) return null;

  return rawExt;
}
