'use client'

import { useState } from 'react'
import { Search, Plus, MoreHorizontal, FolderIcon, FileIcon, ChevronRight, Upload, FolderPlus, Trash2, Download, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { FileUpload } from './FileUpload'
import { FileViewer } from './FileViewer'
import { CreateFolderModal } from './CreateFolderModal'
import { useChannelFiles, useDeleteChannelFolder, useDeleteFileChannel } from '@/lib/api/hooks'
import { authFetch } from '@/lib/utils/auth-fetch'
import toast from 'react-hot-toast'
import type { FileChannelWithDetails } from '@/types/entities'

interface ChannelContentViewProps {
  channelId: string
  channel?: FileChannelWithDetails
  isAdmin: boolean
  onChannelDeleted?: () => void
}

export function ChannelContentView({ channelId, channel, isAdmin, onChannelDeleted }: ChannelContentViewProps) {
  const [currentPath, setCurrentPath] = useState('/')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const [viewerFile, setViewerFile] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading, refetch } = useChannelFiles(channelId, currentPath)
  const deleteFolder = useDeleteChannelFolder()
  const deleteChannel = useDeleteFileChannel()

  const files = data?.files || []
  const folders = data?.folders || []
  const channelName = channel?.client_organization?.name || channel?.name || 'Channel'

  // Build breadcrumb segments from current path
  const pathSegments = currentPath === '/'
    ? []
    : currentPath.split('/').filter(Boolean).map((segment, index, arr) => ({
        name: segment,
        path: '/' + arr.slice(0, index + 1).join('/') + '/',
      }))

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath === '/'
      ? `/${folderName}/`
      : `${currentPath}${folderName}/`
    setCurrentPath(newPath)
  }

  const navigateToPath = (path: string) => {
    setCurrentPath(path)
  }

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await authFetch(`/api/files-download?id=${fileId}`)
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('File downloaded')
    } catch {
      toast.error('Failed to download file')
    }
  }

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return

    setDeletingId(fileId)
    try {
      const response = await authFetch(`/api/files?id=${fileId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      toast.success('File deleted')
      refetch()
    } catch {
      toast.error('Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Are you sure you want to delete "${folderName}" and all its contents?`)) return

    try {
      await deleteFolder.mutateAsync(folderId)
      refetch()
    } catch {
      // Error handled by mutation hook
    }
  }

  const handleUploadComplete = () => {
    setShowUploadModal(false)
    refetch()
  }

  const handleDeleteChannel = async () => {
    if (!confirm(`Are you sure you want to delete the "${channelName}" channel? This will permanently delete all files and folders within it.`)) return

    try {
      await deleteChannel.mutateAsync(channelId)
      onChannelDeleted?.()
    } catch {
      // Error handled by mutation hook
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-border px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{channelName}</h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              {/* + New dropdown (outline style to differentiate from top-bar primary button) */}
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setShowNewMenu(!showNewMenu)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  New
                </Button>
                {showNewMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-neutral-border z-20 py-1">
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-background-hover"
                        onClick={() => {
                          setShowNewMenu(false)
                          setShowUploadModal(true)
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        Upload File
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-background-hover"
                        onClick={() => {
                          setShowNewMenu(false)
                          setShowFolderModal(true)
                        }}
                      >
                        <FolderPlus className="w-4 h-4" />
                        New Folder
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Channel actions menu */}
              <div className="relative">
                <Button variant="ghost" size="sm" onClick={() => setShowChannelMenu(!showChannelMenu)}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                {showChannelMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowChannelMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-neutral-border z-20 py-1">
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-state-error hover:bg-state-error/5"
                        onClick={() => {
                          setShowChannelMenu(false)
                          handleDeleteChannel()
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Channel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex-shrink-0 bg-white px-6 py-2 border-b border-neutral-border">
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => navigateToPath('/')}
            className={`px-2 py-1 rounded-md transition-colors ${
              currentPath === '/'
                ? 'bg-brand-primary/10 text-brand-primary font-medium'
                : 'text-text-muted hover:text-text-primary hover:bg-background-hover'
            }`}
          >
            {channelName}&apos;s files
          </button>
          {pathSegments.map((segment) => (
            <span key={segment.path} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-text-muted" />
              <button
                onClick={() => navigateToPath(segment.path)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  currentPath === segment.path
                    ? 'bg-brand-primary/10 text-brand-primary font-medium'
                    : 'text-text-muted hover:text-text-primary hover:bg-background-hover'
                }`}
              >
                {segment.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileIcon className="w-12 h-12 text-text-muted mb-4" />
            <p className="text-text-muted mb-4">No files yet</p>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFolderModal(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </Button>
                <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-6">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_200px_180px_48px] gap-4 py-3 border-b border-neutral-border text-sm font-medium text-text-muted">
              <span>Name</span>
              <span>Creator</span>
              <span>Shared on</span>
              <span></span>
            </div>

            {/* Folders */}
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="grid grid-cols-[1fr_200px_180px_48px] gap-4 py-3 border-b border-neutral-border/50 items-center group hover:bg-background-hover transition-colors"
              >
                <button
                  className="flex items-center gap-3 text-left min-w-0"
                  onClick={() => navigateToFolder(folder.name)}
                >
                  <FolderIcon className="w-5 h-5 text-brand-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-text-primary truncate hover:text-brand-primary transition-colors">
                    {folder.name}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {folder.created_by_profile && (
                    <>
                      <Avatar
                        name={folder.created_by_profile.full_name || folder.created_by_profile.email}
                        email={folder.created_by_profile.email}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {folder.created_by_profile.full_name}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <span className="text-sm text-text-muted">
                  {format(new Date(folder.created_at), 'MMM d, yyyy')}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFolder(folder.id, folder.name)}
                      title="Delete folder"
                    >
                      <Trash2 className="w-4 h-4 text-state-error" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Files */}
            {files.map((file) => (
              <div
                key={file.id}
                className="grid grid-cols-[1fr_200px_180px_48px] gap-4 py-3 border-b border-neutral-border/50 items-center group hover:bg-background-hover transition-colors"
              >
                <button
                  className="flex items-center gap-3 text-left min-w-0"
                  onClick={() => setViewerFile(file)}
                >
                  <FileIcon className="w-5 h-5 text-brand-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-text-primary truncate hover:text-brand-primary transition-colors">
                    {file.name}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {file.uploaded_by_profile && (
                    <>
                      <Avatar
                        name={file.uploaded_by_profile.full_name || file.uploaded_by_profile.email}
                        email={file.uploaded_by_profile.email}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {file.uploaded_by_profile.full_name}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <span className="text-sm text-text-muted">
                  {format(new Date(file.created_at), 'MMM d, yyyy \'at\' hh:mm a')}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 hover:bg-background-hover rounded transition-colors"
                    onClick={() => handleDownload(file.id, file.name)}
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-text-muted" />
                  </button>
                  {isAdmin && (
                    <button
                      className="p-1 hover:bg-background-hover rounded transition-colors"
                      onClick={() => handleDeleteFile(file.id, file.name)}
                      disabled={deletingId === file.id}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-state-error" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Files"
        size="lg"
      >
        <FileUpload
          folderPath={currentPath}
          channelId={channelId}
          onUploadComplete={handleUploadComplete}
        />
      </Modal>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        channelId={channelId}
        parentPath={currentPath}
        onFolderCreated={() => refetch()}
      />

      {/* File Viewer */}
      {viewerFile && (
        <FileViewer
          isOpen={!!viewerFile}
          onClose={() => setViewerFile(null)}
          fileId={viewerFile.id}
          fileName={viewerFile.name}
          mimeType={viewerFile.mime_type}
          fileSize={viewerFile.size}
        />
      )}
    </div>
  )
}
