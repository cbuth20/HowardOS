'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectOption } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Task, TaskFormData } from '@/types/tasks'
import { TaskStatus, TaskPriority } from '@/types/entities'
import { canAssignTaskTo, canDeleteTask } from '@/lib/auth/permissions'

interface User {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: 'admin' | 'client'
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
  role: 'admin' | 'client'
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
  { value: 'hidden', label: 'Hidden' },
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
  })
  const [assignmentType, setAssignmentType] = useState<'internal' | 'external'>('internal')
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isEditMode = !!task
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
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
      // For clients, only allow assigning to self or admins
      if (profile.role === 'client') {
        if (user.id === profile.id || user.role === 'admin') {
          options.push({
            value: user.id,
            label: user.full_name || user.email,
          })
        }
      } else {
        // Admins can assign to anyone
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

  const handleDelete = async () => {
    if (!task || !onDelete) return

    const confirmed = confirm('Are you sure you want to delete this task?')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await onDelete(task.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete task:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete = task && profile && (
    profile.role === 'admin' ||
    (profile.role === 'client' && task.created_by === profile.id)
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Task' : 'Create New Task'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Title */}
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          error={errors.title}
          placeholder="Enter task title"
          required
        />

        {/* Description */}
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter task description (optional)"
          rows={3}
        />

        {/* Status and Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
            options={statusOptions}
          />

          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
            options={priorityOptions}
          />
        </div>

        {/* Assignment Type (Admin only) */}
        {isAdmin && !isEditMode && (
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1.5">
              Assignment Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAssignmentType('internal')
                  setSelectedOrgId('')
                  setFormData({ ...formData, assigned_to: null })
                }}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  assignmentType === 'internal'
                    ? 'bg-brand-primary text-white'
                    : 'bg-white text-text-primary border border-neutral-border hover:bg-muted-DEFAULT'
                }`}
              >
                Internal
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignmentType('external')
                  setFormData({ ...formData, assigned_to: null })
                }}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  assignmentType === 'external'
                    ? 'bg-brand-primary text-white'
                    : 'bg-white text-text-primary border border-neutral-border hover:bg-muted-DEFAULT'
                }`}
              >
                External (Client)
              </button>
            </div>
          </div>
        )}

        {/* Organization Selector (Admin + External only) */}
        {isAdmin && !isEditMode && assignmentType === 'external' && (
          <Select
            label="Client Organization"
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value)
              setFormData({ ...formData, assigned_to: null })
            }}
            options={getOrgOptions()}
          />
        )}

        {/* Assignee and Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Assigned To"
            value={formData.assigned_to || ''}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value || null })}
            options={getAssigneeOptions()}
            disabled={isAdmin && !isEditMode && assignmentType === 'external' && !selectedOrgId}
          />

          <Input
            label="Due Date"
            type="date"
            value={formData.due_date || ''}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value || null })}
          />
        </div>

        {/* Footer */}
        <ModalFooter>
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
            variant="secondary"
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
        </ModalFooter>
      </form>
    </Modal>
  )
}
