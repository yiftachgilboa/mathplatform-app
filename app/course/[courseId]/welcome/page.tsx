import { redirect, notFound } from 'next/navigation'
import { getCourse } from '@/lib/course/content'
import { adminClient, currentUser, purchasedCourses, enrollments } from '@/lib/course/admin'
import WelcomeClient from './WelcomeClient'

/** כניסה ראשונה לקורס: בחירת ילד / שם → דמות → יוצאים לדרך */
export default async function WelcomePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const course = getCourse(courseId)
  if (!course) notFound()

  const user = await currentUser()
  if (!user) redirect(`/login?next=/course/${courseId}/welcome`)

  const [purchased, enrolled] = await Promise.all([purchasedCourses(user.id), enrollments(user.id)])
  const seats = purchased.filter(id => id === courseId).length
  const inCourse = enrolled.filter(e => e.course_id === courseId)
  if (seats === 0) redirect('/course/no-access')
  if (inCourse.length >= seats) redirect('/course')

  // ילדים קיימים שעוד לא רשומים לקורס הזה
  const { data: kids } = await adminClient().from('children').select('id, name').eq('parent_id', user.id).order('created_at')
  const taken = new Set(inCourse.map(e => e.child_id))
  const children = (kids ?? []).filter(k => !taken.has(k.id))

  return <WelcomeClient courseId={courseId} ui={course.ui} avatars={course.avatars} existing={children} />
}
