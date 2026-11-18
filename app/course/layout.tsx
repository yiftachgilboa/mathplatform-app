import type { Metadata } from 'next'
import { Fredoka } from 'next/font/google'
import './course.css'

// גופן עגול (Fredoka, משקלים 300–700). משקלים 800/900 בקוד מוצגים כ-700.
const fredoka = Fredoka({
  variable: '--font-fredoka',
  subsets: ['latin', 'hebrew'],
})

export const metadata: Metadata = { title: 'kidodo' }

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return <div className={`course ${fredoka.variable}`}>{children}</div>
}
