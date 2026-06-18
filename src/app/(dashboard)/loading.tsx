export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex justify-between">
        <div className="h-7 w-40 rounded bg-gray-200" />
        <div className="h-8 w-64 rounded bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-gray-200 bg-white" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-56 rounded-xl border border-gray-200 bg-white" />
        <div className="h-56 rounded-xl border border-gray-200 bg-white" />
      </div>
      <div className="h-64 rounded-xl border border-gray-200 bg-white" />
    </div>
  );
}
