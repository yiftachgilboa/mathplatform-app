import type { Theme } from './types'

export const defaultTheme: Theme = {
  meta: { id: 'default', name: 'ברירת מחדל' },
  colors: {
    bgBase:         '#0A1810',
    bgGradientFrom: '#1F4A38',
    bgGradientMid:  '#152E24',
    bgGradientTo:   '#0E1F19',
    cardBg:         'rgba(28,62,46,0.9)',
    cardBorder:     'rgba(255,255,255,0.09)',
    accent:         '#7CFF9F',
    accentGlow:     'rgba(124,255,159,0.7)',
    accentDim:      'rgba(124,255,159,0.45)',
    textPrimary:    '#FFFFFF',
    textMuted:      'rgba(255,255,255,0.38)',
    textFaint:      'rgba(255,255,255,0.2)',
    starColor:      '#FFFFFF',
  },
  fonts: {
    primary:   'Secular One',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Secular+One&display=swap',
  },
  currency: {
    symbol: '⭐',
    name:   'כוכבים',
  },
  borderRadius: {
    card:   '32px',
    button: '16px',
    input:  '14px',
    pill:   '50px',
  },
}
