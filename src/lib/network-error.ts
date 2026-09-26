/**
 * Server Actions can reject outright (not just return an error result) when the
 * network genuinely fails — offline, DNS, connection dropped mid-request. Every
 * client call site must catch this, or the UI is left stuck in its "saving"
 * state forever with no feedback. See prd-smart-reminder.md §22.
 */
export const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.";
