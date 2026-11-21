// practices/<name>.html (source: React + JSX, compiled in the browser by Babel — easy to edit, opens on its own)
//   → public/practices/<name>.html (live: JSX compiled ahead of time, no Babel → fast on phones)
// Art: a source that loads the art library with <script src="../art/lowpoly.js"></script> gets the library
// inlined (minified) into the live file, so every game carries its own copy and needs no extra request.
// Run: npm run build-practices   (after every change in practices/ or art/lowpoly.js, then commit both files)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'practices')
const outDir = join(root, 'public', 'practices')
mkdirSync(outDir, { recursive: true })

const BABEL_TAG = /<script[^>]*@babel\/standalone[^>]*><\/script>\s*/
const JSX_BLOCK = /<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/
const ART_TAG = /<script\s+src="\.\.\/art\/lowpoly\.js"\s*><\/script>/

const art = transformSync(readFileSync(join(root, 'art', 'lowpoly.js'), 'utf8'), { loader: 'js', target: 'es2019', minify: true, legalComments: 'none' }).code
if (/<\/script/i.test(art)) throw new Error('art/lowpoly.js contains "</script" — it cannot be inlined')

for (const file of readdirSync(srcDir).filter(f => f.endsWith('.html'))) {
  let html = readFileSync(join(srcDir, file), 'utf8')
  const m = html.match(JSX_BLOCK)
  if (!m) { console.warn(`skip ${file}: no <script type="text/babel">`); continue }
  const { code } = transformSync(m[1], { loader: 'jsx', jsx: 'transform', target: 'es2019', minify: true, legalComments: 'none' })
  html = html.replace(BABEL_TAG, '').replace(JSX_BLOCK, () => `<script>${code}</script>`)
  const withArt = ART_TAG.test(html)
  if (withArt) html = html.replace(ART_TAG, () => `<script>/* art/lowpoly.js */${art}</script>`)
  html = html.replace(/<html([^>]*)>/, '<html$1>\n<!-- generated from practices/' + file + ' by scripts/build-practices.mjs — edit the source, not this file -->')
  writeFileSync(join(outDir, file), html)
  console.log(`built public/practices/${file} (${Math.round(html.length / 1024)}KB${withArt ? ', with art/lowpoly.js' : ''})`)
}
