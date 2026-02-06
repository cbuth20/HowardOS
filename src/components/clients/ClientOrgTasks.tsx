'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/utils/auth-fetch'
import { Task, TaskStatus, TaskPriority } from '@/types/tasks'
import { Button } from '@/components/ui/Button'
import { Plus, Loader2, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

interface ClientOrgTasksProps {
  orgId: string
  orgName: string
  onCreateTask: () => void
}

const statusConfig: Record<TaskStatus, { label: string; icon: any; color: string }> = {
  pending: { label: 'To Do', icon: Circle, color: 'text-text-muted' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-brand-primary' },
  completed: { label: 'Done', icon: CheckCircle2, color: 'text-state-success' },
  hidden: { label: 'Hidden', icon: Circle, color: 'text-text-muted' },
  cancelled: { label: 'Cancelled', icon: Circle, color: 'text-state-error' },
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
}

export function ClientOrgTasks({ orgId, orgName, onCreateTask }: ClientOrgTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | TaskStatus>('all')

  useEffect(() => {
    loadTasks()
  }, [orgId])

  const loadTasks = async () => {
    setLoading(true)
    try {
      // Fetch all tasks and filter client-side by org_id
      const response = await authFetch('/api/tasks?view=all-tasks')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tasks')
      }

      // Filter tasks for this specific organization
      const orgTasks = data.tasks.filter((task: Task) => task.org_id === orgId)
      setTasks(orgTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ))

    try {
      const response = await authFetch(`/api/tasks?id=${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      toast.success('Task updated')
      loadTasks() // Reload to get updated data
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
      loadTasks() // Revert on error
    }
  }

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter)

  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-muted border border-neutral-border hover:bg-muted-DEFAULT'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'pending'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-muted border border-neutral-border hover:bg-muted-DEFAULT'
            }`}
          >
            To Do ({tasksByStatus.pending})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'in_progress'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-muted border border-neutral-border hover:bg-muted-DEFAULT'
            }`}
          >
            In Progress ({tasksByStatus.in_progress})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'completed'
                ? 'bg-brand-primary text-white'
                : 'bg-white text-text-muted border border-neutral-border hover:bg-muted-DEFAULT'
            }`}
          >
            Done ({tasksByStatus.completed})
          </button>
        </div>
        <Button size="sm" onClick={onCreateTask}>
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p className="text-sm">No tasks found</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const StatusIcon = statusConfig[task.status].icon
            const isOverdue = task.due_date &&
              new Date(task.due_date) < new Date() &&
              task.status !== 'completed'

            return (
              <div
                key={task.id}
                className={`bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow ${
                  isOverdue ? 'border-state-error' : 'border-neutral-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center text-xs text-state-error font-medium">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-sm text-text-primary mb-1">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-text-muted line-clamp-2 mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      {task.assigned_to_profile && (
                        <span>
                          Assigned to: {task.assigned_to_profile.full_name || task.assigned_to_profile.email}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={isOverdue ? 'text-state-error font-medium' : ''}>
                          Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      className="text-xs px-2 py-1 border border-neutral-border rounded bg-white"
                    >
                      {Object.entries(statusConfig).map(([status, config]) => (
                        <option key={status} value={status}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
