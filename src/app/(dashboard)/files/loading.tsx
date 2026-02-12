import { LoadingSpinner } from '@/components/ui/howard-loading'

export default function FilesLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
