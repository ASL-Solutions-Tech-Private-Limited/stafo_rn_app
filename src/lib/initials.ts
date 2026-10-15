export function initialsOf(name?: string | null) {
  // Words only, so "ASL PVT. LTD. (JADAVPUR)" gives "AJ", not "A(".
  const parts = (name ?? '')
    .split(/\s+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}
