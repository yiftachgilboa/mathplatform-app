export default function Loading() {
  return (
    <div className="h-screen flex flex-col bg-black">
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900">
        <div className="h-4 w-12 bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 text-sm">טוען משחק...</p>
      </div>
    </div>
  )
}
