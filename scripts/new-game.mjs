// יצירת משחק חדש מהשלד templates/game-template
//
// שימוש:
//   node scripts/new-game.mjs create --id math-decimals-001 --title "שברים עשרוניים" --grade 5 --topic decimals --emoji 🔟 [--subject math] [--difficulty 2]
//   node scripts/new-game.mjs publish math-decimals-001     ← מציג את המשחק לילדים (is_visible = true)
//
// מה create עושה:
//   1. מעתיק את השלד ל-app/games/<id>/ ומחליף את ה-placeholders
//   2. יוצר שתי תמונות ממלא-מקום (לא דורס קובץ קיים):
//        public/art/games/<id>-game-bg.jpg    ← רקע בתוך המשחק
//        public/art/games/<id>-dashboard.jpg  ← תמונת המסך הראשי כשהמשחק נבחר (games.bg_image)
//   3. מוסיף/מעדכן שורה בטבלת games ב-Supabase (is_visible = false עד publish)
//   4. מוסיף שורה ל-docs/GAMES_CATALOG.md

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
const TEMPLATE = path.join(ROOT, 'templates', 'game-template')
const ART = path.join(ROOT, 'public', 'art', 'games')

function fail(msg) { console.error('✗ ' + msg); process.exit(1) }

function loadEnv() {
  const env = {}
  const file = path.join(ROOT, '.env.local')
  if (!fs.existsSync(file)) fail('.env.local not found — run from mathplatform-app root')
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) fail('missing Supabase keys in .env.local')
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1], i++
  }
  return out
}

async function placeholder(file, label, sub, color) {
  if (fs.existsSync(file)) { console.log(`• exists, kept: ${path.relative(ROOT, file)}`); return }
  const svg = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/>
    <rect x="40" y="40" width="1840" height="1000" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="6" stroke-dasharray="30 20"/>
    <text x="960" y="500" font-family="Arial" font-size="90" fill="#fff" text-anchor="middle">${label}</text>
    <text x="960" y="620" font-family="Arial" font-size="56" fill="#fff" fill-opacity=".8" text-anchor="middle">${sub}</text>
    <text x="960" y="720" font-family="Arial" font-size="40" fill="#fff" fill-opacity=".6" text-anchor="middle">1920 × 1080 · replace this file, keep the name</text>
  </svg>`
  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(file)
  console.log(`✓ placeholder: ${path.relative(ROOT, file)}`)
}

function addToCatalog(id, title, grade, difficulty) {
  const file = path.join(ROOT, 'docs', 'GAMES_CATALOG.md')
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  if (lines.some(l => l.startsWith(`| ${id} |`))) { console.log('• catalog row exists'); return }
  // סוף הטבלה הראשונה
  const start = lines.findIndex(l => l.startsWith('| id |'))
  let end = start
  while (end + 1 < lines.length && lines[end + 1].startsWith('|')) end++
  lines.splice(end + 1, 0, `| ${id} | ${title} | ${grade} | ${difficulty} |`)
  fs.writeFileSync(file, lines.join('\n'))
  console.log('✓ added to docs/GAMES_CATALOG.md')
}

async function create(a) {
  for (const k of ['id', 'title', 'grade', 'topic', 'emoji']) if (!a[k]) fail(`missing --${k}`)
  if (!/^[a-z]+(-[a-z0-9]+)*-\d{3}$/.test(a.id)) fail('id must look like math-decimals-001')
  const dest = path.join(ROOT, 'app', 'games', a.id)
  if (fs.existsSync(dest)) fail(`app/games/${a.id} already exists`)
  const subject = a.subject || a.id.split('-')[0]
  const difficulty = Number(a.difficulty || 2)
  const grade = Number(a.grade)

  // 1. קוד
  fs.mkdirSync(path.join(dest, 'assets'), { recursive: true })
  for (const f of fs.readdirSync(TEMPLATE)) {
    const txt = fs.readFileSync(path.join(TEMPLATE, f), 'utf8')
      .replaceAll('__GAME_ID__', a.id)
      .replaceAll('__GAME_TITLE__', a.title.replace(/'/g, "\\'"))
    fs.writeFileSync(path.join(dest, f), txt)
  }
  console.log(`✓ code: app/games/${a.id}/`)

  // 2. תמונות
  await placeholder(path.join(ART, `${a.id}-game-bg.jpg`), 'IN-GAME BACKGROUND', a.id, '#3d5a80')
  await placeholder(path.join(ART, `${a.id}-dashboard.jpg`), 'DASHBOARD IMAGE', a.id, '#6a4c93')

  // 3. Supabase
  const s = loadEnv()
  const { error } = await s.from('games').upsert({
    id: a.id, title: a.title, subject, topic: a.topic, grade, difficulty,
    type: 'game', duration_minutes: 10, language: 'he', tier: 'free', sdk_version: '1.0',
    platforms: { mobile: true, tablet: true, desktop: true }, orientation: 'both',
    thumbnail: a.emoji, url: `/games/${a.id}`, bg_image: `${a.id}-dashboard.jpg`, is_visible: false,
  }, { onConflict: 'id' })
  if (error) fail('Supabase: ' + error.message)
  console.log('✓ Supabase games row (is_visible = false)')

  // 4. קטלוג
  addToCatalog(a.id, a.title, grade, difficulty)

  console.log(`\nNext: write the game in app/games/${a.id}/GameClient.tsx, then: node scripts/new-game.mjs publish ${a.id}`)
}

async function publish(id) {
  if (!id) fail('usage: publish <game-id>')
  const s = loadEnv()
  const { data, error } = await s.from('games').update({ is_visible: true }).eq('id', id).select('id')
  if (error) fail('Supabase: ' + error.message)
  if (!data?.length) fail(`no games row with id ${id}`)
  console.log(`✓ ${id} is visible`)
}

const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'create') await create(parseArgs(rest))
else if (cmd === 'publish') await publish(rest[0])
else fail('usage: node scripts/new-game.mjs create --id ... | publish <id>')
