'use client'

import { TaskView } from '@/types/tasks'
import { Select, SelectOption } from '@/components/ui/Select'

interface User {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

interface TaskFiltersProps {
  activeTab: TaskView
  onTabChange: (tab: TaskView) => void
  assigneeFilter: string | null
  onAssigneeChange: (assignee: string | null) => void
  users: User[]
  userRole: 'admin' | 'client' | undefined
}

const viewTabs: { value: TaskView; label: string; adminOnly?: boolean }[] = [
  { value: 'my-tasks', label: 'My Tasks' },
  { value: 'team-tasks', label: 'Team Tasks', adminOnly: true },
  { value: 'client-tasks', label: 'Client Tasks', adminOnly: true },
  { value: 'all-tasks', label: 'All Tasks', adminOnly: true },
]

export function TaskFilters({
  activeTab,
  onTabChange,
  assigneeFilter,
  onAssigneeChange,
  users,
  userRole,
}: TaskFiltersProps) {
  const availableTabs = viewTabs.filter(
    tab => !tab.adminOnly || userRole === 'admin'
  )

  const assigneeOptions: SelectOption[] = [
    { value: '', label: 'All Assignees' },
    ...users.map(user => ({
      value: user.id,
      label: user.full_name || user.email,
    })),
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4 pb-3 border-b border-neutral-border">
      {/* View Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {availableTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${
                activeTab === tab.value
                  ? 'bg-brand-primary text-white'
                  : 'bg-white text-text-primary border border-neutral-border hover:bg-muted-DEFAULT'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Assignee Filter (Admin only) */}
      {userRole === 'admin' && (
        <div className="sm:ml-auto sm:w-48">
          <Select
            value={assigneeFilter || ''}
            onChange={(e) => onAssigneeChange(e.target.value || null)}
            options={assigneeOptions}
            className="text-xs py-1.5"
          />
        </div>
      )}
    </div>
  )
}
