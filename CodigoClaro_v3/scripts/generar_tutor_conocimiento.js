'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_PATH = path.join(__dirname, 'temarios_contenido.json');
const CATALOG_PATH = path.join(ROOT, 'docs', 'catalogo_temas.json');
const OUTPUT_PATH = path.join(ROOT, 'public', 'tutor-conocimiento.js');

function normalizeKey(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function splitExample(value, fallbackLanguage) {
  const raw = String(value || '').replace(/\r\n?/g, '\n').trim();
  const tagged = raw.match(/^\[([a-z0-9+#.-]+)\]\s*\n/i);
  const language = tagged ? tagged[1].toLowerCase() : String(fallbackLanguage || '').toLowerCase();
  let example = tagged ? raw.slice(tagged[0].length) : raw;
  let context = '';
  const contextMatch = example.match(/\nContexto:\s*([\s\S]*)$/i);
  if (contextMatch) {
    context = contextMatch[1].trim();
    example = example.slice(0, contextMatch.index).trimEnd();
  }
  return { language, example, exampleContext: context };
}

function buildCorpus(source, catalog, publicDirectory = path.join(ROOT, 'public')) {
  if (!source || !Array.isArray(source.topics)) throw new Error('temarios_contenido.json debe incluir una lista topics.');
  if (!Array.isArray(catalog)) throw new Error('catalogo_temas.json debe ser una lista de temas.');
  if (source.topics.length !== 75) throw new Error(`Se esperaban 75 temas enriquecidos y hay ${source.topics.length}.`);

  const catalogByKey = new Map();
  for (const entry of catalog) {
    const key = `${normalizeKey(entry.track)}\u0000${normalizeKey(entry.title)}`;
    if (catalogByKey.has(key)) throw new Error(`Tema duplicado en el catálogo: ${entry.track} · ${entry.title}.`);
    catalogByKey.set(key, entry);
  }

  return source.topics.map((topic, index) => {
    for (const field of ['track', 'title', 'explanation', 'example', 'output']) {
      if (typeof topic[field] !== 'string' || !topic[field].trim()) {
        throw new Error(`Tema ${index + 1}: falta el campo obligatorio ${field}.`);
      }
    }
    if (!Array.isArray(topic.mistakes) || !topic.mistakes.length) throw new Error(`Tema ${topic.track} · ${topic.title}: faltan errores comunes.`);
    if (!topic.exercise || typeof topic.exercise.statement !== 'string' || !Array.isArray(topic.exercise.cases) || !topic.exercise.cases.length || typeof topic.exercise.solution !== 'string') {
      throw new Error(`Tema ${topic.track} · ${topic.title}: práctica incompleta.`);
    }
    if (!Array.isArray(topic.sources) || !topic.sources.length) throw new Error(`Tema ${topic.track} · ${topic.title}: faltan fuentes.`);

    const catalogEntry = catalogByKey.get(`${normalizeKey(topic.track)}\u0000${normalizeKey(topic.title)}`);
    if (!catalogEntry || !/^[a-z0-9_.-]+\.pdf$/i.test(catalogEntry.file || '')) {
      throw new Error(`No hay PDF asociado a ${topic.track} · ${topic.title}.`);
    }
    const pdfFile = path.join(publicDirectory, 'temarios', catalogEntry.file);
    if (!fs.existsSync(pdfFile)) throw new Error(`No existe el PDF del tema: ${pdfFile}`);

    const example = splitExample(topic.example, topic.track);
    const exercise = topic.exercise;
    const sources = topic.sources.map((sourceItem, sourceIndex) => {
      if (!sourceItem || typeof sourceItem.label !== 'string' || !sourceItem.label.trim()) {
        throw new Error(`Fuente ${sourceIndex + 1} incompleta en ${topic.track} · ${topic.title}.`);
      }
      let parsed;
      try { parsed = new URL(sourceItem.url); } catch { throw new Error(`URL de fuente no válida en ${topic.track} · ${topic.title}.`); }
      if (parsed.protocol !== 'https:') throw new Error(`La fuente debe usar HTTPS en ${topic.track} · ${topic.title}.`);
      return { label: sourceItem.label.trim(), url: parsed.href };
    });

    return {
      id: `${normalizeKey(topic.track).replace(/[^a-z0-9]+/g, '-')}-${String(index + 1).padStart(2, '0')}`,
      kind: 'rich',
      track: topic.track.trim(),
      title: topic.title.trim(),
      keywords: [topic.track.trim(), topic.title.trim()],
      explanation: topic.explanation.trim(),
      answer: topic.explanation.trim(),
      language: example.language,
      example: example.example,
      exampleContext: example.exampleContext,
      output: topic.output.trim(),
      mistakes: topic.mistakes.map(String),
      exercise: {
        statement: exercise.statement.trim(),
        cases: exercise.cases.map(testCase => ({ input: String(testCase.input), expected: String(testCase.expected) })),
        solution: exercise.solution.trim(),
        alternatives: Array.isArray(exercise.alternatives) ? exercise.alternatives.map(String) : []
      },
      sources,
      pdfPath: `/temarios/${encodeURIComponent(catalogEntry.file)}`
    };
  });
}

function renderCorpus(corpus) {
  const serialized = JSON.stringify(corpus);
  return `/* Generated from scripts/temarios_contenido.json and docs/catalogo_temas.json. Do not edit by hand. */\n(function(root){\n  const corpus = ${serialized};\n  if (typeof module === 'object' && module.exports) module.exports = corpus;\n  if (root) root.CC_TUTOR_KNOWLEDGE = corpus;\n})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));\n`;
}

function generate() {
  const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const corpus = buildCorpus(source, catalog);
  fs.writeFileSync(OUTPUT_PATH, renderCorpus(corpus), 'utf8');
  return { path: OUTPUT_PATH, count: corpus.length };
}

if (require.main === module) {
  try {
    const result = generate();
    process.stdout.write(`Generados ${result.count} temas de tutor local en ${result.path}\n`);
  } catch (error) {
    process.stderr.write(`${error.message || error}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildCorpus, renderCorpus, splitExample };
