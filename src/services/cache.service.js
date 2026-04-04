// Dùng Map để mô phỏng In-memory Cache (Fallback cho Redis)
const cache = new Map();

exports.get = async (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.value;
};

exports.set = async (key, value, ttlSeconds = 3600) => {
  const expiry = Date.now() + ttlSeconds * 1000;
  cache.set(key, { value, expiry });
};

exports.delete = async (key) => {
  cache.delete(key);
};