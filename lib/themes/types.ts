export type Theme = {
  meta: {
    id: string
    name: string
  }
  colors: {
    bgBase: string
    bgGradientFrom: string
    bgGradientMid: string
    bgGradientTo: string
    cardBg: string
    cardBorder: string
    accent: string
    accentGlow: string
    accentDim: string
    textPrimary: string
    textMuted: string
    textFaint: string
    starColor: string
  }
  fonts: {
    primary: string
    googleUrl: string
  }
  currency: {
    symbol: string
    name: string
  }
  borderRadius: {
    card: string
    button: string
    input: string
    pill: string
  }
}
