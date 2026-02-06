'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/utils/auth-fetch'
import { CheckSquare, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Task, TaskView, TaskStatus, TaskFormData } from '@/types/tasks'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskModal } from '@/components/tasks/TaskModal'
import { Button } from '@/components/ui/Button'
import { canEditTask } from '@/lib/auth/permissions'

interface Profile {
  id: string
  org_id: string
  role: 'admin' | 'client'
  full_name: string | null
  email: string
}

interface User {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: 'admin' | 'client'
  org_id: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [activeTab, setActiveTab] = useState<TaskView>('my-tasks')
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (profile) {
      loadUsers()
      loadOrganizations()
      loadTasks()
    }
  }, [profile, activeTab, assigneeFilter])

  // Auto-refresh tasks every 30 seconds
  useEffect(() => {
    if (!profile) return

    const interval = setInterval(() => {
      loadTasks()
    }, 30000)

    return () => clearInterval(interval)
  }, [profile, activeTab, assigneeFilter])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('id, org_id, role, full_name, email')
        .eq('id', user.id)
        .single()

      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadUsers = async () => {
    try {
      if (!profile) return

      // Admins can see all users across orgs, clients only see their org
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, org_id')

      if (profile.role === 'client') {
        query = query.eq('org_id', profile.org_id)
      }

      const { data } = await query.order('full_name')

      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadOrganizations = async () => {
    try {
      if (!profile) return

      // Only load orgs for admins
      if (profile.role !== 'admin') return

      const { data } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name')

      setOrganizations(data || [])
    } catch (error) {
      console.error('Error loading organizations:', error)
    }
  }

  const loadTasks = async () => {
    try {
      if (!profile) return

      const params = new URLSearchParams()
      params.set('view', activeTab)
      if (assigneeFilter) params.set('assignee', assigneeFilter)

      const response = await authFetch(`/api/tasks?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tasks')
      }

      setTasks(data.tasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: { status: TaskStatus }) => {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    ))

    try {
      const response = await authFetch(`/api/tasks?id=${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task')
      }

      // Update with server response
      setTasks(prev => prev.map(t =>
        t.id === taskId ? data.task : t
      ))

      toast.success('Task updated')
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
      // Revert optimistic update
      loadTasks()
    }
  }

  const handleTaskSave = async (formData: TaskFormData, taskId?: string) => {
    try {
      const method = taskId ? 'PATCH' : 'POST'
      const url = taskId ? `/api/tasks?id=${taskId}` : '/api/tasks'

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save task')
      }

      toast.success(taskId ? 'Task updated' : 'Task created')
      loadTasks()
    } catch (error: any) {
      console.error('Error saving task:', error)
      toast.error(error.message || 'Failed to save task')
      throw error
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      const response = await authFetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete task')
      }

      toast.success('Task deleted')
      loadTasks()
    } catch (error: any) {
      console.error('Error deleting task:', error)
      toast.error(error.message || 'Failed to delete task')
      throw error
    }
  }

  const openCreateModal = () => {
    setSelectedTask(null)
    setIsModalOpen(true)
  }

  const openEditModal = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const canEdit = (task: Task) => {
    if (!profile) return false

    // Check permissions manually to avoid type issues
    if (profile.org_id !== task.org_id) return false
    if (profile.role === 'admin') return true
    if (task.created_by === profile.id) return true
    if (task.assigned_to === profile.id) return true

    return false
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sticky Topbar */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-border shadow-sm">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-6 h-6 text-brand-primary" />
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-text-primary">Tasks</h1>
                <p className="text-sm text-text-muted mt-1">
                  {profile?.role === 'admin' ? 'Manage all tasks' : 'Your assigned tasks'}
                </p>
              </div>
            </div>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <TaskFilters
          activeTab={activeTab}
          onTabChange={setActiveTab}
          assigneeFilter={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          users={users}
          userRole={profile?.role}
        />

        <TaskBoard
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskClick={openEditModal}
          canEditTask={canEdit}
        />
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={closeModal}
        task={selectedTask}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        users={users}
        organizations={organizations}
        profile={profile}
      />
    </div>
  )
}
