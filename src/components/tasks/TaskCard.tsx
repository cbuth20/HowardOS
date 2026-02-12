'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '@/types/tasks'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, Clock, User, EyeOff } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onTaskClick: (task: Task) => void
  canEdit: boolean
}

const priorityColors = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
}

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export function TaskCard({ task, onTaskClick, canEdit }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !canEdit,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue = task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'completed'

  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  const isLongOutstanding = daysSinceCreated > 30 &&
    task.status !== 'completed' &&
    task.status !== 'cancelled'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task)}
      className={`
        bg-card rounded-md p-2.5 shadow-sm border cursor-pointer
        hover:shadow transition-all
        ${isOverdue ? 'border-destructive' : 'border-border'}
        ${isDragging ? 'opacity-50' : ''}
        ${!canEdit ? 'cursor-default' : ''}
      `}
    >
      {/* Priority Badge + Indicators */}
      <div className="flex items-center justify-between mb-1.5 gap-1">
        <div className="flex items-center gap-1">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
              priorityColors[task.priority]
            }`}
          >
            {priorityLabels[task.priority]}
          </span>
          {task.is_internal && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium" title="Internal - hidden from clients">
              <EyeOff className="w-3 h-3 inline" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isLongOutstanding && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium" title={`Created ${daysSinceCreated} days ago`}>
              {daysSinceCreated}d
            </span>
          )}
          {isOverdue && (
            <div className="flex items-center text-destructive text-[11px] font-medium">
              <AlertCircle className="w-3 h-3 mr-0.5" />
              Overdue
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-2 leading-tight">
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1 leading-tight">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        {/* Assignee */}
        <div className="flex items-center min-w-0 flex-1">
          {task.assigned_to_profile ? (
            <>
              {task.assigned_to_profile.avatar_url ? (
                <img
                  src={task.assigned_to_profile.avatar_url}
                  alt={task.assigned_to_profile.full_name || task.assigned_to_profile.email}
                  className="w-5 h-5 rounded-full mr-1.5 flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center mr-1.5 text-[9px] flex-shrink-0">
                  {(task.assigned_to_profile.full_name || task.assigned_to_profile.email)[0].toUpperCase()}
                </div>
              )}
              <span className="truncate">
                {task.assigned_to_profile.full_name || task.assigned_to_profile.email}
              </span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              <span>Unassigned</span>
            </>
          )}
        </div>

        {/* Due Date or Created At */}
        <div className="flex items-center ml-2 flex-shrink-0">
          {task.due_date ? (
            <>
              <Clock className="w-3 h-3 mr-0.5" />
              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
              </span>
            </>
          ) : (
            <span className="text-[10px]">
              {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
