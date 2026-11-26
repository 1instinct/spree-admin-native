/** Minimal JSON:API reader for Spree v2 responses: resolves relationships against `included`. */

export interface ResourceIdentifier {
  id: string;
  type: string;
}

export interface Resource extends ResourceIdentifier {
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: ResourceIdentifier | ResourceIdentifier[] | null }>;
}

export interface Document {
  data: Resource | Resource[];
  included?: Resource[];
  meta?: { count?: number; total_count?: number; total_pages?: number };
  links?: { next?: string | null };
}

export class JsonApiGraph {
  private readonly index = new Map<string, Resource>();

  constructor(doc: Pick<Document, 'included' | 'data'>) {
    for (const r of [...(Array.isArray(doc.data) ? doc.data : [doc.data]), ...(doc.included ?? [])]) {
      if (r) this.index.set(`${r.type}:${r.id}`, r);
    }
  }

  get(ref: ResourceIdentifier | null | undefined): Resource | null {
    return ref ? (this.index.get(`${ref.type}:${ref.id}`) ?? null) : null;
  }

  one(resource: Resource | null, name: string): Resource | null {
    const data = resource?.relationships?.[name]?.data;
    return data && !Array.isArray(data) ? this.get(data) : null;
  }

  many(resource: Resource | null, name: string): Resource[] {
    const data = resource?.relationships?.[name]?.data;
    return Array.isArray(data) ? data.map((d) => this.get(d)).filter((r): r is Resource => r !== null) : [];
  }

  /** Id of a to-one relationship even when the related resource wasn't included. */
  oneId(resource: Resource | null, name: string): string | null {
    const data = resource?.relationships?.[name]?.data;
    return data && !Array.isArray(data) ? data.id : null;
  }
}

export const str = (r: Resource | null, key: string): string | null => {
  const v = r?.attributes[key];
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null;
};

export const num = (r: Resource | null, key: string): number | null => {
  const v = r?.attributes[key];
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
};

export const bool = (r: Resource | null, key: string): boolean | null => {
  const v = r?.attributes[key];
  return typeof v === 'boolean' ? v : null;
};
