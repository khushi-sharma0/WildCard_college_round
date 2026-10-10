export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="h-32 animate-pulse border border-stone-300 bg-white" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse border border-stone-300 bg-white" />
        ))}
      </div>
      <span className="sr-only">Loading workspace module...</span>
    </div>
  );
}
