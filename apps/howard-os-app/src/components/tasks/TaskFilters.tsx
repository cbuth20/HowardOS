'use client'

import { TaskView } from '@howard/ui/types/tasks'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@howard/ui/components/ui/select'
import { FilterChip } from '@howard/ui/components/ui/howard-filter-chip'

interface User {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

interface Organization {
  id: string
  name: string
}

interface TaskFiltersProps {
  activeTab: TaskView
  onTabChange: (tab: TaskView) => void
  assigneeFilter: string | null
  onAssigneeChange: (assignee: string | null) => void
  orgFilter?: string | null
  onOrgChange?: (orgId: string | null) => void
  longOutstanding?: boolean
  onLongOutstandingChange?: (value: boolean) => void
  users: User[]
  organizations?: Organization[]
  userRole: string | undefined
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
  orgFilter,
  onOrgChange,
  longOutstanding,
  onLongOutstandingChange,
  users,
  organizations = [],
  userRole,
}: TaskFiltersProps) {
  const isTeam = ['admin', 'manager', 'user'].includes(userRole || '')
  const availableTabs = viewTabs.filter(
    tab => !tab.adminOnly || isTeam
  )

  return (
    <div className="flex flex-col gap-3 mb-3 md:mb-4 pb-3 border-b border-border">
      {/* Row 1: View Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <div className="flex gap-1.5 min-w-min">
          {availableTabs.map((tab) => (
            <FilterChip
              key={tab.value}
              label={tab.label}
              isActive={activeTab === tab.value}
              onClick={() => onTabChange(tab.value)}
              size="sm"
            />
          ))}
        </div>
      </div>

      {/* Row 2: Filters (team only) */}
      {isTeam && (
        <div className="flex flex-wrap gap-2 items-center">
          {/* Assignee Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={assigneeFilter || '__all__'}
              onValueChange={(value) => onAssigneeChange(value === '__all__' ? null : value)}
            >
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Assignees</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name || user.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Org Filter */}
          {organizations.length > 0 && onOrgChange && (
            <div className="w-full sm:w-44">
              <Select
                value={orgFilter || '__all__'}
                onValueChange={(value) => onOrgChange(value === '__all__' ? null : value)}
              >
                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Clients</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Long Outstanding Toggle */}
          {onLongOutstandingChange && (
            <FilterChip
              label="30+ Days"
              isActive={longOutstanding || false}
              onClick={() => onLongOutstandingChange(!longOutstanding)}
              size="sm"
            />
          )}
        </div>
      )}
    </div>
  )
}
