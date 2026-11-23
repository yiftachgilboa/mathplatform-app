import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import './course.css'

// Rubik: עברי מודרני, פינות מעט מעוגלות, דק וקריא גם בקטן. שני משקלים בלבד:
// 400 לטקסט, 500 לכותרות ולכפתורים (בלי משקלים כבדים יותר).
const rubik = Rubik({
  variable: '--font-main',
  subsets: ['latin', 'hebrew'],
})

export const metadata: Metadata = { title: 'kidodo' }

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return <div className={`course ${rubik.variable}`}>{children}</div>
}
