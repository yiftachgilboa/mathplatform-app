import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-200 mb-4">404</h1>
        <p className="text-gray-500 mb-6">הדף לא נמצא.</p>
        <Link href="/dashboard" className="text-blue-500 hover:underline text-sm">
          חזרה לדשבורד
        </Link>
      </div>
    </div>
  )
}
