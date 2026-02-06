'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FileUpload } from '@/components/files/FileUpload'
import { FileList } from '@/components/files/FileList'
import { createClient } from '@/lib/supabase/client'
import { useFiles } from '@/lib/api/hooks'

interface UserProfile {
  role: 'admin' | 'client'
  org_id: string
}

export default function FilesPage() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [view, setView] = useState<'all' | 'my-files'>('all')

  const supabase = createClient()

  // Use TanStack Query hook
  const { data, isLoading, refetch } = useFiles('/', profile?.role === 'admin' ? view : 'my-files')
  const files = data?.files || []

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('role, org_id')
        .eq('id', user.id)
        .single()
      setProfile(data)

      // Auto-set view based on role
      if (data?.role === 'client') {
        setView('my-files')
      }
    }
  }

  const handleUploadComplete = () => {
    setShowUploadModal(false)
    refetch()
  }

  const isAdmin = profile?.role === 'admin'
  const canDelete = isAdmin || view === 'my-files'

  return (
    <div className="flex-1 flex flex-col">
      {/* Sticky Topbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-border shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">
              {isAdmin ? 'Files' : 'My Files'}
            </h1>
            <p className="text-sm text-text-muted">
              {isAdmin
                ? 'Manage files for your organization'
                : 'View and download your files'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowUploadModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* View Toggle (Admin Only) */}
        {isAdmin && (
          <div className="mb-6 flex gap-2">
            <Button
              variant={view === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setView('all')}
            >
              All Files
            </Button>
            <Button
              variant={view === 'my-files' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setView('my-files')}
            >
              My Files
            </Button>
          </div>
        )}

        {/* Files List */}
        <div className="bg-background-card rounded-lg shadow-sm border border-neutral-border p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
              <p className="text-text-muted mt-4">Loading files...</p>
            </div>
          ) : (
            <FileList
              files={files}
              canDelete={canDelete}
              canShare={isAdmin}
              onRefresh={() => refetch()}
            />
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Files"
        size="lg"
      >
        <FileUpload
          folderPath="/"
          onUploadComplete={handleUploadComplete}
        />
      </Modal>
    </div>
  )
}
