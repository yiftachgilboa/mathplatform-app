'use client'
import { useEffect } from 'react'
import { themeToCssVars } from '@/lib/themes/cssVars'
import type { Theme } from '@/lib/themes/types'

export function ThemeProvider({
  theme,
  children,
}: {
  theme: Theme
  children: React.ReactNode
}) {
  useEffect(() => {
    const vars = themeToCssVars(theme)
    const root = document.documentElement
    Object.entries(vars).forEach(([key, val]) => {
      root.style.setProperty(key, val)
    })
    // טען את הפונט דינמית
    const linkId = 'theme-font'
    let link = document.getElementById(linkId) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = theme.fonts.googleUrl
  }, [theme])

  return <>{children}</>
}
