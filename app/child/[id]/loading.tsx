export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-center space-y-3">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mx-auto" />
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mx-auto" />
          <div className="h-8 w-24 bg-yellow-100 rounded animate-pulse mx-auto" />
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="grid gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5 flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
