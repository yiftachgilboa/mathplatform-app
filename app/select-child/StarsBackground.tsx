'use client'
import { useEffect, useState } from 'react'

type Star = { id: number; top: string; left: string; width: string; height: string; delay: string; dur: string }

export default function StarsBackground() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    setStars(Array.from({ length: 50 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${2 + Math.random() * 3}px`,
      height: `${2 + Math.random() * 3}px`,
      delay: `${Math.random() * 4}s`,
      dur: `${2 + Math.random() * 3}s`,
    })))
  }, [])

  return <>
    {stars.map(s => (
      <span key={s.id} className="sc-star" style={{
        top: s.top, left: s.left,
        width: s.width, height: s.height,
        ['--delay' as string]: s.delay,
        ['--dur' as string]: s.dur,
      }} />
    ))}
  </>
}
