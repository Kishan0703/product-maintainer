import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET = process.env.S3_BUCKET || 'product-maintainer-packages';

export class StorageService {
    async uploadPackage(
        key: string,
        buffer: Buffer,
        contentType: string = 'application/zip'
    ): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });

        await s3Client.send(command);

        // Return public URL or generate signed URL
        const publicUrl = process.env.S3_PUBLIC_URL;
        if (publicUrl) {
            return `${publicUrl}/${key}`;
        }

        // Generate signed URL (expires in 7 days)
        const getCommand = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });

        return await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 });
    }

    async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });

        return await getSignedUrl(s3Client, command, { expiresIn });
    }
}
