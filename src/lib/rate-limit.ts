/**
 * Rate limit in-memory. Cukup selama app jalan sebagai satu instance —
 * kalau nanti di-scale ke banyak proses, ganti dengan tabel Postgres atau Redis.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;

  b.count += 1;
  return true;
}

// Bersihkan entri kedaluwarsa supaya map tidak tumbuh tanpa batas.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
}, 10 * 60_000).unref?.();
