/**
 * Deep clone for plain JSON-compatible data (state records only).
 * Rules state never contains class instances, Maps, Dates or functions.
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const arr = new Array(value.length);
    for (let i = 0; i < value.length; i++) arr[i] = deepClone(value[i]);
    return arr as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const key in value as Record<string, unknown>) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      out[key] = deepClone((value as Record<string, unknown>)[key]);
    }
  }
  return out as T;
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
