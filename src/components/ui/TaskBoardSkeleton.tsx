import { Skeleton } from './Skeleton'

export function TaskBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Three columns: To Do, In Progress, Done */}
      {[1, 2, 3].map((col) => (
        <div key={col} className="space-y-4">
          {/* Column header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-border">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-8" />
          </div>
          {/* Task cards */}
          {[1, 2, 3].map((task) => (
            <div key={task} className="p-4 border border-neutral-border rounded-lg bg-white">
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-8 rounded-full" variant="circular" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
