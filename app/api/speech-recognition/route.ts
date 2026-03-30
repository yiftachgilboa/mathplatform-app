import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audio = formData.get('audio') as Blob
  const arrayBuffer = await audio.arrayBuffer()

  const response = await fetch(
    'https://api-inference.huggingface.co/models/ivrit-ai/whisper-large-v3-turbo-ct2',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
        'Content-Type': 'audio/webm',
      },
      body: arrayBuffer,
    }
  )

  if(!response.ok){
    const errorText = await response.text()
    console.error('HuggingFace error:', response.status, errorText)
    return NextResponse.json({ text: '' }, { status: 200 })
  }

  const result = await response.json()
  console.log('HuggingFace result:', result)
  return NextResponse.json({ text: result.text || '' })
}
