'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/utils/auth-fetch'
import { toast } from 'sonner'

interface FileViewerProps {
  isOpen: boolean
  onClose: () => void
  fileId: string
  fileName: string
  mimeType: string
  fileSize: number
}

export function FileViewer({
  isOpen,
  onClose,
  fileId,
  fileName,
  mimeType,
  fileSize,
}: FileViewerProps) {
  const [loading, setLoading] = useState(true)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && fileId) {
      loadFile()
    }

    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [isOpen, fileId])

  const loadFile = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await authFetch(`/api/files-download?id=${fileId}`)

      if (!response.ok) {
        throw new Error('Failed to load file')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setFileUrl(url)
    } catch (err) {
      console.error('Error loading file:', err)
      setError('Failed to load file for preview')
      toast.error('Failed to load file')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!fileUrl) return

    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('File downloaded')
  }

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    }
  }

  const isImage = mimeType.startsWith('image/')
  const isPDF = mimeType === 'application/pdf'
  const isVideo = mimeType.startsWith('video/')
  const isAudio = mimeType.startsWith('audio/')
  const isText = mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript'

  const canPreview = isImage || isPDF || isVideo || isAudio

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader><DialogTitle>{fileName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* File Info */}
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {mimeType} • {formatFileSize(fileSize)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canPreview && fileUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={!fileUrl}
                title="Download"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* File Preview */}
          <div className="bg-secondary rounded-lg border border-border overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={loadFile}>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && fileUrl && (
              <>
                {/* Image Preview */}
                {isImage && (
                  <div className="p-4 flex items-center justify-center bg-secondary min-h-[400px] max-h-[600px]">
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="max-w-full max-h-[600px] object-contain rounded"
                    />
                  </div>
                )}

                {/* PDF Preview */}
                {isPDF && (
                  <div className="w-full" style={{ height: '600px' }}>
                    <iframe
                      src={fileUrl}
                      className="w-full h-full border-0"
                      title={fileName}
                    />
                  </div>
                )}

                {/* Video Preview */}
                {isVideo && (
                  <div className="p-4 bg-black flex items-center justify-center">
                    <video
                      src={fileUrl}
                      controls
                      className="max-w-full max-h-[600px] rounded"
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}

                {/* Audio Preview */}
                {isAudio && (
                  <div className="p-8 flex items-center justify-center">
                    <audio src={fileUrl} controls className="w-full max-w-lg">
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}

                {/* Unsupported file type */}
                {!canPreview && (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <p className="text-muted-foreground mb-4 text-center">
                      Preview not available for this file type
                    </p>
                    <Button onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <DialogFooter className="pt-4 border-t border-border">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {fileUrl && (
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
