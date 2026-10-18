import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { StorageDriver, UploadedObject } from '../types/file.types';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export class LocalStorage implements StorageDriver {
  readonly name = 'local';

  async upload(key: string, body: Buffer): Promise<UploadedObject> {
    const target = path.join(UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    return { key, url: this.urlFor(key) };
  }

  async remove(key: string): Promise<void> {
    await fs.rm(path.join(UPLOAD_DIR, key), { force: true });
  }

  download(key: string): Promise<Buffer> {
    return fs.readFile(path.join(UPLOAD_DIR, key));
  }

  async publicUrl(key: string): Promise<string> {
    return this.urlFor(key);
  }

  private urlFor(key: string): string {
    return `${config.publicUrl}/uploads/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
}
