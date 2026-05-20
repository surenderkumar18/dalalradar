export function normalizeRows(raw) {
  if (!raw) return [];

  // already array
  if (Array.isArray(raw)) return raw;

  // { data: [] }
  if (Array.isArray(raw.data)) return raw.data;

  // next dynamic import default
  if (Array.isArray(raw.default)) return raw.default;

  return [];
}
