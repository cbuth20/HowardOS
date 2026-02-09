import { Skeleton } from './Skeleton'

interface PageSkeletonProps {
  hasTopbar?: boolean
  hasFilters?: boolean
  variant?: 'list' | 'table' | 'cards'
}

export function PageSkeleton({
  hasTopbar = true,
  hasFilters = false,
  variant = 'list',
}: PageSkeletonProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Topbar */}
      {hasTopbar && (
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-border shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-7 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Filters */}
        {hasFilters && (
          <div className="mb-6">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        )}

        {/* Content based on variant */}
        {variant === 'list' && <ListSkeleton />}
        {variant === 'table' && <TableSkeleton />}
        {variant === 'cards' && <CardsSkeleton />}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 border border-neutral-border rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="border border-neutral-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-neutral-100 border-b border-neutral-border">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      {/* Rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-neutral-border last:border-b-0">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-10 w-1/4" />
        </div>
      ))}
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-6 border border-neutral-border rounded-lg">
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
