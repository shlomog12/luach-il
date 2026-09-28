// Escaping for text interpolated into innerHTML templates. Event titles come from
// Google Calendar, where anyone who invites the user controls them — never
// insert them into HTML unescaped.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ESCAPES[c]);
}
