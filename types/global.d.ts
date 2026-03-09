interface MathPlatformSDKType {
  init: (options: { childId: string }) => void
  emit: (event: string, data: Record<string, unknown>) => void
}

declare global {
  interface Window {
    MathPlatformSDK?: MathPlatformSDKType
  }
}

export {}
