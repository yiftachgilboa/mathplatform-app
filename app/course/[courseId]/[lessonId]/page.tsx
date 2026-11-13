import { redirect, notFound } from 'next/navigation'
import { getCourse, avatarImg } from '@/lib/course/content'
import { currentUser, enrollments, purchasedCourses, loadCourseState } from '@/lib/course/admin'
import CourseClient from './CourseClient'

/** עמוד השיעור — Server: הרשאה + התקדמות. ה-UI ב-CourseClient. */
export default async function LessonPage({ params, searchParams }: {
  params: Promise<{ courseId: string; lessonId: string }>
  searchParams: Promise<{ child?: string; stage?: string }>
}) {
  const { courseId, lessonId } = await params
  const { child, stage } = await searchParams
  const course = getCourse(courseId)
  if (!course) notFound()
  const lessonIdx = course.lessons.findIndex(l => l.id === lessonId)
  if (lessonIdx === -1) notFound()

  const user = await currentUser()
  if (!user) redirect('/login?next=/course')

  const [purchased, enrolled] = await Promise.all([purchasedCourses(user.id), enrollments(user.id)])
  if (!purchased.includes(courseId)) redirect('/course/no-access')
  const mine = enrolled.filter(e => e.course_id === courseId)
  const enr = mine.find(e => e.child_id === child) ?? mine[0]
  if (!enr) redirect('/course')

  const state = await loadCourseState(enr.child_id, courseId, course)
  const stageNum = Number(stage)

  return (
    <CourseClient
      course={course}
      childId={enr.child_id}
      childName={enr.children?.name ?? ''}
      avatar={avatarImg(course, enr.avatar)}
      initialLesson={lessonIdx}
      initialStage={stageNum >= 1 && stageNum <= 5 ? stageNum : null}
      initialState={state}
    />
  )
}
