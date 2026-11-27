// משחקי הקורס במתיקה: /games/kidodo-<name>?childId=… ← העמוד עצמו במסך מלא (לא בתוך iframe),
// במצב מתיקה (gameId בכתובת): התוצאה נשמרת ב-progress, מטבעות כמו במשחק רגיל, ו״המשך״/יציאה חוזרים ללוח הילד.
// משחקים עם תיקייה משלהם ב-app/games/ קודמים לנתיב הזה.
import { notFound, redirect } from 'next/navigation'
import { coursePlatformGame } from '@/lib/course/platformGames'

export default async function CourseGameOnPlatform({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>
  searchParams: Promise<{ childId?: string }>
}) {
  const { gameId } = await params
  const { childId } = await searchParams
  const game = coursePlatformGame(gameId)
  if (!game) notFound()
  const q = new URLSearchParams({ gameId: game.id })
  if (childId) q.set('childId', childId)
  redirect(`${game.page}?${q}`)
}
