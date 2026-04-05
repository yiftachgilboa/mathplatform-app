const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function run() {
  const { error } = await supabase.from('games').upsert({
    id: 'language-reading-001',
    title: 'ספרון — קמץ',
    subject: 'language',
    topic: 'reading',
    grade: 1,
    difficulty: 1,
    type: 'game',
    duration_minutes: 5,
    platforms: { desktop: true, tablet: true, mobile: false },
    language: 'he',
    tier: 'free',
    thumbnail: '📖',
    is_visible: true,
  })

  if (error) { console.error(error.message); process.exit(1) }
  console.log('✅ משחק נוסף לטבלת games')
}

run()
