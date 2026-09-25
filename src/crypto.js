// All encryption happens here, entirely client-side. Supabase only ever
// receives the output of encryptJSON() — never plaintext, never the key.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(buf) {
  const bytes = new Uint8Array(buf);
  const CHUNK_SIZE = 0x8000; // 32KB safe chunk
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

function unb64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function newSalt() {
  return b64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export async function deriveKey(password, saltB64) {
  const salt = unb64(saltB64);
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKeyRaw(key) {
  const exported = await crypto.subtle.exportKey("raw", key);
  return b64(exported);
}

export async function importKeyRaw(rawB64) {
  const buf = unb64(rawB64);
  return crypto.subtle.importKey("raw", buf, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

export async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return JSON.stringify({ iv: b64(iv), ct: b64(ct) });
}

export async function decryptJSON(key, blobString) {
  if (!blobString) return null;
  const payload = typeof blobString === "string" ? JSON.parse(blobString) : blobString;
  const iv = new Uint8Array(unb64(payload.iv));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, unb64(payload.ct));
  return JSON.parse(dec.decode(pt));
}

export function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s.`)), ms)
    ),
  ]);
}

export async function hashText(text) {
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ──────── Zero-Knowledge Asymmetric Cryptography (ECDH P-256) ────────

/**
 * Generates an ECDH P-256 keypair for zero-knowledge end-to-end secret sharing.
 * @returns {Promise<CryptoKeyPair>}
 */
export async function generateECDHKeyPair() {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Exports an ECDH public key as a base64-encoded raw uncompressed point.
 * @param {CryptoKey} publicKey
 * @returns {Promise<string>}
 */
export async function exportPublicKeyRaw(publicKey) {
  const rawBytes = await crypto.subtle.exportKey("raw", publicKey);
  return b64(rawBytes);
}

/**
 * Imports an ECDH public key from either a raw base64 string or a JWK JSON string.
 * @param {string|object} keyData
 * @returns {Promise<CryptoKey>}
 */
export async function importPublicKey(keyData) {
  if (typeof keyData === "string" && keyData.trim().startsWith("{")) {
    const jwk = JSON.parse(keyData);
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, []);
  } else if (typeof keyData === "object" && keyData !== null && keyData.kty) {
    return crypto.subtle.importKey("jwk", keyData, { name: "ECDH", namedCurve: "P-256" }, true, []);
  } else {
    const buf = unb64(typeof keyData === "string" ? keyData.trim() : "");
    return crypto.subtle.importKey("raw", buf, { name: "ECDH", namedCurve: "P-256" }, true, []);
  }
}

/**
 * Exports an ECDH public key as a serialized JWK string (safe to store openly in database).
 * @param {CryptoKey} publicKey
 * @returns {Promise<string>}
 */
export async function exportPublicKeyJWK(publicKey) {
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  return JSON.stringify(jwk);
}

/**
 * Imports an ECDH public key from a serialized JWK string.
 * @param {string} jwkString
 * @returns {Promise<CryptoKey>}
 */
export async function importPublicKeyJWK(jwkString) {
  return importPublicKey(jwkString);
}

/**
 * Exports an ECDH private key as PKCS#8 bytes, base64-encoded, then encrypted with the master vault key.
 * @param {CryptoKey} privateKey
 * @param {CryptoKey} vaultKey
 * @returns {Promise<string>} Encrypted ciphertext blob JSON string
 */
export async function exportEncryptedPrivateKeyPKCS8(privateKey, vaultKey) {
  const pkcs8Bytes = await crypto.subtle.exportKey("pkcs8", privateKey);
  return encryptJSON(vaultKey, { pkcs8: b64(pkcs8Bytes) });
}

/**
 * Exports an ECDH private key as a JWK, then encrypts it using the user's master AES-256-GCM vault key.
 * @param {CryptoKey} privateKey
 * @param {CryptoKey} vaultKey
 * @returns {Promise<string>} Encrypted ciphertext blob JSON string
 */
export async function exportEncryptedPrivateKey(privateKey, vaultKey) {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return encryptJSON(vaultKey, jwk);
}

/**
 * Decrypts an encrypted private key blob using the master vault key, then imports the ECDH private key
 * (supports both PKCS#8 payload format and legacy JWK format).
 * @param {string} encryptedBlob
 * @param {CryptoKey} vaultKey
 * @returns {Promise<CryptoKey>}
 */
export async function importDecryptedPrivateKey(encryptedBlob, vaultKey) {
  const decryptedData = await decryptJSON(vaultKey, encryptedBlob);
  if (decryptedData && decryptedData.pkcs8) {
    const pkcs8Buf = unb64(decryptedData.pkcs8);
    return crypto.subtle.importKey(
      "pkcs8",
      pkcs8Buf,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"]
    );
  } else {
    // JWK fallback
    const jwk = typeof decryptedData === "string" ? JSON.parse(decryptedData) : decryptedData;
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"]
    );
  }
}

/**
 * Derives a symmetric AES-256-GCM key from sender's private key and recipient's public key via ECDH.
 * @param {CryptoKey} myPrivateKey
 * @param {CryptoKey} theirPublicKey
 * @returns {Promise<CryptoKey>}
 */
export async function deriveSharedSecretKey(myPrivateKey, theirPublicKey) {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Asymmetrically encrypts a secret payload for a recipient using ECDH P-256 key agreement.
 * @param {string|object} secretPlaintext - The plaintext string or JSON object.
 * @param {string|CryptoKey} recipientPublicKeyBase64 - Recipient's public key (raw base64, JWK, or CryptoKey).
 * @param {CryptoKey} senderPrivateKey - Sender's unlocked ECDH private key.
 * @returns {Promise<{ iv: string, ct: string }>} Encrypted payload object with iv and ct strings.
 */
export async function shareSecret(secretPlaintext, recipientPublicKeyBase64, senderPrivateKey) {
  const recipientPublicKey = typeof recipientPublicKeyBase64 === "string" || (recipientPublicKeyBase64 && recipientPublicKeyBase64.kty)
    ? await importPublicKey(recipientPublicKeyBase64)
    : recipientPublicKeyBase64;

  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: recipientPublicKey },
    senderPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawBytes = typeof secretPlaintext === "string"
    ? enc.encode(secretPlaintext)
    : enc.encode(JSON.stringify(secretPlaintext));

  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, rawBytes);
  return {
    iv: b64(iv),
    ct: b64(ct),
  };
}

/**
 * Asymmetrically decrypts a secret payload received from a sender using ECDH P-256.
 * @param {string|object} encryptedPayload - Ciphertext object { iv, ct } or JSON string.
 * @param {string|CryptoKey} senderPublicKeyBase64 - Sender's public key (raw base64, JWK, or CryptoKey).
 * @param {CryptoKey} recipientPrivateKey - Recipient's unlocked ECDH private key.
 * @returns {Promise<any>} Decrypted plaintext string or object.
 */
export async function receiveSharedSecret(encryptedPayload, senderPublicKeyBase64, recipientPrivateKey) {
  const senderPublicKey = typeof senderPublicKeyBase64 === "string" || (senderPublicKeyBase64 && senderPublicKeyBase64.kty)
    ? await importPublicKey(senderPublicKeyBase64)
    : senderPublicKeyBase64;

  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: senderPublicKey },
    recipientPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const payload = typeof encryptedPayload === "string" ? JSON.parse(encryptedPayload) : encryptedPayload;
  const iv = new Uint8Array(unb64(payload.iv));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, sharedKey, unb64(payload.ct));
  const decodedText = dec.decode(pt);
  try {
    return JSON.parse(decodedText);
  } catch {
    return decodedText;
  }
}

/**
 * Legacy aliases for backwards compatibility.
 */
export async function encryptSharedPayload(myPrivateKey, recipientPublicKey, payloadObj) {
  const res = await shareSecret(payloadObj, recipientPublicKey, myPrivateKey);
  return JSON.stringify(res);
}

export async function decryptSharedPayload(myPrivateKey, senderPublicKey, encryptedBlob) {
  return receiveSharedSecret(encryptedBlob, senderPublicKey, myPrivateKey);
}


