'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Task, TaskFormData, RecurrenceRule, RecurrenceFrequency } from '@/types/tasks'
import { TaskStatus, TaskPriority } from '@/types/entities'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { canAssignTaskTo, canDeleteTask } from '@/lib/auth/permissions'
import { TaskComments } from './TaskComments'

export interface SelectOption {
  value: string
  label: string
}

interface User {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: string
  org_id?: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

interface Profile {
  id: string
  org_id: string
  role: string
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onSave: (data: TaskFormData & { target_org_id?: string }, taskId?: string) => Promise<void>
  onDelete?: (taskId: string) => Promise<void>
  users: User[]
  organizations: Organization[]
  profile: Profile | null
}

const statusOptions: SelectOption[] = [
  { value: 'pending', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

const priorityOptions: SelectOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function TaskModal({
  isOpen,
  onClose,
  task,
  onSave,
  onDelete,
  users,
  organizations,
  profile,
}: TaskModalProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assigned_to: null,
    due_date: null,
    is_internal: false,
    is_recurring: false,
    recurrence_rule: null,
  })
  const [assignmentType, setAssignmentType] = useState<'internal' | 'external'>('internal')
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEditMode = !!task
  const isAdmin = ['admin', 'manager'].includes(profile?.role || '')

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        is_internal: task.is_internal || false,
        is_recurring: task.is_recurring || false,
        recurrence_rule: task.recurrence_rule || null,
      })
      // Determine if task is external (assigned to user in different org)
      const assignedUser = users.find(u => u.id === task.assigned_to)
      if (assignedUser && assignedUser.org_id !== profile?.org_id) {
        setAssignmentType('external')
        setSelectedOrgId(assignedUser.org_id || '')
      } else {
        setAssignmentType('internal')
        setSelectedOrgId('')
      }
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assigned_to: null,
        due_date: null,
        is_internal: false,
        is_recurring: false,
        recurrence_rule: null,
      })
      setAssignmentType('internal')
      setSelectedOrgId('')
    }
    setErrors({})
  }, [task, isOpen, users, profile])

  const getAssigneeOptions = (): SelectOption[] => {
    const options: SelectOption[] = [
      { value: '', label: 'Unassigned' },
    ]

    if (!profile) return options

    // Filter users based on assignment type
    const filteredUsers = users.filter(user => {
      if (assignmentType === 'internal') {
        // Internal: only users in same org
        return user.org_id === profile.org_id
      } else {
        // External: only users in selected org
        return user.org_id === selectedOrgId
      }
    })

    filteredUsers.forEach(user => {
      // For clients, only allow assigning to self or team members
      if (!['admin', 'manager', 'user'].includes(profile.role)) {
        if (user.id === profile.id || ['admin', 'manager', 'user'].includes(user.role)) {
          options.push({
            value: user.id,
            label: user.full_name || user.email,
          })
        }
      } else {
        // Team members can assign to anyone
        options.push({
          value: user.id,
          label: user.full_name || user.email,
        })
      }
    })

    return options
  }

  const getOrgOptions = (): SelectOption[] => {
    return [
      { value: '', label: 'Select Organization' },
      ...organizations.map(org => ({
        value: org.id,
        label: org.name,
      })),
    ]
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)
    try {
      // Include target org if external assignment
      const saveData = {
        ...formData,
        ...(assignmentType === 'external' && selectedOrgId ? { target_org_id: selectedOrgId } : {})
      }
      await onSave(saveData, task?.id)
      onClose()
    } catch (error) {
      console.error('Failed to save task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = () => {
    if (!task || !onDelete) return
    setShowDeleteConfirm(true)
  }

  const canDelete = task && profile && (
    ['admin', 'manager'].includes(profile.role) ||
    (task.created_by === profile.id)
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task description (optional)"
              rows={3}
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as TaskStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignment Type (Admin only) */}
          {isAdmin && !isEditMode && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Assignment Type
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={assignmentType === 'internal' ? 'default' : 'outline'}
                  className="flex-1 text-xs"
                  onClick={() => {
                    setAssignmentType('internal')
                    setSelectedOrgId('')
                    setFormData({ ...formData, assigned_to: null })
                  }}
                >
                  Internal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={assignmentType === 'external' ? 'default' : 'outline'}
                  className="flex-1 text-xs"
                  onClick={() => {
                    setAssignmentType('external')
                    setFormData({ ...formData, assigned_to: null })
                  }}
                >
                  External (Client)
                </Button>
              </div>
            </div>
          )}

          {/* Organization Selector (Admin + External only) */}
          {isAdmin && !isEditMode && assignmentType === 'external' && (
            <div className="space-y-2">
              <Label>Client Organization</Label>
              <Select
                value={selectedOrgId || '__none__'}
                onValueChange={(value) => {
                  setSelectedOrgId(value === '__none__' ? '' : value)
                  setFormData({ ...formData, assigned_to: null })
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select Organization</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assignee and Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={formData.assigned_to || '__unassigned__'}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value === '__unassigned__' ? null : value })}
                disabled={isAdmin && !isEditMode && assignmentType === 'external' && !selectedOrgId}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {getAssigneeOptions().filter(opt => opt.value !== '').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value || null })}
              />
            </div>
          </div>

          {/* Internal Task Toggle (team only) */}
          {isAdmin && (
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Internal Task</p>
                <p className="text-xs text-muted-foreground">Hidden from client views</p>
              </div>
              <Switch
                checked={formData.is_internal || false}
                onCheckedChange={(checked) => setFormData({ ...formData, is_internal: checked })}
              />
            </div>
          )}

          {/* Recurring Task (team only) */}
          {isAdmin && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Recurring Task</p>
                  <p className="text-xs text-muted-foreground">Automatically create new instances on a schedule</p>
                </div>
                <Switch
                  checked={formData.is_recurring || false}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      is_recurring: checked,
                      recurrence_rule: checked
                        ? { frequency: 'weekly' as RecurrenceFrequency, interval: 1 }
                        : null,
                    })
                  }}
                />
              </div>

              {formData.is_recurring && formData.recurrence_rule && (
                <div className="grid grid-cols-3 gap-3 pl-3 border-l-2 border-primary/20">
                  <div className="space-y-1">
                    <Label className="text-xs">Frequency</Label>
                    <Select
                      value={formData.recurrence_rule.frequency}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          recurrence_rule: {
                            ...formData.recurrence_rule!,
                            frequency: value as RecurrenceFrequency,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Every</Label>
                    <Select
                      value={String(formData.recurrence_rule.interval || 1)}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          recurrence_rule: {
                            ...formData.recurrence_rule!,
                            interval: parseInt(value),
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 6, 12].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {formData.recurrence_rule!.frequency === 'weekly' ? (n === 1 ? 'week' : 'weeks') : formData.recurrence_rule!.frequency === 'monthly' ? (n === 1 ? 'month' : 'months') : (n === 1 ? 'quarter' : 'quarters')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.recurrence_rule.frequency === 'weekly' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Day</Label>
                      <Select
                        value={String(formData.recurrence_rule.day_of_week ?? 1)}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            recurrence_rule: {
                              ...formData.recurrence_rule!,
                              day_of_week: parseInt(value),
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                            <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(formData.recurrence_rule.frequency === 'monthly' || formData.recurrence_rule.frequency === 'quarterly') && (
                    <div className="space-y-1">
                      <Label className="text-xs">Day of Month</Label>
                      <Select
                        value={String(formData.recurrence_rule.day_of_month ?? 1)}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            recurrence_rule: {
                              ...formData.recurrence_rule!,
                              day_of_month: parseInt(value),
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Show parent task info on generated instances */}
              {isEditMode && task?.parent_task_id && (
                <p className="text-xs text-muted-foreground pl-3 border-l-2 border-primary/20">
                  This task was generated from a recurring task template.
                </p>
              )}
            </div>
          )}

          {/* Comments (edit mode only) */}
          {isEditMode && task && profile && (
            <div>
              <Separator className="my-1" />
              <h4 className="text-sm font-medium text-foreground mb-2">Comments</h4>
              <TaskComments
                taskId={task.id}
                currentUserId={profile.id}
                isTeam={isAdmin}
                users={users.map(u => ({ id: u.id, full_name: u.full_name, email: u.email }))}
              />
            </div>
          )}

          {/* Footer */}
          <DialogFooter>
            {canDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="mr-auto"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Task"
        description="Are you sure you want to delete this task?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!task || !onDelete) return
          setShowDeleteConfirm(false)
          setIsDeleting(true)
          try {
            await onDelete(task.id)
            onClose()
          } catch (error) {
            console.error('Failed to delete task:', error)
          } finally {
            setIsDeleting(false)
          }
        }}
      />
    </Dialog>
  )
}
