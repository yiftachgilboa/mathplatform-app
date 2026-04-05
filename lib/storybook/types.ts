export interface StoryBook {
  id: string
  title: string
  topic: string
  grade: number
  difficulty: 1 | 2 | 3
  cover_image: string | null
  is_visible: boolean
}

export interface StoryPage {
  id: string
  book_id: string
  page_number: number
  text: string
  words: string[]
  image_url: string | null
  emoji: string | null
}

export interface StoryWithPages extends StoryBook {
  pages: StoryPage[]
}
