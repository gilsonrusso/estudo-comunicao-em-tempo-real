import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://minio:9000';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minioadmin';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minioadmin123';
export const ASSETS_BUCKET = process.env.S3_BUCKET || 'collab-assets';

export const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true, // Obrigatório para MinIO S3 compatível
});

/**
 * Inicializa a conexão com o MinIO e garante que o bucket de assets existe com leitura liberada
 */
export async function initS3(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: ASSETS_BUCKET }));
    console.log(`[MinIO S3] 📦 Bucket "${ASSETS_BUCKET}" já existe e está pronto.`);
  } catch (err: unknown) {
    console.log(`[MinIO S3] ⚠️ Bucket "${ASSETS_BUCKET}" não encontrado. Criando bucket...`);
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: ASSETS_BUCKET }));
      console.log(`[MinIO S3] ✅ Bucket "${ASSETS_BUCKET}" criado com sucesso.`);
    } catch (createErr) {
      console.error(`[MinIO S3] ❌ Erro ao criar bucket "${ASSETS_BUCKET}":`, createErr);
    }
  }

  // Configura política de leitura pública para o compilador baixar imagens
  try {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${ASSETS_BUCKET}/*`],
        },
      ],
    };
    await s3Client.send(
      new PutBucketPolicyCommand({
        Bucket: ASSETS_BUCKET,
        Policy: JSON.stringify(policy),
      })
    );
    console.log(`[MinIO S3] 🔓 Política de leitura configurada para o bucket "${ASSETS_BUCKET}".`);
  } catch (policyErr) {
    console.warn(`[MinIO S3] Aviso ao aplicar política de leitura:`, policyErr);
  }
}

/**
 * Faz upload de um arquivo para o MinIO
 */
export async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: ASSETS_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

/**
 * Baixa um arquivo do MinIO como Buffer
 */
export async function getFromS3(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await s3Client.send(
    new GetObjectCommand({
      Bucket: ASSETS_BUCKET,
      Key: key,
    })
  );

  const stream = res.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: res.ContentType || 'application/octet-stream',
  };
}

/**
 * Remove um arquivo do MinIO
 */
export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: ASSETS_BUCKET,
      Key: key,
    })
  );
}

/**
 * Retorna a URL interna direta para o compilador baixar o asset do MinIO
 */
export function getInternalS3Url(key: string): string {
  return `${S3_ENDPOINT}/${ASSETS_BUCKET}/${key}`;
}
