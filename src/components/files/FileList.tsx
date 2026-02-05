'use client'

import { useState } from 'react'
import { FileIcon, Download, Trash2, Share2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { ShareFileModal } from './ShareFileModal'
import { Avatar } from '@/components/ui/Avatar'
import toast from 'react-hot-toast'

interface File {
  id: string
  name: string
  size: number
  mime_type: string
  folder_path: string
  uploaded_by: string
  created_at: string
  uploaded_by_profile: {
    full_name: string | null
    email: string
  }
}

interface FileListProps {
  files: File[]
  canDelete?: boolean
  canShare?: boolean
  onRefresh?: () => void
}

export function FileList({ files, canDelete = false, canShare = false, onRefresh }: FileListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    // You can expand this with different icons for different file types
    return <FileIcon className="w-5 h-5 text-brand-primary" />
  }

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/files/download?id=${fileId}`)

      if (!response.ok) {
        throw new Error('Download failed')
      }

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
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download file')
    }
  }

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return
    }

    setDeletingId(fileId)

    try {
      const response = await fetch(`/api/files?id=${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Delete failed')
      }

      toast.success('File deleted')
      onRefresh?.()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileIcon className="w-12 h-12 mx-auto text-text-muted mb-4" />
        <p className="text-text-muted">No files yet</p>
      </div>
    )
  }

  return (
    <>
      {/* Share Modal */}
      {selectedFile && (
        <ShareFileModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false)
            setSelectedFile(null)
          }}
          fileId={selectedFile.id}
          fileName={selectedFile.name}
          onShareComplete={() => {
            onRefresh?.()
          }}
        />
      )}

      <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-4 bg-white border border-neutral-border rounded-lg hover:bg-background-hover hover:border-brand-primary/30 hover:shadow-sm transition-all"
        >
          {/* File Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {getFileIcon(file.mime_type)}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate">
                {file.name}
              </p>
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <Avatar
                    name={file.uploaded_by_profile.full_name || file.uploaded_by_profile.email}
                    email={file.uploaded_by_profile.email}
                    size="xs"
                  />
                  {file.uploaded_by_profile.full_name || file.uploaded_by_profile.email}
                </span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(file.id, file.name)}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </Button>
            {canShare && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(file)
                  setShareModalOpen(true)
                }}
                title="Share with clients"
              >
                <Share2 className="w-4 h-4 text-brand-primary" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(file.id, file.name)}
                disabled={deletingId === file.id}
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-state-error" />
              </Button>
            )}
          </div>
        </div>
      ))}
      </div>
    </>
  )
}
