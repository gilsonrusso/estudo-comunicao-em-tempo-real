import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { uploadToMinio, objectExistsInMinio } from '../../infra/minio.js';
import { parseLatexZip } from '../../utils/latex-zip-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório onde residem os pacotes oficiais (.zip) de seed
const SEEDS_DIR = path.resolve(__dirname, '../../../templates/seeds');
const CATALOG_PATH = path.join(SEEDS_DIR, 'catalog.json');

export interface TemplateCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  filesCount: number;
  hasCls: boolean;
}

/**
 * Retorna o catálogo oficial dos templates suportados
 */
export function getBuiltinCatalog(): TemplateCatalogEntry[] {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Arquivo de catálogo de templates não encontrado em ${CATALOG_PATH}`);
  }
  const raw = fs.readFileSync(CATALOG_PATH, 'utf-8');
  return JSON.parse(raw) as TemplateCatalogEntry[];
}

/**
 * Garante que todos os pacotes oficiais (.zip) estão provisionados no bucket do MinIO
 */
export async function seedBuiltinTemplates(): Promise<void> {
  const catalog = getBuiltinCatalog();
  console.log(`[MinIO Seeder] 📦 Verificando pacotes oficiais de templates no bucket MinIO...`);

  for (const tpl of catalog) {
    const minioKey = `templates/${tpl.id}/template.zip`;
    const zipPath = path.join(SEEDS_DIR, `${tpl.id}.zip`);

    if (!fs.existsSync(zipPath)) {
      console.error(`[MinIO Seeder] ❌ Pacote oficial ${zipPath} não encontrado no disco!`);
      continue;
    }

    const zipBuffer = fs.readFileSync(zipPath);
    const exists = await objectExistsInMinio(minioKey);

    if (!exists) {
      await uploadToMinio(minioKey, zipBuffer, 'application/zip');
      console.log(
        `[MinIO Seeder] ✅ Template oficial "${tpl.name}" (${tpl.id}.zip - ${(zipBuffer.length / 1024).toFixed(1)} KB) provisionado no bucket MinIO.`
      );
    } else {
      console.log(`[MinIO Seeder] 🔒 Template oficial "${tpl.name}" já presente no bucket MinIO.`);
    }

    // Provisiona também arquivos binários descompactados para acesso direto
    const parsed = parseLatexZip(zipBuffer);
    for (const file of parsed.files) {
      if (file.isBinary && file.buffer) {
        const assetKey = `templates/${tpl.id}/${file.path}`;
        const assetExists = await objectExistsInMinio(assetKey);
        if (!assetExists) {
          await uploadToMinio(assetKey, file.buffer, file.mimeType);
        }
      }
    }
  }
}
