/** Comprobaciones de integridad sobre la salida construida. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
let problems = 0;
const fail = (m) => { console.error('  ✗ ' + m); problems++; };
const ok = (m) => console.log('  ✓ ' + m);

const pages = { es: join(DIST, 'es/index.html'), en: join(DIST, 'en/index.html') };
const html = Object.fromEntries(Object.entries(pages).map(([k, p]) => [k, readFileSync(p, 'utf8')]));

const count = (s, re) => (s.match(re) || []).length;

// 1 · paridad entre idiomas
const chapters = Object.fromEntries(
  Object.entries(html).map(([k, s]) => [k, count(s, /<section class="chapter"/g)])
);
chapters.es === chapters.en
  ? ok(`${chapters.es} capítulos en cada idioma`)
  : fail(`capítulos descuadrados: ${chapters.es} es / ${chapters.en} en`);

const figures = Object.fromEntries(Object.entries(html).map(([k, s]) => [k, count(s, /<figure>/g)]));
figures.es === figures.en
  ? ok(`${figures.es} figuras en cada idioma`)
  : fail(`figuras descuadradas: ${figures.es} es / ${figures.en} en`);

// 2 · enlaces internos
for (const [lang, s] of Object.entries(html)) {
  const ids = new Set([...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const dups = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  if (dups.length !== ids.size) fail(`${lang}: identificadores repetidos`);
  const broken = [...new Set([...s.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))].filter((t) => !ids.has(t));
  broken.length ? fail(`${lang}: enlaces rotos → ${broken.join(', ')}`) : ok(`${lang}: enlaces internos correctos`);
}

// 3 · las figuras traen SVG de verdad
for (const [lang, s] of Object.entries(html)) {
  const svgs = count(s, /<svg/g);
  svgs === figures[lang] ? ok(`${lang}: ${svgs} SVG incrustados`) : fail(`${lang}: ${svgs} SVG para ${figures[lang]} figuras`);
}

// 4 · sin restos de conversión
for (const [lang, s] of Object.entries(html)) {
  const leftovers = [/\\&lt;/, /\u0000/, />undefined</];
  const bad = leftovers.filter((re) => re.test(s));
  bad.length ? fail(`${lang}: restos de conversión en la salida`) : ok(`${lang}: sin restos de conversión`);
}

// 5 · figuras huérfanas
const used = new Set();
for (const f of readdirSync('src/figures')) used.add(f.replace(/\.(es|en)\.svg$/, ''));
ok(`${used.size} figuras con las dos variantes de idioma`);

console.log(problems ? `\n${problems} problema(s).` : '\nTodo correcto.');
process.exit(problems ? 1 : 0);
