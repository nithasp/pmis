import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { StorageDriver, UploadedObject } from '../types/file.types';

const PRESIGN_TTL_SECONDS = 60 * 60;

// Cloudflare R2 speaks the S3 API: the only differences from AWS are the account-scoped endpoint
// and the fixed "auto" region. Fill R2_* in .env and set STORAGE_DRIVER=r2 to switch over.
export class R2Storage implements StorageDriver {
  readonly name = 'r2';
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly publicBase: string;

  constructor() {
    const { accountId, accessKeyId, secretAccessKey, bucket, keyPrefix, publicUrl } = config.storage.r2;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = bucket;
    this.prefix = keyPrefix;
    this.publicBase = publicUrl;
  }

  private objectKey(key: string): string {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  async upload(key: string, body: Buffer, mimeType: string): Promise<UploadedObject> {
    const objectKey = this.objectKey(key);
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, Body: body, ContentType: mimeType }),
    );
    return { key: objectKey, url: this.publicBase ? `${this.publicBase}/${objectKey}` : null };
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async download(key: string): Promise<Buffer> {
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await object.Body?.transformToByteArray();
    return Buffer.from(bytes ?? new Uint8Array());
  }

  async publicUrl(key: string, storedUrl: string | null): Promise<string> {
    if (storedUrl) return storedUrl;
    if (this.publicBase) return `${this.publicBase}/${key}`;
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: PRESIGN_TTL_SECONDS,
    });
  }
}
