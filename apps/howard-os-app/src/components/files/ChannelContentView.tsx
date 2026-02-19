'use client'

import { useState } from 'react'
import { Search, Plus, MoreHorizontal, FolderIcon, FileIcon, ChevronRight, Upload, FolderPlus, Trash2, Download, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@howard/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@howard/ui/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@howard/ui/components/ui/dialog'
import { HowardAvatar } from '@howard/ui/components/ui/howard-avatar'
import { FileUpload } from './FileUpload'
import { FileViewer } from './FileViewer'
import { CreateFolderModal } from './CreateFolderModal'
import { useChannelFiles, useDeleteChannelFolder, useDeleteFileChannel } from '@howard/ui/lib/api/hooks'
import { ConfirmDialog } from '@howard/ui/components/ui/confirm-dialog'
import { authFetch } from '@howard/ui/lib/utils/auth-fetch'
import { toast } from 'sonner'
import type { FileChannelWithDetails } from '@howard/ui/types/entities'

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
  const [viewerFile, setViewerFile] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<{
    type: 'file' | 'folder' | 'channel'
    id: string
    name: string
  } | null>(null)

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

  const handleDeleteFile = (fileId: string, fileName: string) => {
    setConfirmState({ type: 'file', id: fileId, name: fileName })
  }

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    setConfirmState({ type: 'folder', id: folderId, name: folderName })
  }

  const handleUploadComplete = () => {
    setShowUploadModal(false)
    refetch()
  }

  const handleDeleteChannel = () => {
    setConfirmState({ type: 'channel', id: channelId, name: channelName })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="flex-shrink-0 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{channelName}</h2>
        <div className="flex items-center gap-2">
          {/* Upload button visible to everyone, folder/channel management admin-only */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              Upload
            </Button>
          </div>
          {isAdmin && (
            <>
              {/* Admin-only actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Manage
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowFolderModal(true)}>
                    <FolderPlus className="w-4 h-4" />
                    New Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Channel actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={handleDeleteChannel}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Channel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex-shrink-0 bg-card px-6 py-2 border-b border-border">
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => navigateToPath('/')}
            className={`px-2 py-1 rounded-md transition-colors ${
              currentPath === '/'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {channelName}&apos;s files
          </button>
          {pathSegments.map((segment) => (
            <span key={segment.path} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <button
                onClick={() => navigateToPath(segment.path)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  currentPath === segment.path
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No files yet</p>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFolderModal(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </Button>
                <Button size="sm" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-6">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_200px_180px_48px] gap-4 py-3 border-b border-border text-sm font-medium text-muted-foreground">
              <span>Name</span>
              <span>Creator</span>
              <span>Shared on</span>
              <span></span>
            </div>

            {/* Folders */}
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="grid grid-cols-[1fr_200px_180px_48px] gap-4 py-3 border-b border-border/50 items-center group hover:bg-secondary transition-colors"
              >
                <button
                  className="flex items-center gap-3 text-left min-w-0"
                  onClick={() => navigateToFolder(folder.name)}
                >
                  <FolderIcon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                    {folder.name}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {folder.created_by_profile && (
                    <>
                      <HowardAvatar
                        name={folder.created_by_profile.full_name || folder.created_by_profile.email}
                        email={folder.created_by_profile.email}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {folder.created_by_profile.full_name}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
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
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Files */}
            {files.map((file) => (
              <div
                key={file.id}
                className="grid grid-cols-[1fr_200px_180px_48px] gap-4 py-3 border-b border-border/50 items-center group hover:bg-secondary transition-colors"
              >
                <button
                  className="flex items-center gap-3 text-left min-w-0"
                  onClick={() => setViewerFile(file)}
                >
                  <FileIcon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                    {file.name}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {file.uploaded_by_profile && (
                    <>
                      <HowardAvatar
                        name={file.uploaded_by_profile.full_name || file.uploaded_by_profile.email}
                        email={file.uploaded_by_profile.email}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {file.uploaded_by_profile.full_name}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(file.created_at), 'MMM d, yyyy \'at\' hh:mm a')}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(file.id, file.name)}
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteFile(file.id, file.name)}
                      disabled={deletingId === file.id}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => { if (!open) setShowUploadModal(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Upload Files</DialogTitle></DialogHeader>
          <FileUpload
            folderPath={currentPath}
            channelId={channelId}
            onUploadComplete={handleUploadComplete}
          />
        </DialogContent>
      </Dialog>

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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => { if (!open) setConfirmState(null) }}
        title={
          confirmState?.type === 'file'
            ? 'Delete File'
            : confirmState?.type === 'folder'
              ? 'Delete Folder'
              : 'Delete Channel'
        }
        description={
          confirmState?.type === 'file'
            ? `Are you sure you want to delete "${confirmState.name}"?`
            : confirmState?.type === 'folder'
              ? `Are you sure you want to delete "${confirmState.name}" and all its contents?`
              : `Are you sure you want to delete the "${confirmState?.name}" channel? This will permanently delete all files and folders within it.`
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!confirmState) return
          const { type, id } = confirmState
          setConfirmState(null)

          if (type === 'file') {
            setDeletingId(id)
            try {
              const response = await authFetch(`/api/files?id=${id}`, { method: 'DELETE' })
              if (!response.ok) throw new Error('Delete failed')
              toast.success('File deleted')
              refetch()
            } catch {
              toast.error('Failed to delete file')
            } finally {
              setDeletingId(null)
            }
          } else if (type === 'folder') {
            try {
              await deleteFolder.mutateAsync(id)
              refetch()
            } catch {
              // Error handled by mutation hook
            }
          } else if (type === 'channel') {
            try {
              await deleteChannel.mutateAsync(id)
              onChannelDeleted?.()
            } catch {
              // Error handled by mutation hook
            }
          }
        }}
      />
    </div>
  )
}
