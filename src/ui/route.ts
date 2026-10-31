export type DrillTarget = { kind: 'part'; code: string } | { kind: 'cab'; unit: string };
export type Route = { kind: 'library' } | { kind: 'project'; id: string; unit: string | null }
  | { kind: 'drill'; id: string; target: DrillTarget } | { kind: 'build'; id: string; unit: string };

const decode = (s: string): string | null => { try { return decodeURIComponent(s); } catch { return null; } };

// #/  ·  #/p/<id>  ·  #/p/<id>/c/<cabinet>  (encoded, because cabinet codes may contain spaces: "RTV K1")
// drilling sheets: #/p/<id>/drill/<partCode>  ·  #/p/<id>/drill/cab/<cabinet>
export function parseRoute(hash: string): Route {
  const b = hash.match(/^#\/p\/([\w-]+)\/build\/([^/]+)$/);
  if (b) { const u = decode(b[2]!); return u === null ? { kind: 'project', id: b[1]!, unit: null } : { kind: 'build', id: b[1]!, unit: u }; }
  const d = hash.match(/^#\/p\/([\w-]+)\/drill\/(?:cab\/([^/]+)|([^/]+))$/);
  if (d) {
    const v = decode(d[2] ?? d[3]!);
    if (v === null) return { kind: 'project', id: d[1]!, unit: null };
    return { kind: 'drill', id: d[1]!, target: d[2] !== undefined ? { kind: 'cab', unit: v } : { kind: 'part', code: v } };
  }
  const m = hash.match(/^#\/p\/([\w-]+)(?:\/c\/([^/]+))?$/);
  if (!m) return { kind: 'library' };
  return { kind: 'project', id: m[1]!, unit: m[2] !== undefined ? decode(m[2]) : null };
}

export const projectHash = (id: string, unit?: string | null) =>
  `#/p/${id}` + (unit ? `/c/${encodeURIComponent(unit)}` : '');
export const drillHash = (id: string, t: DrillTarget) =>
  `#/p/${id}/drill/` + (t.kind === 'cab' ? `cab/${encodeURIComponent(t.unit)}` : encodeURIComponent(t.code));
export const buildHash = (id: string, unit: string) => `#/p/${id}/build/${encodeURIComponent(unit)}`;
