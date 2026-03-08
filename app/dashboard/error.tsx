'use client'

export default function Error() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-500 mb-4">אירעה שגיאה בטעינת הדשבורד.</p>
        <a href="/dashboard" className="text-blue-500 hover:underline text-sm">נסה שוב</a>
      </div>
    </div>
  )
}
