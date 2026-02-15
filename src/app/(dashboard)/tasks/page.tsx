'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Plus } from 'lucide-react'
import { TaskView, TaskStatus, TaskFormData } from '@/types/tasks'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskModal } from '@/components/tasks/TaskModal'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/howard-loading'
import { canEditTask } from '@/lib/auth/permissions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from '@/lib/api/hooks'

interface Profile {
  id: string
  org_id: string
  role: string
  full_name: string | null
  email: string
}

interface User {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: string
  org_id: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default function TasksPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])

  // Filters
  const [activeTab, setActiveTab] = useState<TaskView>('my-tasks')
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
  const [orgFilter, setOrgFilter] = useState<string | null>(null)
  const [longOutstanding, setLongOutstanding] = useState(false)

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const taskParamHandled = useRef(false)
  const supabase = createClient()

  // Use TanStack Query hooks
  const { data: tasks = [], isLoading, refetch } = useTasks({
    view: activeTab,
    assignee: assigneeFilter || undefined,
    org_id: orgFilter || undefined,
    long_outstanding: longOutstanding || undefined,
  })

  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (profile) {
      loadUsers()
      loadOrganizations()
    }
  }, [profile])

  // Auto-refresh tasks every 30 seconds
  useEffect(() => {
    if (!profile) return

    const interval = setInterval(() => {
      refetch()
    }, 30000)

    return () => clearInterval(interval)
  }, [profile, refetch])

  // Open task from URL param (e.g., /tasks?task=<id>)
  useEffect(() => {
    const taskId = searchParams.get('task')
    if (taskId && tasks.length > 0 && !taskParamHandled.current) {
      const task = tasks.find((t: any) => t.id === taskId)
      if (task) {
        setSelectedTask(task)
        setIsModalOpen(true)
        taskParamHandled.current = true
      } else if (!isLoading) {
        // Task not in current view - switch to all-tasks and try again
        if (activeTab !== 'all-tasks') {
          setActiveTab('all-tasks')
        } else {
          taskParamHandled.current = true
        }
      }
    }
  }, [searchParams, tasks, isLoading, activeTab])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await (supabase as any)
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

      let query = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, org_id')

      if (profile.role === 'client') {
        query = query.eq('org_id', profile.org_id) as any
      }

      const { data } = await (query as any).order('full_name')

      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadOrganizations = async () => {
    try {
      if (!profile) return

      if (!['admin', 'manager', 'user'].includes(profile.role)) return

      const { data } = await (supabase as any)
        .from('organizations')
        .select('id, name, slug')
        .order('name')

      setOrganizations(data || [])
    } catch (error) {
      console.error('Error loading organizations:', error)
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: { status: TaskStatus }) => {
    updateTask.mutate({ id: taskId, data: updates })
  }

  const handleTaskSave = async (formData: TaskFormData, taskId?: string) => {
    try {
      if (taskId) {
        await updateTask.mutateAsync({ id: taskId, data: formData })
      } else {
        await createTask.mutateAsync(formData)
      }

      setIsModalOpen(false)
      setSelectedTask(null)
    } catch (error) {
      // Error is already handled by the mutation hook
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    setConfirmDeleteTaskId(taskId)
  }

  const handleCreateTask = () => {
    setSelectedTask(null)
    setIsModalOpen(true)
  }

  const handleEditTask = (task: any) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const handleTabChange = (view: TaskView) => {
    setActiveTab(view)
  }

  const handleAssigneeChange = (assignee: string | null) => {
    setAssigneeFilter(assignee)
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Sticky Topbar */}
      <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex gap-2">
              <CheckSquare className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Tasks
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Loading...' : `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
            </p>
          </div>
          <Button
            onClick={handleCreateTask}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Filters */}
        <TaskFilters
          activeTab={activeTab}
          onTabChange={handleTabChange}
          assigneeFilter={assigneeFilter}
          onAssigneeChange={handleAssigneeChange}
          orgFilter={orgFilter}
          onOrgChange={setOrgFilter}
          longOutstanding={longOutstanding}
          onLongOutstandingChange={setLongOutstanding}
          users={users}
          organizations={organizations}
          userRole={profile.role}
        />

        {/* Task Board */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <TaskBoard
            tasks={tasks as any}
            onTaskClick={handleEditTask}
            onTaskUpdate={handleTaskUpdate}
            canEditTask={(task: any) => canEditTask(profile as any, task)}
          />
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        users={users}
        organizations={organizations}
        profile={profile}
      />

      {/* Delete Task Confirmation */}
      <ConfirmDialog
        open={!!confirmDeleteTaskId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteTaskId(null) }}
        title="Delete Task"
        description="Are you sure you want to delete this task?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!confirmDeleteTaskId) return
          const taskId = confirmDeleteTaskId
          setConfirmDeleteTaskId(null)
          try {
            await deleteTask.mutateAsync(taskId)
            setIsModalOpen(false)
            setSelectedTask(null)
          } catch (error) {
            // Error is already handled by the mutation hook
          }
        }}
      />
    </div>
  )
}
