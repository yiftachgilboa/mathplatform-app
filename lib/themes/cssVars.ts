import type { Theme } from './types'

export function themeToCssVars(theme: Theme): Record<string, string> {
  return {
    '--color-bg-base':          theme.colors.bgBase,
    '--color-bg-gradient-from': theme.colors.bgGradientFrom,
    '--color-bg-gradient-mid':  theme.colors.bgGradientMid,
    '--color-bg-gradient-to':   theme.colors.bgGradientTo,
    '--color-card-bg':          theme.colors.cardBg,
    '--color-card-border':      theme.colors.cardBorder,
    '--color-accent':           theme.colors.accent,
    '--color-accent-glow':      theme.colors.accentGlow,
    '--color-accent-dim':       theme.colors.accentDim,
    '--color-text-primary':     theme.colors.textPrimary,
    '--color-text-muted':       theme.colors.textMuted,
    '--color-text-faint':       theme.colors.textFaint,
    '--color-star':             theme.colors.starColor,
    '--font-primary':           theme.fonts.primary,
    '--radius-card':            theme.borderRadius.card,
    '--radius-button':          theme.borderRadius.button,
    '--radius-input':           theme.borderRadius.input,
    '--radius-pill':            theme.borderRadius.pill,
  }
}
