'use client'

import { useState, useRef, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Send, Trash2, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { HowardAvatar } from '@/components/ui/howard-avatar'
import {
  useTaskComments,
  useCreateTaskComment,
  useDeleteTaskComment,
  type TaskComment,
} from '@/lib/api/hooks/useTaskComments'

interface TaskCommentsProps {
  taskId: string
  currentUserId: string
  isTeam: boolean
  users: Array<{ id: string; full_name: string | null; email: string }>
}

export function TaskComments({ taskId, currentUserId, isTeam, users }: TaskCommentsProps) {
  const { data: comments = [], isLoading } = useTaskComments(taskId)
  const createComment = useCreateTaskComment()
  const deleteComment = useDeleteTaskComment()

  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionCursorPos, setMentionCursorPos] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleSubmit = async () => {
    if (!content.trim()) return

    await createComment.mutateAsync({
      task_id: taskId,
      content: content.trim(),
      is_internal: isInternal,
    })

    setContent('')
    setIsInternal(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleContentChange = (value: string) => {
    setContent(value)

    // Detect @ mentions
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = value.substring(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      setShowMentions(true)
      setMentionFilter(atMatch[1].toLowerCase())
      setMentionCursorPos(cursorPos - atMatch[0].length)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (user: { id: string; full_name: string | null; email: string }) => {
    const name = user.full_name || user.email
    const beforeMention = content.substring(0, mentionCursorPos)
    const afterMention = content.substring(textareaRef.current?.selectionStart || mentionCursorPos)
    const newContent = `${beforeMention}@[${name}](${user.id}) ${afterMention}`
    setContent(newContent)
    setShowMentions(false)

    // Refocus textarea
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const filteredMentionUsers = users.filter(u =>
    u.id !== currentUserId && (
      u.full_name?.toLowerCase().includes(mentionFilter) ||
      u.email.toLowerCase().includes(mentionFilter)
    )
  ).slice(0, 5)

  // Render comment content with @mention highlighting
  const renderContent = (text: string) => {
    const parts = text.split(/(@\[([^\]]+)\]\([a-f0-9-]+\))/)
    return parts.map((part, i) => {
      const mentionMatch = part.match(/^@\[([^\]]+)\]\(([a-f0-9-]+)\)$/)
      if (mentionMatch) {
        return (
          <span key={i} className="text-primary font-medium">
            @{mentionMatch[1]}
          </span>
        )
      }
      // Skip capture group parts
      if (i % 3 !== 0) return null
      return <span key={i}>{part}</span>
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Comment List */}
      <div className="max-h-64 overflow-y-auto space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`flex gap-2.5 group ${comment.is_internal ? 'opacity-80' : ''}`}
            >
              <HowardAvatar
                name={comment.user?.full_name || comment.user?.email || ''}
                email={comment.user?.email}
                role={comment.user?.role}
                src={comment.user?.avatar_url || undefined}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {comment.user?.full_name || comment.user?.email}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {comment.is_internal && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground" title="Internal comment">
                      <EyeOff className="w-3 h-3 inline" />
                    </span>
                  )}
                  {(comment.user_id === currentUserId || isTeam) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteComment.mutate({ id: comment.id, taskId })}
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                  {renderContent(comment.content)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment Input */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... (@ to mention, Cmd+Enter to send)"
          rows={2}
          className="pr-12 text-sm resize-none"
        />

        {/* Mention autocomplete dropdown */}
        {showMentions && filteredMentionUsers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-64 bg-card border border-border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
            {filteredMentionUsers.map((user) => (
              <button
                key={user.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                onClick={() => insertMention(user)}
              >
                <HowardAvatar name={user.full_name || user.email} size="xs" />
                <span className="truncate">{user.full_name || user.email}</span>
              </button>
            ))}
          </div>
        )}

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-2 bottom-2 h-7 w-7"
          onClick={handleSubmit}
          disabled={!content.trim() || createComment.isPending}
        >
          {createComment.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Internal toggle (team only) */}
      {isTeam && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={isInternal}
            onCheckedChange={setIsInternal}
            className="scale-75"
          />
          <span>Internal comment (hidden from clients)</span>
        </div>
      )}
    </div>
  )
}
