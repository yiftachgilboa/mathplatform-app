import { defaultTheme } from './default'
import type { Theme } from './types'

export const themes: Record<string, Theme> = {
  default: defaultTheme,
}

export function getTheme(id: string): Theme {
  return themes[id] ?? defaultTheme
}

export { defaultTheme }
export type { Theme }
