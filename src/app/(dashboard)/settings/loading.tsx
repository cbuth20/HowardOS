import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function SettingsLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
