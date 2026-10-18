export type Route = { kind: 'library' } | { kind: 'project'; id: string; unit: string | null };

// #/  ·  #/p/<id>  ·  #/p/<id>/c/<cabinet>  (encoded, because cabinet codes may contain spaces: "RTV K1")
export function parseRoute(hash: string): Route {
  const m = hash.match(/^#\/p\/([\w-]+)(?:\/c\/([^/]+))?$/);
  if (!m) return { kind: 'library' };
  let unit: string | null = null;
  if (m[2] !== undefined) {
    try { unit = decodeURIComponent(m[2]); } catch { unit = null; }
  }
  return { kind: 'project', id: m[1]!, unit };
}

export const projectHash = (id: string, unit?: string | null) =>
  `#/p/${id}` + (unit ? `/c/${encodeURIComponent(unit)}` : '');
