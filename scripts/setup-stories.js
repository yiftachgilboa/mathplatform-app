const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function setup() {
  const { error: e2 } = await supabase.from('story_books').upsert({
    id: 'kamatz-story-001',
    title: 'הגנב והגמד',
    topic: 'kamatz',
    grade: 1,
    difficulty: 1,
  })
  if (e2) { console.error('story_books:', e2.message); process.exit(1) }
  console.log('✅ סיפור נוסף')

  const { error: e3 } = await supabase.from('story_pages').upsert([
    { book_id: 'kamatz-story-001', page_number: 1, text: 'גנב ראה גמד',    words: ['גנב','ראה','גמד'],      emoji: '🕵️' },
    { book_id: 'kamatz-story-001', page_number: 2, text: 'הגמד היה קטן',   words: ['הגמד','היה','קטן'],     emoji: '🧙‍♂️' },
    { book_id: 'kamatz-story-001', page_number: 3, text: 'הגמד אהב זהב',   words: ['הגמד','אהב','זהב'],     emoji: '💛' },
    { book_id: 'kamatz-story-001', page_number: 4, text: 'הגנב נגע בגמד',  words: ['הגנב','נגע','בגמד'],    emoji: '👆' },
    { book_id: 'kamatz-story-001', page_number: 5, text: 'הזהב נפל',       words: ['הזהב','נפל'],           emoji: '🪙' },
    { book_id: 'kamatz-story-001', page_number: 6, text: 'הגמד כעס',       words: ['הגמד','כעס'],           emoji: '😤' },
    { book_id: 'kamatz-story-001', page_number: 7, text: 'הגמד זרק ברק',   words: ['הגמד','זרק','ברק'],     emoji: '⚡' },
    { book_id: 'kamatz-story-001', page_number: 8, text: 'הגנב ברח',       words: ['הגנב','ברח'],           emoji: '🏃' },
  ])
  if (e3) { console.error('story_pages:', e3.message); process.exit(1) }
  console.log('✅ עמודים נוספו')

  console.log('✅ הכל מוכן!')
}

setup()
