import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import { parseLatexZip } from './latex-zip-parser.js';

describe('latex-zip-parser', () => {
  it('deve extrair projeto LaTeX com main.tex, .cls e .bib', () => {
    const zip = new AdmZip();
    zip.addFile('main.tex', Buffer.from('\\documentclass{article}\n\\title{Artigo de Teste}\n\\begin{document}\nOlá Mundo\n\\end{document}'));
    zip.addFile('custom.cls', Buffer.from('% Custom class file'));
    zip.addFile('references.bib', Buffer.from('@article{test, title={Test}}'));
    zip.addFile('logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47])); // Fake PNG magic bytes

    const zipBuffer = zip.toBuffer();
    const result = parseLatexZip(zipBuffer);

    assert.equal(result.rootDoc.path, 'main.tex');
    assert.match(result.rootDoc.content, /\\documentclass\{article\}/);
    assert.equal(result.detectedTitle, 'Artigo de Teste');
    assert.equal(result.files.length, 3);

    const clsFile = result.files.find((f) => f.path === 'custom.cls');
    assert.ok(clsFile);
    assert.equal(clsFile.fileType, 'style');
    assert.equal(clsFile.isBinary, false);

    const imgFile = result.files.find((f) => f.path === 'logo.png');
    assert.ok(imgFile);
    assert.equal(imgFile.fileType, 'image');
    assert.equal(imgFile.isBinary, true);
  });

  it('deve detectar o documento raiz com nome diferente quando possui \\documentclass', () => {
    const zip = new AdmZip();
    zip.addFile('bare_jrnl.tex', Buffer.from('\\documentclass{IEEEtran}\n\\title{IEEE Paper}\n\\begin{document}\nIEEE\n\\end{document}'));
    zip.addFile('chapter1.tex', Buffer.from('\\section{Introdução}\nTexto do capítulo'));

    const zipBuffer = zip.toBuffer();
    const result = parseLatexZip(zipBuffer);

    assert.equal(result.rootDoc.path, 'bare_jrnl.tex');
    assert.equal(result.detectedTitle, 'IEEE Paper');
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].path, 'chapter1.tex');
  });

  it('deve lançar erro se o arquivo ZIP não contiver nenhum arquivo .tex', () => {
    const zip = new AdmZip();
    zip.addFile('readme.txt', Buffer.from('Apenas texto'));
    zip.addFile('style.css', Buffer.from('body { color: red; }'));

    const zipBuffer = zip.toBuffer();
    assert.throws(
      () => parseLatexZip(zipBuffer),
      /O pacote ZIP não contém nenhum documento LaTeX/
    );
  });

  it('deve ignorar arquivos de sistema como __MACOSX e .DS_Store', () => {
    const zip = new AdmZip();
    zip.addFile('__MACOSX/._main.tex', Buffer.from('junk'));
    zip.addFile('.DS_Store', Buffer.from('ds junk'));
    zip.addFile('paper.tex', Buffer.from('\\documentclass{article}\n\\title{Clean Paper}\n\\begin{document}\nOk\n\\end{document}'));

    const zipBuffer = zip.toBuffer();
    const result = parseLatexZip(zipBuffer);

    assert.equal(result.rootDoc.path, 'paper.tex');
    assert.equal(result.files.length, 0);
  });
});
