export type QueryValue = string | number | boolean | null | undefined | readonly QueryValue[] | QueryObject;
export interface QueryObject {
  readonly [key: string]: QueryValue;
}

/** Rails-style query string: `filter[state_eq]=complete`, `ids[]=1&ids[]=2`. Skips null/undefined. */
export function encodeQuery(query: QueryObject): string {
  const parts: string[] = [];
  const walk = (key: string, value: QueryValue): void => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const v of value) walk(`${key}[]`, v);
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(`${key}[${k}]`, v);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  };
  for (const [k, v] of Object.entries(query)) walk(k, v);
  return parts.join('&');
}
