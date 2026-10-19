import * as Minio from 'minio';

const rawEndpoint = process.env.MINIO_ENDPOINT || 'http://127.0.0.1:9000';
const endpointUrl = new URL(rawEndpoint);

const MINIO_HOST = endpointUrl.hostname;
const MINIO_PORT =
  parseInt(endpointUrl.port, 10) || (endpointUrl.protocol === 'https:' ? 443 : 80);
const MINIO_USE_SSL = endpointUrl.protocol === 'https:';

const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin123';
export const MINIO_BUCKET = process.env.MINIO_BUCKET || 'collab-assets';

export const minioClient = new Minio.Client({
  endPoint: MINIO_HOST,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

/**
 * Inicializa a conexão com o MinIO e garante que o bucket de assets existe com leitura liberada
 */
export async function initMinio(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      console.log(`[MinIO] ⚠️ Bucket "${MINIO_BUCKET}" não encontrado. Criando bucket...`);
      await minioClient.makeBucket(MINIO_BUCKET);
      console.log(`[MinIO] ✅ Bucket "${MINIO_BUCKET}" criado com sucesso.`);
    } else {
      console.log(`[MinIO] 📦 Bucket "${MINIO_BUCKET}" já existe e está pronto.`);
    }

    // Configura política de leitura pública para o compilador TeX Live baixar figuras do bucket
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
        },
      ],
    };

    await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
    console.log(`[MinIO] 🔓 Política de leitura configurada para o bucket "${MINIO_BUCKET}".`);
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`[MinIO] Aviso durante inicialização do bucket "${MINIO_BUCKET}":`, error.message);
  }
}

/**
 * Faz upload de um arquivo/imagem diretamente para o bucket MinIO via SDK oficial
 */
export async function uploadToMinio(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await minioClient.putObject(MINIO_BUCKET, key, buffer, buffer.length, {
    'Content-Type': contentType,
  });
}

/**
 * Baixa um arquivo do bucket MinIO como Buffer via SDK oficial
 */
export async function getFromMinio(
  key: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const [stream, stat] = await Promise.all([
    minioClient.getObject(MINIO_BUCKET, key),
    minioClient.statObject(MINIO_BUCKET, key),
  ]);

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const contentType =
    (stat.metaData && (stat.metaData['content-type'] || stat.metaData['Content-Type'])) ||
    'application/octet-stream';

  return {
    buffer: Buffer.concat(chunks),
    contentType: String(contentType),
  };
}

/**
 * Remove um arquivo do bucket MinIO via SDK oficial
 */
export async function deleteFromMinio(key: string): Promise<void> {
  await minioClient.removeObject(MINIO_BUCKET, key);
}

/**
 * Verifica se um objeto/arquivo já existe no bucket MinIO
 */
export async function objectExistsInMinio(key: string): Promise<boolean> {
  try {
    await minioClient.statObject(MINIO_BUCKET, key);
    return true;
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
      return false;
    }
    return false;
  }
}


/**
 * Retorna a URL interna direta para o compilador baixar o asset do bucket MinIO
 */
export function getInternalMinioUrl(key: string): string {
  return `${rawEndpoint}/${MINIO_BUCKET}/${key}`;
}
