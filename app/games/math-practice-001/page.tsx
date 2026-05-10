import { Suspense } from 'react'
import GameClient from './GameClient'
export default function Page() {
  return <Suspense><GameClient /></Suspense>
}
