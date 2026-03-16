import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const gamesDir = path.join(process.cwd(), 'app', 'games')

const gameDirs = fs.readdirSync(gamesDir).filter(name => {
  const jsonPath = path.join(gamesDir, name, 'game.json')
  return fs.existsSync(jsonPath)
})

console.log(`Found ${gameDirs.length} games: ${gameDirs.join(', ')}\n`)

const records = gameDirs.map(dir => {
  const jsonPath = path.join(gamesDir, dir, 'game.json')
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

  return {
    id: raw.id,
    title: raw.title,
    subject: raw.subject,
    topic: raw.topic,
    grade: raw.grade,
    difficulty: raw.difficulty,
    type: raw.type,
    duration_minutes: raw.duration_minutes,
    platforms: raw.platforms,
    orientation: raw.orientation,
    language: raw.language,
    tier: raw.tier,
    thumbnail: raw.thumbnail,
    sdk_version: raw.sdk_version,
    url: `/games/${raw.id}`,
  }
})

async function main() {
  // is_visible is intentionally excluded from records — new rows get DEFAULT true,
  // existing rows keep their current value (not included in the ON CONFLICT SET clause).
  const { data, error } = await supabase
    .from('games')
    .upsert(records, { onConflict: 'id' })
    .select('id, title')

  if (error) {
    console.error('Upsert failed:', error.message)
    process.exit(1)
  }

  console.log(`✓ Synced ${data?.length ?? 0} games:`)
  data?.forEach(g => console.log(`  - ${g.id}: ${g.title}`))
}

main()
