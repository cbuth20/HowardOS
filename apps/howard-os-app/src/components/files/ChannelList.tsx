'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@howard/ui/components/ui/input'
import { HowardAvatar } from '@howard/ui/components/ui/howard-avatar'
import { formatDistanceToNow } from 'date-fns'
import type { FileChannelWithDetails } from '@howard/ui/types/entities'

interface ChannelListProps {
  channels: FileChannelWithDetails[]
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
  isLoading?: boolean
}

export function ChannelList({
  channels,
  selectedChannelId,
  onSelectChannel,
  isLoading,
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredChannels = channels.filter((channel) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      channel.name.toLowerCase().includes(query) ||
      channel.client_organization?.name?.toLowerCase().includes(query) ||
      channel.primary_contact?.full_name?.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChannels.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No channels match your search' : 'No channels yet'}
            </p>
          </div>
        ) : (
          filteredChannels.map((channel) => {
            const isSelected = selectedChannelId === channel.id
            const contactName = channel.primary_contact?.full_name || 'No contact'
            const orgName = channel.client_organization?.name || channel.name
            const logoUrl = channel.client_organization?.logo_url
            const timeAgo = channel.latest_activity
              ? formatDistanceToNow(new Date(channel.latest_activity), { addSuffix: false })
              : null

            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2 ${
                  isSelected
                    ? 'bg-primary/5 border-l-primary'
                    : 'border-l-transparent hover:bg-secondary'
                }`}
              >
                <HowardAvatar
                  name={orgName}
                  src={logoUrl || undefined}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}>
                    {orgName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {contactName} shared files
                  </p>
                </div>
                {timeAgo && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {timeAgo}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
