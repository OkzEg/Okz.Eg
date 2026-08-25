const store = new Map();

const get = (key) => {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
};

const set = (key, value, ttlMs = 30_000) => {
  store.set(key, { value, exp: Date.now() + ttlMs });
  return value;
};

const invalidate = (prefix) => {
  for (const key of store.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) store.delete(key);
  }
};

const wrap = async (key, ttlMs, loader) => {
  const cached = get(key);
  if (cached !== undefined) return { data: cached, hit: true };
  const data = await loader();
  set(key, data, ttlMs);
  return { data, hit: false };
};

module.exports = { get, set, invalidate, wrap };
