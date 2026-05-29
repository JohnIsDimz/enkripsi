import { encryptFile, decryptFile, encryptFileTurbo, decryptFileTurbo } from './crypto';
import { encryptHybrid, decryptHybrid, importKey } from './hybrid-crypto';

/**
 * Web Worker for Cryptographic Operations
 */

self.onmessage = async (e: MessageEvent) => {
  let id: string | undefined;
  try {
    const data = e.data || {};
    id = data.id;
    const { type, payload } = data;

    switch (type) {
      case 'ENCRYPT_SYMMETRIC': {
        const { file, password, settings } = payload;
        const resultBlob = await encryptFile(file, password, settings, (progress) => {
          self.postMessage({ type: 'PROGRESS', payload: progress, id });
        });
        self.postMessage({ type: 'SUCCESS', payload: resultBlob, id });
        break;
      }

      case 'DECRYPT_SYMMETRIC': {
        const { file, password, settings } = payload;
        const { blob, fileName } = await decryptFile(file, password, settings, (progress) => {
          self.postMessage({ type: 'PROGRESS', payload: progress, id });
        });
        self.postMessage({ type: 'SUCCESS', payload: { blob, fileName }, id });
        break;
      }

      case 'ENCRYPT_TURBO': {
        const { file, password } = payload;
        const resultBlob = await encryptFileTurbo(file, password, (progress) => {
          self.postMessage({ type: 'PROGRESS', payload: progress, id });
        });
        self.postMessage({ type: 'SUCCESS', payload: resultBlob, id });
        break;
      }

      case 'DECRYPT_TURBO': {
        const { file, password } = payload;
        const packageData = await file.arrayBuffer();
        const { blob, fileName } = await decryptFileTurbo(new Uint8Array(packageData), password, (progress) => {
          self.postMessage({ type: 'PROGRESS', payload: progress, id });
        });
        self.postMessage({ type: 'SUCCESS', payload: { blob, fileName }, id });
        break;
      }

      case 'ENCRYPT_HYBRID': {
        const { file, publicKeyJwk, signingKeyJwk } = payload;
        const resultBlob = await encryptHybrid(file, publicKeyJwk, signingKeyJwk, (progress) => {
          self.postMessage({ type: 'PROGRESS', payload: progress, id });
        });
        self.postMessage({ type: 'SUCCESS', payload: resultBlob, id });
        break;
      }

      case 'DECRYPT_HYBRID': {
        const { file, privateKeyJwk, verifyKeyJwk } = payload;
        const packageData = await file.arrayBuffer();
        const { decryptedData, fileName } = await decryptHybrid(packageData, privateKeyJwk, verifyKeyJwk, (progress) => {
          self.postMessage({ type: 'PROGRESS', payload: progress, id });
        });
        self.postMessage({ type: 'SUCCESS', payload: { decryptedData, fileName }, id });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error: any) {
    try {
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Unknown worker error');
      const errorCode = error?.code || 'UNKNOWN_ERROR';
      
      self.postMessage({ 
        type: 'ERROR', 
        payload: { 
          message: errorMessage, 
          code: errorCode 
        }, 
        id 
      });
    } catch (fallbackError) {
      self.postMessage({
        type: 'ERROR',
        payload: {
          message: 'A critical error occurred in the worker and could not be parsed.',
          code: 'CRITICAL_WORKER_ERROR'
        },
        id
      });
    }
  }
};
