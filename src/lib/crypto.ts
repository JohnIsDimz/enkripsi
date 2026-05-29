import { ChaCha20Poly1305 } from '@stablelib/chacha20poly1305';
import { XChaCha20Poly1305 } from '@stablelib/xchacha20poly1305';
import { argon2id, sha512 } from 'hash-wasm';

export enum EncryptionAlgorithm {
  TRIPLE_LAYER = 'TRIPLE-LAYER'
}

export interface Argon2Settings {
  iterations: number;
  memorySize: number;
  parallelism: number;
}

export const DEFAULT_ARGON2_SETTINGS: Argon2Settings = {
  iterations: 4,
  memorySize: 524288, // 512MB
  parallelism: 4,
};

export const HARDENED_ARGON2_SETTINGS: Argon2Settings = {
  iterations: 8,
  memorySize: 1048576, // 1GB
  parallelism: 8,
};

export const PARANOID_ARGON2_SETTINGS: Argon2Settings = {
  iterations: 16,
  memorySize: 1572864, // 1.5GB
  parallelism: 16,
};

export const ULTRA_ARGON2_SETTINGS: Argon2Settings = {
  iterations: 32,
  memorySize: 2097152, // 2GB
  parallelism: 32,
};

const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16;
const HASH_SIZE = 64; // SHA-512
const HMAC_SIZE = 64; // HMAC-SHA-512

// Header constants
const MAGIC_BYTES = new TextEncoder().encode('THNA'); // ThenaCrypt Magic
const VERSION = 10; // Version 10 (Watermark & Enhanced Cascade)

export class CryptoError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  'KEY_DERIVATION_FAILED': 'Failed to derive cryptographic key. Ensure device memory is sufficient.',
  'ENCRYPTION_FAILED': 'Encryption process failed. File might be too large or format unsupported.',
  'DECRYPTION_FAILED': 'Decryption failed. Incorrect password or file has been modified.',
  'FILE_READ_FAILED': 'Failed to read file. Ensure the file is not being used by another application.',
  'UNSUPPORTED_VERSION': 'Unsupported file version. Please use the appropriate application version.',
  'XCHACHA_DECRYPTION_FAILED': 'Failed at XChaCha20 decryption layer. Data integrity compromised.',
  'CHACHA_DECRYPTION_FAILED': 'Failed at ChaCha20 decryption layer. Data integrity compromised.',
  'MEMORY_LIMIT': 'Memory limit exceeded. Use a smaller file or increase virtual RAM.',
  'INVALID_KEY': 'Invalid or empty cryptographic key.',
  'INVALID_KEY_FORMAT': 'Invalid key format. Ensure the key is in JSON (JWK) format.',
  'KEY_IMPORT_FAILED': 'Failed to import cryptographic key. Ensure the key matches the RSA-4096 algorithm.',
  'INTEGRITY_FAILED': 'Data integrity corrupted (SHA-512 mismatch). Data may have been modified.',
  'HMAC_FAILED': 'Authentication failed (HMAC mismatch). The file might have been tampered with.',
  'QUOTA_EXCEEDED': 'Browser storage quota exceeded. Please clear some space and try again.',
  'NOT_SUPPORTED': 'This cryptographic operation is not supported by your browser.',
  'SIGNATURE_FAILED': 'Digital signature verification failed. The file authenticity cannot be guaranteed.',
  'HYBRID_ENCRYPTION_FAILED': 'Hybrid encryption failed. Check your public keys and try again.',
  'HYBRID_DECRYPTION_FAILED': 'Hybrid decryption failed. Check your private keys and try again.',
  'WORKER_ERROR': 'The background worker encountered a fatal error. Please refresh the page.',
  'BROWSER_LIMIT': 'Your browser has reached its memory limit for this operation. Try a smaller file.',
};

export function getErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';

  // Handle CryptoError
  if (error instanceof CryptoError || (error?.code && ERROR_MESSAGES[error.code])) {
    const code = error.code;
    return ERROR_MESSAGES[code] || error.message;
  }

  // Handle standard browser errors
  if (error.name === 'QuotaExceededError') {
    return ERROR_MESSAGES['QUOTA_EXCEEDED'];
  }
  if (error.name === 'NotSupportedError') {
    return ERROR_MESSAGES['NOT_SUPPORTED'];
  }
  if (error.name === 'OperationError' || error.message?.includes('OperationError')) {
    return 'Cryptographic operation error. Your browser may be restricting access to the Web Crypto API.';
  }
  if (error.name === 'SecurityError') {
    return 'Security error: The operation was blocked by the browser security policy.';
  }

  // Fallback to error message or string representation
  return error.message || error.toString() || 'An unexpected system error occurred.';
}

/**
 * Derives a 256-bit key using Argon2id (Hardened)
 */
export async function deriveKeyArgon2(
  password: string, 
  salt: Uint8Array, 
  settings: Argon2Settings = DEFAULT_ARGON2_SETTINGS
): Promise<Uint8Array> {
  try {
    const hash = await argon2id({
      password,
      salt,
      iterations: settings.iterations,
      memorySize: settings.memorySize,
      parallelism: settings.parallelism,
      hashLength: KEY_LENGTH,
      outputType: 'binary',
    });
    return hash as Uint8Array;
  } catch (e) {
    throw new CryptoError('Failed to derive cryptographic key using Argon2id.', 'KEY_DERIVATION_FAILED');
  }
}

/**
 * Derives sub-keys for Triple Layer + HMAC using HKDF
 */
export async function deriveSubKeys(masterKey: Uint8Array, salt: Uint8Array, version: number = VERSION): Promise<{
  aesKey: Uint8Array,
  chachaKey: Uint8Array,
  xChachaKey: Uint8Array,
  hmacKey: Uint8Array,
  metaKey: Uint8Array
}> {
  const baseKey = await self.crypto.subtle.importKey(
    'raw',
    masterKey,
    'HKDF',
    false,
    ['deriveKey', 'deriveBits']
  );

  const derive = async (info: string) => {
    const bits = await self.crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-512',
        salt: salt,
        info: new TextEncoder().encode(info)
      },
      baseKey,
      256
    );
    return new Uint8Array(bits);
  };

  if (version >= 8) {
    return {
      aesKey: await derive(`THENACRYPT-AES-LAYER-V${version}`),
      chachaKey: await derive(`THENACRYPT-CHACHA-LAYER-V${version}`),
      xChachaKey: await derive(`THENACRYPT-XCHACHA-LAYER-V${version}`),
      hmacKey: await derive(`THENACRYPT-HMAC-AUTH-V${version}`),
      metaKey: await derive(`THENACRYPT-METADATA-V${version}`)
    };
  }

  return {
    aesKey: await derive('AES-LAYER-KEY-V2'),
    chachaKey: await derive('CHACHA-LAYER-KEY-V2'),
    xChachaKey: await derive('XCHACHA-LAYER-KEY-V2'),
    hmacKey: await derive('HMAC-AUTH-KEY-V2'),
    metaKey: await derive('METADATA-KEY-V2')
  };
}

/**
 * Converts raw key to WebCrypto CryptoKey for AES-GCM
 */
export async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return self.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Converts raw key to WebCrypto CryptoKey for HMAC
 */
export async function importHmacKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return self.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign', 'verify']
  );
}

export async function encryptFile(
  file: File,
  password: string,
  settings: Argon2Settings = DEFAULT_ARGON2_SETTINGS,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  let fileData: ArrayBuffer | null = null;
  let masterKey: Uint8Array | null = null;
  
  try {
    const salt = self.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    fileData = await file.arrayBuffer();
    
    if (onProgress) onProgress(5);

    // Key Derivation: Argon2id (Hardened)
    masterKey = await deriveKeyArgon2(password, salt, settings);
    if (onProgress) onProgress(20);

    // Derive Sub-Keys
    const subKeys = await deriveSubKeys(masterKey, salt);

    // Clean master key from memory immediately after deriving sub-keys
    masterKey.fill(0);
    masterKey = null;

    // 1. Encrypt Metadata (Filename, Size, Watermark)
    const metadata = JSON.stringify({ 
      name: file.name, 
      size: file.size, 
      type: file.type,
      watermark: '©John_tamvan',
      timestamp: Date.now()
    });
    const metaIv = self.crypto.getRandomValues(new Uint8Array(12));
    const metaKey = await importAesKey(subKeys.metaKey);
    const encryptedMeta = await self.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: metaIv },
      metaKey,
      new TextEncoder().encode(metadata)
    );

    // Layer 1: AES-256-GCM
    const ivAes = self.crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await importAesKey(subKeys.aesKey);
    let encryptedAes: ArrayBuffer | null = await self.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivAes },
      aesKey,
      fileData
    );
    if (onProgress) onProgress(40);

    // Layer 2: ChaCha20-Poly1305
    const ivChacha = self.crypto.getRandomValues(new Uint8Array(12));
    const chachaCipher = new ChaCha20Poly1305(subKeys.chachaKey);
    let encryptedChacha: Uint8Array | null = chachaCipher.seal(ivChacha, new Uint8Array(encryptedAes));
    
    // Deallocate Layer 1 intermediate buffers
    encryptedAes = null;
    if (onProgress) onProgress(60);

    // Layer 3: XChaCha20-Poly1305
    const ivXChacha = self.crypto.getRandomValues(new Uint8Array(24));
    const xChachaCipher = new XChaCha20Poly1305(subKeys.xChachaKey);
    let encryptedTriple: Uint8Array | null = xChachaCipher.seal(ivXChacha, encryptedChacha);
    
    // Deallocate Layer 2 intermediate buffers
    encryptedChacha = null;
    if (onProgress) onProgress(80);

    // Integrity: SHA-512
    const hashHex = await sha512(new Uint8Array(fileData));
    const hash = new Uint8Array(hashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    // Header Construction
    const headerPartialSize = 4 + 1 + 1 + SALT_LENGTH + 2 + 4 + 1 + 12 + 12 + 24 + 12 + 2 + encryptedMeta.byteLength + HASH_SIZE;
    const headerPartial = new Uint8Array(headerPartialSize);
    let hOffset = 0;
    headerPartial.set(MAGIC_BYTES, hOffset); hOffset += 4;
    headerPartial[hOffset] = VERSION; hOffset += 1;
    headerPartial[hOffset] = 6; // Algo ID 6 for Hardened Triple Layer V2
    hOffset += 1;
    headerPartial.set(salt, hOffset); hOffset += SALT_LENGTH;
    
    // Write iterations as 16-bit little endian
    headerPartial[hOffset] = settings.iterations & 0xFF;
    headerPartial[hOffset + 1] = (settings.iterations >> 8) & 0xFF;
    hOffset += 2;
    
    // Write memorySize as 32-bit little endian
    headerPartial[hOffset] = settings.memorySize & 0xFF;
    headerPartial[hOffset + 1] = (settings.memorySize >> 8) & 0xFF;
    headerPartial[hOffset + 2] = (settings.memorySize >> 16) & 0xFF;
    headerPartial[hOffset + 3] = (settings.memorySize >> 24) & 0xFF;
    hOffset += 4;
    
    // Write parallelism as 8-bit uint
    headerPartial[hOffset] = settings.parallelism;
    hOffset += 1;
    
    headerPartial.set(ivAes, hOffset); hOffset += 12;
    headerPartial.set(ivChacha, hOffset); hOffset += 12;
    headerPartial.set(ivXChacha, hOffset); hOffset += 24;
    headerPartial.set(metaIv, hOffset); hOffset += 12;
    
    // Write metaLen as 16-bit little endian
    headerPartial[hOffset] = encryptedMeta.byteLength & 0xFF;
    headerPartial[hOffset + 1] = (encryptedMeta.byteLength >> 8) & 0xFF;
    hOffset += 2;
    
    headerPartial.set(new Uint8Array(encryptedMeta), hOffset); hOffset += encryptedMeta.byteLength;
    headerPartial.set(hash, hOffset); hOffset += HASH_SIZE;

    // Authentication: HMAC-SHA-512 (Binding Header + Ciphertext)
    const hmacKey = await importHmacKey(subKeys.hmacKey);
    let authData: Uint8Array | null = new Uint8Array(headerPartial.byteLength + encryptedTriple.byteLength);
    authData.set(headerPartial);
    authData.set(encryptedTriple, headerPartial.byteLength);
    
    const hmacVal = new Uint8Array(await self.crypto.subtle.sign(
      'HMAC',
      hmacKey,
      authData
    ));

    authData = null;

    // Final Package
    const result = new Uint8Array(headerPartialSize + HMAC_SIZE + encryptedTriple.byteLength);
    result.set(headerPartial, 0);
    result.set(hmacVal, headerPartialSize);
    result.set(new Uint8Array(encryptedTriple), headerPartialSize + HMAC_SIZE);

    // Secure zeroization of sub-keys
    subKeys.aesKey.fill(0);
    subKeys.chachaKey.fill(0);
    subKeys.xChachaKey.fill(0);
    subKeys.hmacKey.fill(0);
    subKeys.metaKey.fill(0);

    // Free references
    fileData = null;
    encryptedTriple = null;

    if (onProgress) onProgress(100);

    return new Blob([result], { type: 'application/octet-stream' });
  } catch (e) {
    if (e instanceof CryptoError) throw e;
    throw new CryptoError('Encryption failed. This might be due to memory constraints.', 'ENCRYPTION_FAILED');
  }
}

export async function decryptFile(
  file: File,
  password: string,
  settings: Argon2Settings = DEFAULT_ARGON2_SETTINGS,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; fileName: string; watermark?: string }> {
  let fileData: ArrayBuffer | null = null;
  try {
    fileData = await file.arrayBuffer();
  } catch (e) {
    throw new CryptoError('Failed to read file data.', 'FILE_READ_FAILED');
  }

  let data: Uint8Array | null = new Uint8Array(fileData);
  fileData = null; // deallocate instantly

  const magic = data.slice(0, 4);
  const magicStr = new TextDecoder().decode(magic);

  if (magicStr === 'JKTC') {
    const result = await decryptFileTurbo(data, password, onProgress);
    return { ...result, watermark: '©John_tamvan' };
  }

  const isThnaFormat = magicStr === 'THNA';

  if (!isThnaFormat) {
    // Legacy fallback
    try {
      const salt = data.slice(0, 16);
      const iv = data.slice(16, 16 + 12);
      const encryptedContent = data.slice(16 + 12);
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const baseKey = await self.crypto.subtle.importKey('raw', passwordData, 'PBKDF2', false, ['deriveKey']);
      const key = await self.crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      const decrypted = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedContent);
      data = null;
      return { blob: new Blob([decrypted]), fileName: file.name.replace('.enc', ''), watermark: '©John_tamvan' };
    } catch (e) {
      throw new CryptoError('Decryption failed.', 'DECRYPTION_FAILED');
    }
  }

  const version = data[4];
  const algoId = data[5];
  const salt = data.slice(6, 6 + SALT_LENGTH);

  try {
    let decryptedContent: ArrayBuffer | null = null;
    let fileName = file.name.replace('.enc', '');
    let watermark = '©John_tamvan';

    if (version >= 9 && algoId === 6) {
      let offset = 6 + SALT_LENGTH;
      const fileIterations = data[offset] | (data[offset + 1] << 8); offset += 2;
      const fileMemorySize = data[offset] | 
                             (data[offset + 1] << 8) | 
                             (data[offset + 2] << 16) | 
                             (data[offset + 3] << 24); offset += 4;
      const fileParallelism = data[offset]; offset += 1;
      
      const fileSettings: Argon2Settings = {
        iterations: fileIterations,
        memorySize: fileMemorySize,
        parallelism: fileParallelism
      };
      
      const ivAes = data.slice(offset, offset + 12); offset += 12;
      const ivChacha = data.slice(offset, offset + 12); offset += 12;
      const ivXChacha = data.slice(offset, offset + 24); offset += 24;
      const metaIv = data.slice(offset, offset + 12); offset += 12;
      const metaLen = data[offset] | (data[offset + 1] << 8); offset += 2;
      const encryptedMeta = data.slice(offset, offset + metaLen); offset += metaLen;
      const expectedHash = data.slice(offset, offset + HASH_SIZE); offset += HASH_SIZE;
      
      const headerPartial = data.slice(0, offset);
      const expectedHmac = data.slice(offset, offset + HMAC_SIZE); offset += HMAC_SIZE;
      const encryptedContent = data.slice(offset);

      let masterKey: Uint8Array | null = await deriveKeyArgon2(password, salt, fileSettings);
      if (onProgress) onProgress(30);

      const subKeys = await deriveSubKeys(masterKey, salt, version);
      masterKey.fill(0);
      masterKey = null;

      // Verify HMAC
      const hmacKey = await importHmacKey(subKeys.hmacKey);
      let authData: Uint8Array | null = new Uint8Array(headerPartial.byteLength + encryptedContent.byteLength);
      authData.set(headerPartial);
      authData.set(encryptedContent, headerPartial.byteLength);

      const isValidHmac = await self.crypto.subtle.verify('HMAC', hmacKey, expectedHmac, authData);
      authData = null;
      if (!isValidHmac) throw new CryptoError('Authentication failed (HMAC mismatch).', 'HMAC_FAILED');

      // Decrypt Metadata
      const metaKey = await importAesKey(subKeys.metaKey);
      const decryptedMetaBuffer = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv: metaIv }, metaKey, encryptedMeta);
      const meta = JSON.parse(new TextDecoder().decode(decryptedMetaBuffer));
      fileName = meta.name;
      watermark = meta.watermark || watermark;

      // Layer 1: XChaCha20-Poly1305
      const xChachaCipher = new XChaCha20Poly1305(subKeys.xChachaKey);
      let decryptedXChacha: Uint8Array | null = xChachaCipher.open(ivXChacha, encryptedContent);
      if (!decryptedXChacha) throw new CryptoError('XChaCha20 decryption failed.', 'XCHACHA_DECRYPTION_FAILED');
      if (onProgress) onProgress(60);

      // Layer 2: ChaCha20-Poly1305
      const chachaCipher = new ChaCha20Poly1305(subKeys.chachaKey);
      let decryptedChacha: Uint8Array | null = chachaCipher.open(ivChacha, decryptedXChacha);
      decryptedXChacha = null;
      if (!decryptedChacha) throw new CryptoError('ChaCha20 decryption failed.', 'CHACHA_DECRYPTION_FAILED');
      if (onProgress) onProgress(80);

      // Layer 3: AES-256-GCM
      const aesKey = await importAesKey(subKeys.aesKey);
      decryptedContent = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivAes }, aesKey, decryptedChacha);
      decryptedChacha = null;

      // Verify Integrity
      const actualHashHex = await sha512(new Uint8Array(decryptedContent));
      const actualHash = new Uint8Array(actualHashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      for (let i = 0; i < HASH_SIZE; i++) {
        if (actualHash[i] !== expectedHash[i]) throw new CryptoError('Integrity check failed.', 'INTEGRITY_FAILED');
      }

      // Zeroize subkeys
      subKeys.aesKey.fill(0);
      subKeys.chachaKey.fill(0);
      subKeys.xChachaKey.fill(0);
      subKeys.hmacKey.fill(0);
      subKeys.metaKey.fill(0);
    } else {
      throw new CryptoError('Unsupported version.', 'UNSUPPORTED_VERSION');
    }

    if (onProgress) onProgress(100);
    return { blob: new Blob([decryptedContent]), fileName, watermark };
  } catch (e) {
    if (e instanceof CryptoError) throw e;
    throw new CryptoError('Decryption failed.', 'DECRYPTION_FAILED');
  }
}

export async function decryptFileTurbo(
  data: Uint8Array,
  password: string,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; fileName: string }> {
  try {
    let offset = 4;
    const version = data[offset]; offset += 1;
    const salt = data.slice(offset, offset + SALT_LENGTH); offset += SALT_LENGTH;
    const ivAes = data.slice(offset, offset + 12); offset += 12;
    const metaIv = data.slice(offset, offset + 12); offset += 12;
    const metaLen = new DataView(data.buffer, data.byteOffset + offset, 2).getUint16(0, true); offset += 2;
    const encryptedMeta = data.slice(offset, offset + metaLen); offset += metaLen;
    const encryptedContent = data.slice(offset);

    const baseKey = await self.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const derivedKeyBuffer = await self.crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 60000, hash: 'SHA-256' }, baseKey, 512);
    const derivedBytes = new Uint8Array(derivedKeyBuffer);
    const aesKeyBytes = derivedBytes.slice(0, 32);
    const metaKeyBytes = derivedBytes.slice(32, 64);

    const aesKey = await self.crypto.subtle.importKey('raw', aesKeyBytes, 'AES-GCM', false, ['decrypt']);
    const metaKey = await self.crypto.subtle.importKey('raw', metaKeyBytes, 'AES-GCM', false, ['decrypt']);

    const decryptedMetaBuffer = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv: metaIv }, metaKey, encryptedMeta);
    const meta = JSON.parse(new TextDecoder().decode(decryptedMetaBuffer));
    
    const decryptedContent = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivAes }, aesKey, encryptedContent);
    
    return { blob: new Blob([decryptedContent]), fileName: meta.name };
  } catch (e) {
    throw new CryptoError('Turbo decryption failed.', 'DECRYPTION_FAILED');
  }
}

export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let strength = 0;
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[a-z]/.test(password)) strength += 10;
  if (/[0-9]/.test(password)) strength += 20;
  if (/[^A-Za-z0-9]/.test(password)) strength += 20;
  const commonPatterns = ['123', 'password', 'qwerty', 'admin'];
  for (const pattern of commonPatterns) {
    if (password.toLowerCase().includes(pattern)) {
      strength -= 20;
      break;
    }
  }
  if (/(.)\1\1/.test(password)) strength -= 10;
  return Math.max(0, Math.min(100, strength));
}

export async function encryptFileTurbo(
  file: File,
  password: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  try {
    if (onProgress) onProgress(5);
    const salt = self.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const fileData = await file.arrayBuffer();
    if (onProgress) onProgress(15);

    const baseKey = await self.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const derivedKeyBuffer = await self.crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 60000, hash: 'SHA-256' }, baseKey, 512);
    const derivedBytes = new Uint8Array(derivedKeyBuffer);
    const aesKeyBytes = derivedBytes.slice(0, 32);
    const metaKeyBytes = derivedBytes.slice(32, 64);

    const aesKey = await self.crypto.subtle.importKey('raw', aesKeyBytes, 'AES-GCM', false, ['encrypt']);
    const metaKey = await self.crypto.subtle.importKey('raw', metaKeyBytes, 'AES-GCM', false, ['encrypt']);

    const metadata = JSON.stringify({ name: file.name, size: file.size, type: file.type, watermark: '©John_tamvan' });
    const metaIv = self.crypto.getRandomValues(new Uint8Array(12));
    const encryptedMeta = await self.crypto.subtle.encrypt({ name: 'AES-GCM', iv: metaIv }, metaKey, new TextEncoder().encode(metadata));

    const ivAes = self.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await self.crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivAes }, aesKey, fileData);
    
    const jktcMagic = new TextEncoder().encode('JKTC');
    const headerSize = 4 + 1 + SALT_LENGTH + 12 + 12 + 2 + encryptedMeta.byteLength;
    const header = new Uint8Array(headerSize);
    
    let offset = 0;
    header.set(jktcMagic, offset); offset += 4;
    header[offset] = 1; offset += 1;
    header.set(salt, offset); offset += SALT_LENGTH;
    header.set(ivAes, offset); offset += 12;
    header.set(metaIv, offset); offset += 12;
    new DataView(header.buffer).setUint16(offset, encryptedMeta.byteLength, true); offset += 2;
    header.set(new Uint8Array(encryptedMeta), offset);

    const result = new Uint8Array(header.byteLength + encryptedContent.byteLength);
    result.set(header, 0);
    result.set(new Uint8Array(encryptedContent), header.byteLength);

    return new Blob([result], { type: 'application/octet-stream' });
  } catch (e) {
    throw new CryptoError('Turbo encryption failed.', 'ENCRYPTION_FAILED');
  }
}
