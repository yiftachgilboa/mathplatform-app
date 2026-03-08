'use client'

export default function Error() {
  return (
    <div className="h-screen flex flex-col bg-black items-center justify-center">
      <p className="text-gray-400 mb-4">לא ניתן לטעון את המשחק.</p>
      <a href="/dashboard" className="text-blue-400 hover:underline text-sm">חזרה לדשבורד</a>
    </div>
  )
}
