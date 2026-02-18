import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChannelList } from '@/components/files/ChannelList'
import { ChannelContentView } from '@/components/files/ChannelContentView'
import { CreateChannelModal } from '@/components/files/CreateChannelModal'
import { useFileChannels } from '@/lib/api/hooks'
import { useProfile } from '@/lib/api/hooks/useProfile'

export default function FilesPage() {
  const { profile } = useProfile()
  const [searchParams] = useSearchParams()
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [initialChannelSet, setInitialChannelSet] = useState(false)

  const { data: channels = [], isLoading: channelsLoading } = useFileChannels()

  // Auto-select channel from URL param or first channel when channels load
  useEffect(() => {
    if (channels.length > 0 && !initialChannelSet) {
      const channelParam = searchParams.get('channel')
      const matchedChannel = channelParam && channels.find((c) => c.id === channelParam)
      setSelectedChannelId(matchedChannel ? matchedChannel.id : channels[0].id)
      setInitialChannelSet(true)
    }
  }, [channels, initialChannelSet, searchParams])

  const isTeam = ['admin', 'manager', 'user'].includes(profile?.role || '')
  const isAdmin = isTeam // team members get admin-like file access
  const selectedChannel = channels.find((c) => c.id === selectedChannelId)

  // Client view: if only one channel, show it directly without sidebar
  const isClientSingleChannel = !isAdmin && channels.length <= 1

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Sticky Topbar */}
      <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl flex gap-2 font-semibold tracking-tight text-foreground">
              <FolderOpen className="w-6 h-6 text-primary" />
              File channels
            </h1>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Channel
            </Button>
          )}
        </div>
      </div>

      {/* Two-panel content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left panel - Channel list (hidden for single-channel clients) */}
        {!isClientSingleChannel && (
          <div className="w-72 border-r border-border flex flex-col bg-secondary overflow-hidden flex-shrink-0">
            <ChannelList
              channels={channels}
              selectedChannelId={selectedChannelId}
              onSelectChannel={setSelectedChannelId}
              isLoading={channelsLoading}
            />
          </div>
        )}

        {/* Right panel - Channel content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card">
          {selectedChannelId && selectedChannel ? (
            <ChannelContentView
              channelId={selectedChannelId}
              channel={selectedChannel}
              isAdmin={isAdmin}
              onChannelDeleted={() => setSelectedChannelId(null)}
            />
          ) : channelsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {isAdmin ? 'No file channels yet' : 'No files shared with you'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                {isAdmin
                  ? 'Create a file channel to start sharing files with your clients. Each channel is linked to a client organization.'
                  : 'Your advisor will create a file channel and share files with you here.'}
              </p>
              {isAdmin && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Channel
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onChannelCreated={(channelId) => setSelectedChannelId(channelId)}
      />
    </div>
  )
}
