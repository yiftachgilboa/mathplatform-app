import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import './course.css'

const heebo = Heebo({
  variable: '--font-heebo',
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = { title: 'kidodo' }

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return <div className={`course ${heebo.variable}`}>{children}</div>
}
