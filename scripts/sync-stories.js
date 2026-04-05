const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const CONTENT_DIR = path.resolve(__dirname, '..', 'content', 'stories')

async function syncStory(storyDir) {
  const storyPath = path.join(CONTENT_DIR, storyDir, 'story.json')
  if (!fs.existsSync(storyPath)) return

  const story = JSON.parse(fs.readFileSync(storyPath, 'utf8'))
  console.log(`\n📖 מסנכרן: ${story.title} (${story.id})`)

  // 1. העלה תמונות ועדכן image_url
  for (const page of story.pages) {
    const imgFile = path.resolve(CONTENT_DIR, storyDir, `${page.page}.jpg`)
    console.log(`  🔍 מחפש תמונה: ${imgFile}`)
    if (fs.existsSync(imgFile)) {
      const imgBuffer = fs.readFileSync(imgFile)
      const storagePath = `${story.id}/${page.page}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(storagePath, imgBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        console.error(`  ❌ תמונה ${page.page}:`, uploadError.message)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(storagePath)
        page.image_url = publicUrl
        console.log(`  ✅ תמונה ${page.page} הועלתה`)
      }
    } else {
      page.image_url = null
      console.log(`  ⚠️  תמונה ${page.page} לא נמצאה — ישתמש באמוג'י`)
    }
  }

  // 2. upsert story_books
  const { error: bookError } = await supabase.from('story_books').upsert({
    id: story.id,
    title: story.title,
    topic: story.topic,
    grade: story.grade,
    difficulty: story.difficulty,
    is_visible: true,
  })
  if (bookError) { console.error('  ❌ story_books:', bookError.message); return }
  console.log(`  ✅ story_books עודכן`)

  // 3. upsert story_pages
  const pages = story.pages.map(p => ({
    book_id: story.id,
    page_number: p.page,
    text: p.text,
    words: p.words,
    emoji: p.emoji ?? null,
    image_url: p.image_url ?? null,
  }))

  const { error: pagesError } = await supabase.from('story_pages').upsert(pages, { onConflict: 'book_id,page_number' })
  if (pagesError) { console.error('  ❌ story_pages:', pagesError.message); return }
  console.log(`  ✅ ${pages.length} עמודים עודכנו`)
}

async function main() {
  console.log('🔄 מתחיל סנכרון סיפורים...')
  const dirs = fs.readdirSync(CONTENT_DIR).filter(f =>
    fs.statSync(path.join(CONTENT_DIR, f)).isDirectory()
  )
  console.log(`נמצאו ${dirs.length} סיפורים`)
  for (const dir of dirs) await syncStory(dir)
  console.log('\n✅ סנכרון הושלם!')
}

main()
