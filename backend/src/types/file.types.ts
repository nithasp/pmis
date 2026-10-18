export interface StoredFile {
  id: number;
  fileName: string;
  storageKey: string;
  storageDriver: string;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  fileType: string | null;
  uploadedBy: number | null;
  createdAt: Date;
}

export interface UploadedObject {
  key: string;
  url: string | null;
}

export interface StorageDriver {
  readonly name: string;
  upload(key: string, body: Buffer, mimeType: string): Promise<UploadedObject>;
  remove(key: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  publicUrl(key: string, storedUrl: string | null): Promise<string>;
}
