import { createClient } from '@supabase/supabase-js'
import { StoryBook, StoryPage, StoryWithPages } from './types'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// שליפת כל הסיפורים לפי נושא
export async function fetchStoriesByTopic(topic: string): Promise<StoryBook[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('story_books')
    .select('*')
    .eq('topic', topic)
    .eq('is_visible', true)
    .order('difficulty')
  if (error) throw error
  return data as StoryBook[]
}

// שליפת סיפור אחד עם כל העמודים
export async function fetchStoryWithPages(bookId: string): Promise<StoryWithPages> {
  const supabase = getClient()
  const { data: book, error: e1 } = await supabase
    .from('story_books')
    .select('*')
    .eq('id', bookId)
    .single()
  if (e1) throw e1

  const { data: pages, error: e2 } = await supabase
    .from('story_pages')
    .select('*')
    .eq('book_id', bookId)
    .order('page_number')
  if (e2) throw e2

  return { ...book, pages: pages as StoryPage[] }
}
