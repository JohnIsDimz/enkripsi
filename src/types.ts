export interface BatchItem {
  id: string;
  file: File;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultBlob?: Blob;
  resultName?: string;
  signatureVerified?: boolean;
  error?: string;
}

export interface RecentOperation {
  id: string;
  fileName: string;
  fileSize: number;
  type: 'encrypt' | 'decrypt';
  timestamp: number;
  status: 'success' | 'failed';
  mode: 'symmetric' | 'hybrid' | 'turbo';
  algorithm: string;
  durationMs: number;
  error?: string;
}

