/**
 * Client for interacting with the Crypto Web Worker
 */

export interface WorkerResponse {
  type: 'SUCCESS' | 'PROGRESS' | 'ERROR';
  payload: any;
  id: string;
}

class CryptoWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, {
    resolve: (val: any) => void;
    reject: (err: any) => void;
    onProgress?: (p: number) => void;
  }> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(new URL('./crypto.worker.ts', import.meta.url), {
        type: 'module'
      });

      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        try {
          const { type, payload, id } = e.data;
          const request = this.pendingRequests.get(id);

          if (!request) return;

          if (type === 'PROGRESS') {
            request.onProgress?.(payload);
          } else if (type === 'SUCCESS') {
            request.resolve(payload);
            this.pendingRequests.delete(id);
          } else if (type === 'ERROR') {
            request.reject(payload);
            this.pendingRequests.delete(id);
          }
        } catch (err) {
          console.error('Error handling worker message:', err);
        }
      };

      this.worker.onerror = (e) => {
        console.error('Worker error:', e);
        // Reject all pending requests
        for (const [id, request] of this.pendingRequests) {
          request.reject(new Error('Worker crashed or failed to load.'));
          this.pendingRequests.delete(id);
        }
      };
    }
  }

  private async sendRequest(type: string, payload: any, onProgress?: (p: number) => void): Promise<any> {
    if (!this.worker) throw new Error('Worker not initialized');

    const id = Math.random().toString(36).substring(7);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Operation timed out. The file might be too large for your browser to process.'));
      }, 1000 * 60 * 15); // 15 minute timeout

      this.pendingRequests.set(id, { 
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val);
        }, 
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }, 
        onProgress 
      });
      
      if (!this.worker) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(new Error('Worker not initialized. Please refresh the page.'));
        return;
      }

      try {
        this.worker.postMessage({ type, payload, id });
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  async encryptSymmetric(file: File, password: string, settings: any, onProgress?: (p: number) => void): Promise<Blob> {
    return this.sendRequest('ENCRYPT_SYMMETRIC', { file, password, settings }, onProgress);
  }

  async decryptSymmetric(file: File, password: string, settings: any, onProgress?: (p: number) => void): Promise<{ blob: Blob; fileName: string }> {
    return this.sendRequest('DECRYPT_SYMMETRIC', { file, password, settings }, onProgress);
  }

  async encryptTurbo(file: File, password: string, onProgress?: (p: number) => void): Promise<Blob> {
    return this.sendRequest('ENCRYPT_TURBO', { file, password }, onProgress);
  }

  async decryptTurbo(file: File, password: string, onProgress?: (p: number) => void): Promise<{ blob: Blob; fileName: string }> {
    return this.sendRequest('DECRYPT_TURBO', { file, password }, onProgress);
  }

  async encryptHybrid(file: File, publicKeyJwk: string, signingKeyJwk?: string, onProgress?: (p: number) => void): Promise<Blob> {
    return this.sendRequest('ENCRYPT_HYBRID', { file, publicKeyJwk, signingKeyJwk }, onProgress);
  }

  async decryptHybrid(file: File, privateKeyJwk: string, verifyKeyJwk?: string, onProgress?: (p: number) => void): Promise<{ decryptedData: ArrayBuffer; fileName: string }> {
    return this.sendRequest('DECRYPT_HYBRID', { file, privateKeyJwk, verifyKeyJwk }, onProgress);
  }
}

export const cryptoWorker = new CryptoWorkerClient();
