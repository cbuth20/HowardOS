import { LoadingSpinner } from '@/components/ui/howard-loading'

export default function UsersLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
