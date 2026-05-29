import { CryptoError } from './crypto';
import { sha512 } from 'hash-wasm';

/**
 * Hybrid Encryption Implementation (2026 Hardened Standard)
 * 1. Symmetric: AES-256-GCM
 * 2. Asymmetric: RSA-4096-OAEP (Encryption)
 * 3. Signature: RSA-4096-PSS (Authenticity)
 * 4. Post-Quantum: Kyber-1024 Simulation
 * 5. Integrity: SHA-512
 */

const RSA_KEY_SIZE = 512; // RSA-4096 ciphertext/signature size
const KYBER_CIPHERTEXT_SIZE = 1568;
const ECDH_PUB_SIZE = 133; // P-521 uncompressed public key
const IV_SIZE = 12;
const TAG_SIZE = 16;
const HASH_SIZE = 64;
const HMAC_SIZE = 64;
const MAGIC_BYTES = new TextEncoder().encode('THYB'); // Thena Hybrid Magic
const VERSION = 8;

export interface HybridKeyPair {
  encryption: {
    rsa: CryptoKey;
    ecdh: CryptoKey;
  };
  signing: {
    rsa: CryptoKey;
  };
}

export interface ExportedHybridKey {
  rsa: string;
  ecdh: string;
}

/**
 * Generates a Triple-Hybrid key pair (RSA-4096 + ECDH-P521 + RSA-PSS)
 */
export async function generateHybridKeyPair(): Promise<{
  encryption: {
    publicKey: { rsa: CryptoKey; ecdh: CryptoKey };
    privateKey: { rsa: CryptoKey; ecdh: CryptoKey };
  };
  signing: {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
  };
}> {
  try {
    const rsaEncryption = await self.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-512',
      },
      true,
      ['encrypt', 'decrypt']
    );

    const ecdhEncryption = await self.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-521',
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    const signing = await self.crypto.subtle.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-512',
      },
      true,
      ['sign', 'verify']
    );

    return { 
      encryption: {
        publicKey: { rsa: rsaEncryption.publicKey, ecdh: ecdhEncryption.publicKey },
        privateKey: { rsa: rsaEncryption.privateKey, ecdh: ecdhEncryption.privateKey }
      },
      signing: {
        publicKey: signing.publicKey,
        privateKey: signing.privateKey
      }
    };
  } catch (e) {
    throw new CryptoError('Failed to generate Triple-Hybrid key pairs.', 'KEY_GEN_FAILED');
  }
}

async function deriveHybridSubKeys(
  rsaSecret: Uint8Array, 
  ecdhSecret: Uint8Array, 
  kyberSecret: Uint8Array,
  version: number = VERSION
): Promise<{
  sessionKey: CryptoKey,
  hmacKey: CryptoKey,
  metaKey: CryptoKey
}> {
  const combined = new Uint8Array(rsaSecret.length + ecdhSecret.length + kyberSecret.length);
  combined.set(rsaSecret);
  combined.set(ecdhSecret, rsaSecret.length);
  combined.set(kyberSecret, rsaSecret.length + ecdhSecret.length);

  const baseKey = await self.crypto.subtle.importKey('raw', combined, 'HKDF', false, ['deriveKey']);
  
  const sessionInfo = version === 8 ? 'THENACRYPT-HYBRID-SESSION-V8' : 'THENACRYPT-HYBRID-SESSION-V4';
  const hmacInfo = version === 8 ? 'THENACRYPT-HYBRID-HMAC-V8' : 'THENACRYPT-HYBRID-HMAC-V4';
  const metaInfo = version === 8 ? 'THENACRYPT-HYBRID-META-V8' : 'THENACRYPT-HYBRID-META-V4';

  const sessionKey = await self.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-512',
      salt: new Uint8Array(64),
      info: new TextEncoder().encode(sessionInfo)
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const hmacKey = await self.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-512',
      salt: new Uint8Array(64),
      info: new TextEncoder().encode(hmacInfo)
    },
    baseKey,
    { name: 'HMAC', hash: 'SHA-512', length: 512 },
    false,
    ['sign', 'verify']
  );

  const metaKey = await self.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-512',
      salt: new Uint8Array(64),
      info: new TextEncoder().encode(metaInfo)
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { sessionKey, hmacKey, metaKey };
}

export async function encryptHybrid(
  file: File,
  publicKeyJwk: string,
  signingKeyJwk?: string,
  onProgress?: (p: number) => void
): Promise<Blob> {
  let fileData: ArrayBuffer | null = null;
  try {
    fileData = await file.arrayBuffer();
    const keys = await importKey(publicKeyJwk, 'public', 'RSA-OAEP') as { rsa: CryptoKey; ecdh: CryptoKey };
    const pubKey = keys.rsa;
    const recipientEcdhPubKey = keys.ecdh;

    if (onProgress) onProgress(10);

    // 1. Generate Secrets
    const rsaSecret = self.crypto.getRandomValues(new Uint8Array(32));
    
    // 2. ECDH Ephemeral Exchange
    const ephemeralEcdh = await self.crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-521' }, true, ['deriveBits']);
    const ecdhSecretBuffer = await self.crypto.subtle.deriveBits(
      { name: 'ECDH', public: recipientEcdhPubKey },
      ephemeralEcdh.privateKey,
      528
    );
    const ecdhSecret = new Uint8Array(ecdhSecretBuffer);
    const ephemeralEcdhPubExported = await self.crypto.subtle.exportKey('raw', ephemeralEcdh.publicKey);
    const ephemeralEcdhPub = new Uint8Array(ephemeralEcdhPubExported);

    // 3. Kyber-1024 Simulation
    const kyberCiphertext = self.crypto.getRandomValues(new Uint8Array(KYBER_CIPHERTEXT_SIZE));
    const kyberSecret = new Uint8Array(await self.crypto.subtle.digest('SHA-512', kyberCiphertext));
    if (onProgress) onProgress(20);

    // 4. Derive Keys
    const { sessionKey, hmacKey, metaKey } = await deriveHybridSubKeys(rsaSecret, ecdhSecret, kyberSecret);
    
    // Zero out sensitive intermediary Secrets to prevent leaking
    // Note: rsaSecret is cleared AFTER being encrypted for the recipient below
    ecdhSecret.fill(0);
    kyberSecret.fill(0);

    if (onProgress) onProgress(30);

    // 5. Encrypt Metadata
    const metadata = JSON.stringify({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified });
    const metaIv = self.crypto.getRandomValues(new Uint8Array(12));
    const encryptedMeta = await self.crypto.subtle.encrypt({ name: 'AES-GCM', iv: metaIv }, metaKey, new TextEncoder().encode(metadata));
    const metaLen = new Uint16Array([encryptedMeta.byteLength]);

    // 6. Encrypt Data
    const iv = self.crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const encryptedData = await self.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, fileData);
    const fullCiphertext = new Uint8Array(encryptedData);
    const ciphertext = fullCiphertext.slice(0, -TAG_SIZE);
    const tag = fullCiphertext.slice(-TAG_SIZE);
    if (onProgress) onProgress(50);

    // 7. Encrypt RSA Secret (using the SAME rsaSecret used for key derivation)
    const encryptedRsaSecret = await self.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, rsaSecret);
    if (onProgress) onProgress(70);

    // 8. Integrity & Signature
    const hashHex = await sha512(new Uint8Array(fileData));
    const hash = new Uint8Array(hashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    let signature = new Uint8Array(RSA_KEY_SIZE);
    if (signingKeyJwk) {
      const signKey = await importKey(signingKeyJwk, 'private', 'RSA-PSS') as CryptoKey;
      const sigBuffer = await self.crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 64 }, signKey, fileData);
      signature = new Uint8Array(sigBuffer);
    }

    // 9. Build Package
    // Zero out rsaSecret now that it has been encrypted
    rsaSecret.fill(0);

    const partialSize = 4 + 1 + RSA_KEY_SIZE + RSA_KEY_SIZE + KYBER_CIPHERTEXT_SIZE + ECDH_PUB_SIZE + IV_SIZE + 12 + 2 + encryptedMeta.byteLength + TAG_SIZE + HASH_SIZE;
    const partial = new Uint8Array(partialSize);
    let offset = 0;
    partial.set(MAGIC_BYTES, offset); offset += 4;
    partial[offset] = VERSION; offset += 1;
    partial.set(signature, offset); offset += RSA_KEY_SIZE;
    partial.set(new Uint8Array(encryptedRsaSecret), offset); offset += RSA_KEY_SIZE;
    partial.set(kyberCiphertext, offset); offset += KYBER_CIPHERTEXT_SIZE;
    partial.set(ephemeralEcdhPub, offset); offset += ECDH_PUB_SIZE;
    partial.set(iv, offset); offset += IV_SIZE;
    partial.set(metaIv, offset); offset += 12;
    partial.set(new Uint8Array(metaLen.buffer), offset); offset += 2;
    partial.set(new Uint8Array(encryptedMeta), offset); offset += encryptedMeta.byteLength;
    partial.set(tag, offset); offset += TAG_SIZE;
    partial.set(hash, offset); offset += HASH_SIZE;

    let authData: Uint8Array | null = new Uint8Array(partial.byteLength + ciphertext.byteLength);
    authData.set(partial);
    authData.set(ciphertext, partial.byteLength);
    const hmacVal = new Uint8Array(await self.crypto.subtle.sign('HMAC', hmacKey, authData));

    authData = null;

    const result = new Uint8Array(partialSize + HMAC_SIZE + ciphertext.byteLength);
    result.set(partial, 0);
    result.set(hmacVal, partialSize);
    result.set(ciphertext, partialSize + HMAC_SIZE);

    // Free buffers
    fileData = null;

    if (onProgress) onProgress(100);
    return new Blob([result], { type: 'application/octet-stream' });
  } catch (e) {
    throw new CryptoError('Hybrid encryption failed.', 'HYBRID_ENCRYPTION_FAILED');
  }
}

export async function decryptHybrid(
  packageData: ArrayBuffer,
  privateKeyJwk: string,
  verifyKeyJwk?: string,
  onProgress?: (p: number) => void
): Promise<{ decryptedData: ArrayBuffer, fileName: string }> {
  try {
    let data: Uint8Array | null = new Uint8Array(packageData);
    const magic = data.slice(0, 4);
    const isHybridFormat = new TextDecoder().decode(magic) === 'THYB';

    if (!isHybridFormat) {
      const legacyResult = await decryptHybridV1(packageData, privateKeyJwk, verifyKeyJwk, onProgress);
      data = null;
      return legacyResult;
    }

    const version = data[4];
    if (version < 2) throw new CryptoError('Unsupported hybrid version.', 'UNSUPPORTED_VERSION');
    if (version === 2) {
      const v2Result = await decryptHybridV2(packageData, privateKeyJwk, verifyKeyJwk, onProgress);
      data = null;
      return v2Result;
    }

    const keys = await importKey(privateKeyJwk, 'private', 'RSA-OAEP') as { rsa: CryptoKey; ecdh: CryptoKey };
    const privKey = keys.rsa;
    const recipientEcdhPrivKey = keys.ecdh;
    if (onProgress) onProgress(10);

    let offset = 5;
    const signature = data.slice(offset, offset + RSA_KEY_SIZE); offset += RSA_KEY_SIZE;
    const encryptedRsaSecret = data.slice(offset, offset + RSA_KEY_SIZE); offset += RSA_KEY_SIZE;
    const kyberCiphertext = data.slice(offset, offset + KYBER_CIPHERTEXT_SIZE); offset += KYBER_CIPHERTEXT_SIZE;
    const ephemeralEcdhPubRaw = data.slice(offset, offset + ECDH_PUB_SIZE); offset += ECDH_PUB_SIZE;
    const iv = data.slice(offset, offset + IV_SIZE); offset += IV_SIZE;
    const metaIv = data.slice(offset, offset + 12); offset += 12;
    const metaLen = data[offset] | (data[offset + 1] << 8); offset += 2;
    const encryptedMeta = data.slice(offset, offset + metaLen); offset += metaLen;
    const tag = data.slice(offset, offset + TAG_SIZE); offset += TAG_SIZE;
    const expectedHash = data.slice(offset, offset + HASH_SIZE); offset += HASH_SIZE;
    
    const partial = data.slice(0, offset);
    const expectedHmac = data.slice(offset, offset + HMAC_SIZE); offset += HMAC_SIZE;
    const ciphertext = data.slice(offset);
    if (onProgress) onProgress(30);

    // 1. Unwrap Secrets
    const rsaSecretBuffer = await self.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privKey, encryptedRsaSecret);
    const rsaSecret = new Uint8Array(rsaSecretBuffer);

    const ephemeralEcdhPubKey = await self.crypto.subtle.importKey('raw', ephemeralEcdhPubRaw, { name: 'ECDH', namedCurve: 'P-521' }, true, []);
    const ecdhSecretBuffer = await self.crypto.subtle.deriveBits({ name: 'ECDH', public: ephemeralEcdhPubKey }, recipientEcdhPrivKey, 528);
    const ecdhSecret = new Uint8Array(ecdhSecretBuffer);

    const kyberSecret = new Uint8Array(await self.crypto.subtle.digest('SHA-512', kyberCiphertext));

    // 2. Derive Keys
    const { sessionKey, hmacKey, metaKey } = await deriveHybridSubKeys(rsaSecret, ecdhSecret, kyberSecret, version);
    if (onProgress) onProgress(40);

    // Zeroize sensitive secrets
    rsaSecret.fill(0);
    ecdhSecret.fill(0);
    kyberSecret.fill(0);

    // 3. Verify HMAC
    let authData: Uint8Array | null = new Uint8Array(partial.byteLength + ciphertext.byteLength);
    authData.set(partial);
    authData.set(ciphertext, partial.byteLength);
    const isValidHmac = await self.crypto.subtle.verify('HMAC', hmacKey, expectedHmac, authData);
    authData = null;
    if (!isValidHmac) throw new CryptoError('Authentication failed (HMAC mismatch).', 'HMAC_FAILED');

    // 4. Decrypt Metadata
    const decryptedMetaBuffer = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv: metaIv }, metaKey, encryptedMeta);
    const meta = JSON.parse(new TextDecoder().decode(decryptedMetaBuffer));
    const fileName = meta.name;

    // 5. Decrypt Data
    let fullCiphertext: Uint8Array | null = new Uint8Array(ciphertext.byteLength + TAG_SIZE);
    fullCiphertext.set(ciphertext);
    fullCiphertext.set(tag, ciphertext.byteLength);
    const decryptedData = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sessionKey, fullCiphertext);
    fullCiphertext = null;
    if (onProgress) onProgress(80);

    // 6. Verify Integrity
    const actualHashHex = await sha512(new Uint8Array(decryptedData));
    const actualHash = new Uint8Array(actualHashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    for (let i = 0; i < HASH_SIZE; i++) {
      if (actualHash[i] !== expectedHash[i]) throw new Error('Integrity check failed');
    }

    // 7. Verify Signature
    if (verifyKeyJwk) {
      const vKey = await importKey(verifyKeyJwk, 'public', 'RSA-PSS') as CryptoKey;
      const isValid = await self.crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 64 }, vKey, signature, decryptedData);
      if (!isValid) throw new Error('Signature verification failed');
    }

    data = null; // deallocate raw package data copy

    if (onProgress) onProgress(100);
    return { decryptedData, fileName };
  } catch (e: any) {
    if (e.message === 'Integrity check failed') throw new CryptoError('Data integrity corrupted.', 'INTEGRITY_FAILED');
    if (e.message === 'Signature verification failed') throw new CryptoError('Digital signature invalid.', 'SIGNATURE_FAILED');
    if (e instanceof CryptoError) throw e;
    throw new CryptoError('Hybrid decryption failed.', 'HYBRID_DECRYPTION_FAILED');
  }
}

async function decryptHybridV2(
  packageData: ArrayBuffer,
  privateKeyJwk: string,
  verifyKeyJwk?: string,
  onProgress?: (p: number) => void
): Promise<{ decryptedData: ArrayBuffer, fileName: string }> {
  try {
    const data = new Uint8Array(packageData);
    const privKey = await importKey(privateKeyJwk, 'private', 'RSA-OAEP') as CryptoKey;
    let offset = 5;
    const signature = data.slice(offset, offset + RSA_KEY_SIZE); offset += RSA_KEY_SIZE;
    const encryptedRsaSecret = data.slice(offset, offset + RSA_KEY_SIZE); offset += RSA_KEY_SIZE;
    const kyberCiphertext = data.slice(offset, offset + KYBER_CIPHERTEXT_SIZE); offset += KYBER_CIPHERTEXT_SIZE;
    const iv = data.slice(offset, offset + IV_SIZE); offset += IV_SIZE;
    const metaIv = data.slice(offset, offset + 12); offset += 12;
    const metaLen = data[offset] | (data[offset + 1] << 8); offset += 2;
    const encryptedMeta = data.slice(offset, offset + metaLen); offset += metaLen;
    const tag = data.slice(offset, offset + TAG_SIZE); offset += TAG_SIZE;
    const expectedHash = data.slice(offset, offset + HASH_SIZE); offset += HASH_SIZE;
    const partial = data.slice(0, offset);
    const expectedHmac = data.slice(offset, offset + HMAC_SIZE); offset += HMAC_SIZE;
    const ciphertext = data.slice(offset);

    const rsaSecret = new Uint8Array(await self.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privKey, encryptedRsaSecret));
    const kyberSecret = new Uint8Array(await self.crypto.subtle.digest('SHA-512', kyberCiphertext));
    
    const combined = new Uint8Array(rsaSecret.length + kyberSecret.length);
    combined.set(rsaSecret);
    combined.set(kyberSecret, rsaSecret.length);
    const baseKey = await self.crypto.subtle.importKey('raw', combined, 'HKDF', false, ['deriveKey']);
    const hmacKey = await self.crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-512', salt: new Uint8Array(32), info: new TextEncoder().encode('HYBRID-HMAC-KEY-V3') }, baseKey, { name: 'HMAC', hash: 'SHA-512', length: 512 }, false, ['verify']);
    const isValidHmac = await self.crypto.subtle.verify('HMAC', hmacKey, expectedHmac, data.slice(0, offset + ciphertext.byteLength)); 
    if (!isValidHmac) throw new CryptoError('Authentication failed (HMAC mismatch).', 'HMAC_FAILED');

    const sessionKey = await self.crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-512', salt: new Uint8Array(32), info: new TextEncoder().encode('HYBRID-SESSION-KEY-V3') }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const fullCiphertext = new Uint8Array(ciphertext.byteLength + TAG_SIZE);
    fullCiphertext.set(ciphertext);
    fullCiphertext.set(tag, ciphertext.byteLength);
    const decryptedData = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sessionKey, fullCiphertext);

    if (verifyKeyJwk) {
      const vKey = await importKey(verifyKeyJwk, 'public', 'RSA-PSS') as CryptoKey;
      const isValid = await self.crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 64 }, vKey, signature, decryptedData);
      if (!isValid) throw new Error('Signature verification failed');
    }

    return { decryptedData, fileName: 'decrypted_file_v2' };
  } catch (e: any) {
    if (e.message === 'Signature verification failed') throw new CryptoError('Digital signature invalid.', 'SIGNATURE_FAILED');
    if (e instanceof CryptoError) throw e;
    throw new CryptoError('V2 Hybrid decryption failed.', 'HYBRID_DECRYPTION_FAILED');
  }
}

async function decryptHybridV1(
  packageData: ArrayBuffer,
  privateKeyJwk: string,
  verifyKeyJwk?: string,
  onProgress?: (p: number) => void
): Promise<{ decryptedData: ArrayBuffer, fileName: string }> {
  try {
    const data = new Uint8Array(packageData);
    const privKey = await importKey(privateKeyJwk, 'private', 'RSA-OAEP') as CryptoKey;
    let offset = 0;
    const signature = data.slice(offset, offset + RSA_KEY_SIZE); offset += RSA_KEY_SIZE;
    const encryptedRsaSecret = data.slice(offset, offset + RSA_KEY_SIZE); offset += RSA_KEY_SIZE;
    const kyberCiphertext = data.slice(offset, offset + KYBER_CIPHERTEXT_SIZE); offset += KYBER_CIPHERTEXT_SIZE;
    const iv = data.slice(offset, offset + IV_SIZE); offset += IV_SIZE;
    const tag = data.slice(offset, offset + TAG_SIZE); offset += TAG_SIZE;
    const expectedHash = data.slice(offset, offset + HASH_SIZE); offset += HASH_SIZE;
    const ciphertext = data.slice(offset);

    const rsaSecret = await self.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privKey, encryptedRsaSecret);
    const kyberSecret = new Uint8Array(await self.crypto.subtle.digest('SHA-256', kyberCiphertext));
    
    const combined = new Uint8Array(rsaSecret.byteLength + kyberSecret.length);
    combined.set(new Uint8Array(rsaSecret));
    combined.set(kyberSecret, rsaSecret.byteLength);
    const baseKey = await self.crypto.subtle.importKey('raw', combined, 'HKDF', false, ['deriveKey']);
    const sessionKey = await self.crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-512', salt: new Uint8Array(32), info: new TextEncoder().encode('HYBRID-SESSION-KEY-V2') },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const fullCiphertext = new Uint8Array(ciphertext.byteLength + TAG_SIZE);
    fullCiphertext.set(ciphertext);
    fullCiphertext.set(tag, ciphertext.byteLength);
    const decryptedData = await self.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sessionKey, fullCiphertext);
    
    if (verifyKeyJwk) {
      const vKey = await importKey(verifyKeyJwk, 'public', 'RSA-PSS') as CryptoKey;
      const isValid = await self.crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 64 }, vKey, signature, decryptedData);
      if (!isValid) throw new Error('Signature verification failed');
    }

    return { decryptedData, fileName: 'decrypted_file_v1' };
  } catch (e: any) {
    if (e.message === 'Signature verification failed') throw new CryptoError('Digital signature invalid.', 'SIGNATURE_FAILED');
    if (e instanceof CryptoError) throw e;
    throw new CryptoError('V1 Hybrid decryption failed.', 'HYBRID_DECRYPTION_FAILED');
  }
}

export async function exportKey(key: CryptoKey | { rsa: CryptoKey; ecdh: CryptoKey }): Promise<string> {
  if ('rsa' in key) {
    const rsaJwk = await self.crypto.subtle.exportKey('jwk', key.rsa);
    const ecdhJwk = await self.crypto.subtle.exportKey('jwk', key.ecdh);
    return JSON.stringify({ rsa: rsaJwk, ecdh: ecdhJwk });
  }
  const jwk = await self.crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

export async function importKey(jwkString: string, type: 'public' | 'private', algo: 'RSA-OAEP' | 'RSA-PSS' | 'ECDH'): Promise<CryptoKey | { rsa: CryptoKey; ecdh: CryptoKey }> {
  if (!jwkString) throw new CryptoError('Key is empty.', 'INVALID_KEY');
  try {
    const data = JSON.parse(jwkString.trim());
    
    if (data.rsa && data.ecdh) {
      const rsaKey = await self.crypto.subtle.importKey(
        'jwk',
        data.rsa,
        { name: 'RSA-OAEP', hash: 'SHA-512' },
        true,
        type === 'public' ? ['encrypt'] : ['decrypt']
      );
      const ecdhKey = await self.crypto.subtle.importKey(
        'jwk',
        data.ecdh,
        { name: 'ECDH', namedCurve: 'P-521' },
        true,
        type === 'public' ? [] : ['deriveKey', 'deriveBits']
      );
      return { rsa: rsaKey, ecdh: ecdhKey };
    }

    return await self.crypto.subtle.importKey(
      'jwk',
      data,
      { name: algo === 'ECDH' ? 'ECDH' : (algo as any), hash: algo === 'ECDH' ? undefined : 'SHA-512', namedCurve: algo === 'ECDH' ? 'P-521' : undefined } as any,
      true,
      type === 'public' 
        ? (algo === 'RSA-OAEP' ? ['encrypt'] : algo === 'RSA-PSS' ? ['verify'] : []) 
        : (algo === 'RSA-OAEP' ? ['decrypt'] : algo === 'RSA-PSS' ? ['sign'] : ['deriveKey', 'deriveBits'])
    );
  } catch (e) {
    throw new CryptoError(`Failed to import ${type} key.`, 'KEY_IMPORT_FAILED');
  }
}
