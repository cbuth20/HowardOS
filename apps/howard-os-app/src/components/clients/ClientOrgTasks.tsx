'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@howard/ui/lib/utils/auth-fetch'
import { Task, TaskStatus, TaskPriority } from '@howard/ui/types/tasks'
import { Button } from '@howard/ui/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@howard/ui/components/ui/select'
import { Plus, Loader2, CheckCircle2, Circle, Clock, AlertCircle, LucideIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface ClientOrgTasksProps {
  orgId: string
  orgName: string
  onCreateTask: () => void
}

const statusConfig: Record<TaskStatus, { label: string; icon: LucideIcon; color: string }> = {
  pending: { label: 'To Do', icon: Circle, color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-primary' },
  completed: { label: 'Done', icon: CheckCircle2, color: 'text-primary' },
  cancelled: { label: 'Cancelled', icon: Circle, color: 'text-destructive' },
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
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({tasks.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            To Do ({tasksByStatus.pending})
          </Button>
          <Button
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('in_progress')}
          >
            In Progress ({tasksByStatus.in_progress})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Done ({tasksByStatus.completed})
          </Button>
        </div>
        <Button size="sm" onClick={onCreateTask}>
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
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
                className={`bg-card border rounded-lg p-3 hover:shadow-sm transition-shadow ${
                  isOverdue ? 'border-destructive' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center text-xs text-destructive font-medium">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-sm text-foreground mb-1">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.assigned_to_profile && (
                        <span>
                          Assigned to: {task.assigned_to_profile.full_name || task.assigned_to_profile.email}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                          Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Select
                      value={task.status}
                      onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                    >
                      <SelectTrigger className="h-7 w-auto text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([status, config]) => (
                          <SelectItem key={status} value={status}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
