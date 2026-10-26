// Match the browser/seal-item format, without deriving a key or reading plaintext.
function bytes(value, min, max = min) {
  if (typeof value !== 'string' || value.length > Math.ceil(max / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
  const decoded = Buffer.from(value, 'base64');
  return decoded.length >= min && decoded.length <= max && decoded.toString('base64') === value;
}

export function validWarden(kdf, locked) {
  return !!(kdf && locked && kdf.alg === 'PBKDF2-SHA256' && locked.alg === 'AES-256-GCM' &&
    Number.isInteger(kdf.iter) && kdf.iter >= 100000 && kdf.iter <= 600000 &&
    bytes(kdf.salt, 16) && bytes(locked.iv, 12) && bytes(locked.ct, 17, 32768));
}
