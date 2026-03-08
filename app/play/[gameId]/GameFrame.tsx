'use client'

export default function GameFrame({ url, title }: { url: string; title: string }) {
  return (
    <iframe
      src={url}
      title={title}
      className="flex-1 w-full border-none"
      allow="fullscreen"
    />
  )
}
