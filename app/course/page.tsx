import { redirect } from 'next/navigation'
import { getCourse, avatarImg } from '@/lib/course/content'
import { currentUser, purchasedCourses, enrollments, loadCourseState } from '@/lib/course/admin'
import { currentLessonIndex } from '@/lib/course/progress'
import MyCoursesClient, { type CourseCard } from './MyCoursesClient'

/** כתובת השיעור הנוכחי של ילד בקורס */
async function lessonHref(courseId: string, childId: string) {
  const course = getCourse(courseId)!
  const state = await loadCourseState(childId, courseId, course)
  const lesson = course.lessons[currentLessonIndex(course, state.mastered)]
  return `/course/${courseId}/${lesson.id}?child=${childId}`
}

export default async function CoursePage() {
  const user = await currentUser()
  if (!user) redirect('/login?next=/course')

  const [purchased, enrolled] = await Promise.all([purchasedCourses(user.id), enrollments(user.id)])
  if (purchased.length === 0) redirect('/course/no-access')

  // קורס שנקנה ועוד לא שויך לילד (רכישה = ילד אחד) → כניסה ראשונה
  const pending = purchased.find(id =>
    purchased.filter(p => p === id).length > enrolled.filter(e => e.course_id === id).length
  )
  if (pending) redirect(`/course/${pending}/welcome`)

  const active = enrolled.filter(e => getCourse(e.course_id) && purchased.includes(e.course_id))
  if (active.length === 0) redirect('/course/no-access')
  if (active.length === 1) redirect(await lessonHref(active[0].course_id, active[0].child_id))

  const cards: CourseCard[] = await Promise.all(active.map(async e => {
    const course = getCourse(e.course_id)!
    return {
      href: await lessonHref(e.course_id, e.child_id),
      childName: e.children?.name ?? '',
      courseTitle: course.courseTitle,
      avatar: avatarImg(course, e.avatar),
    }
  }))
  const ui = getCourse(active[0].course_id)!.ui
  return <MyCoursesClient title={ui.myCourses} cards={cards} />
}
