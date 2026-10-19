import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { TemplatesService } from './templates.service.js';
import { getBuiltinCatalog, seedBuiltinTemplates } from './templates.seeder.js';
import { initMinio, getFromMinio, objectExistsInMinio } from '../../infra/minio.js';

describe('TemplatesService com Pacotes Oficiais no MinIO', () => {
  let service: TemplatesService;

  before(async () => {
    await initMinio();
    await seedBuiltinTemplates();
    service = new TemplatesService();
  });

  test('deve carregar o catálogo oficial com os 4 templates reais', () => {
    const catalog = getBuiltinCatalog();
    assert.equal(catalog.length, 4);

    const ids = catalog.map((c) => c.id);
    assert.deepEqual(ids.sort(), ['acm', 'blank', 'ieee', 'sbc']);
  });

  test('todos os pacotes .zip oficiais devem existir no bucket do MinIO', async () => {
    const catalog = getBuiltinCatalog();
    for (const tpl of catalog) {
      const exists = await objectExistsInMinio(`templates/${tpl.id}/template.zip`);
      assert.equal(exists, true, `Pacote templates/${tpl.id}/template.zip deve existir no MinIO`);
    }
  });

  test('listTemplates deve retornar a listagem oficial sem mocks ou strings hardcoded', async () => {
    const templates = await service.listTemplates();
    assert.equal(templates.length, 4);

    const sbc = templates.find((t) => t.id === 'sbc');
    assert.ok(sbc);
    assert.equal(sbc.hasCls, true);
    assert.equal(sbc.filesCount, 5);

    const ieee = templates.find((t) => t.id === 'ieee');
    assert.ok(ieee);
    assert.equal(ieee.hasCls, true);
    assert.equal(ieee.filesCount, 3);

    const acm = templates.find((t) => t.id === 'acm');
    assert.ok(acm);
    assert.equal(acm.hasCls, true);
    assert.equal(acm.filesCount, 6);
  });

  test('getTemplateById("sbc") deve baixar do MinIO e extrair arquivos reais do pacote oficial', async () => {
    const detail = await service.getTemplateById('sbc');
    assert.ok(detail);
    assert.equal(detail.id, 'sbc');

    const mainTex = detail.files.find((f) => f.path === 'main.tex');
    assert.ok(mainTex);
    assert.equal(mainTex.isMain, true);
    assert.ok(mainTex.content?.includes('\\usepackage{sbc-template}'));

    const styFile = detail.files.find((f) => f.path === 'sbc-template.sty');
    assert.ok(styFile);
    assert.ok(styFile.content?.includes('\\ProvidesPackage{sbc-template}'));

    const bstFile = detail.files.find((f) => f.path === 'sbc.bst');
    assert.ok(bstFile);

    const fig = detail.files.find((f) => f.path === 'fig1.jpg');
    assert.ok(fig);
    assert.ok(fig.storageKey?.includes('templates/sbc/fig1.jpg'));
  });

  test('getTemplateById("ieee") deve conter a classe IEEEtran.cls oficial e bare_conf.tex', async () => {
    const detail = await service.getTemplateById('ieee');
    assert.ok(detail);

    const cls = detail.files.find((f) => f.path === 'IEEEtran.cls');
    assert.ok(cls);
    // Verifica que é a classe oficial da IEEE e não uma emulação
    assert.ok(cls.content?.includes('\\ProvidesClass{IEEEtran}'));
    assert.ok((cls.content?.length ?? 0) > 100000, 'IEEEtran.cls oficial deve ter tamanho completo');

    const mainTex = detail.files.find((f) => f.path === 'main.tex');
    assert.ok(mainTex);
    assert.ok(mainTex.content?.includes('\\documentclass[conference]{IEEEtran}'));
  });

  test('getTemplateById("acm") deve conter a classe acmart.cls oficial e sigconf.tex', async () => {
    const detail = await service.getTemplateById('acm');
    assert.ok(detail);

    const cls = detail.files.find((f) => f.path === 'acmart.cls');
    assert.ok(cls);
    assert.ok(cls.content?.includes('\\ProvidesClass{acmart}'));
    assert.ok((cls.content?.length ?? 0) > 50000, 'acmart.cls oficial deve ter tamanho completo');

    const mainTex = detail.files.find((f) => f.path === 'main.tex');
    assert.ok(mainTex);
    assert.ok(mainTex.content?.includes('\\documentclass[sigconf]{acmart}'));
  });

  test('getTemplateById("blank") deve conter main.tex com documento limpo', async () => {
    const detail = await service.getTemplateById('blank');
    assert.ok(detail);

    const mainTex = detail.files.find((f) => f.path === 'main.tex');
    assert.ok(mainTex);
    assert.ok(mainTex.content?.includes('\\documentclass[12pt,a4paper]{article}'));
  });

  test('createCustomTemplate deve empacotar em .zip e salvar no MinIO', async () => {
    const custom = await service.createCustomTemplate({
      name: 'Custom Journal',
      description: 'Template customizado para teste',
      category: 'custom',
      mainContent: '\\documentclass{article}\n\\begin{document}\nHello Custom\n\\end{document}',
      clsContent: '\\ProvidesClass{custom}[2026/01/01 Custom]\n\\LoadClass{article}',
      clsFileName: 'custom.cls',
    });

    assert.ok(custom.id.startsWith('tpl-'));
    assert.equal(custom.files.length, 2);

    // Verifica que o arquivo ZIP foi de fato gravado no MinIO
    const zipInMinio = await getFromMinio(`templates/${custom.id}/template.zip`);
    assert.ok(zipInMinio.buffer.length > 0);
  });
});
