/**
 * Every Server Action returns this instead of throwing, so the UI can show
 * the exact error copy the spec requires (AI lỗi / DB lỗi / Network lỗi)
 * rather than a generic Next.js error boundary. See prd-smart-reminder.md §E.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function err(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}
