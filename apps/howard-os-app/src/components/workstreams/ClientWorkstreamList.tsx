import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, ChevronRight, Building2, Search } from 'lucide-react'
import { WorkstreamWithEntriesAndRollup } from '@howard/ui/types/entities'
import { WorkstreamStatusBadge } from './WorkstreamStatusBadge'
import { useCreateClientWorkstream } from '@howard/ui/lib/api/hooks/useWorkstreams'
import { Button } from '@howard/ui/components/ui/button'
import { Input } from '@howard/ui/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@howard/ui/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@howard/ui/components/ui/table'
import { ConfirmDialog } from '@howard/ui/components/ui/confirm-dialog'
import { toast } from 'sonner'

interface ClientWorkstreamListProps {
  workstreams: WorkstreamWithEntriesAndRollup[]
  organizations: Array<{ id: string; name: string }>
  loading?: boolean
  onSelectWorkstream?: (workstreamId: string) => void
}

export function ClientWorkstreamList({
  workstreams,
  organizations,
  loading = false,
  onSelectWorkstream,
}: ClientWorkstreamListProps) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    org_id: '',
    status: '',
    search: '',
  })

  const createWorkstreamMutation = useCreateClientWorkstream()
  const [confirmCreateOrg, setConfirmCreateOrg] = useState<{ id: string; name: string } | null>(null)

  // Handle create workstream for an org
  const handleCreateWorkstream = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId)
    if (!org) return
    setConfirmCreateOrg({ id: org.id, name: org.name })
  }

  // Handle navigate to workstream
  const handleNavigate = (workstreamId: string) => {
    if (onSelectWorkstream) {
      onSelectWorkstream(workstreamId)
    } else {
      navigate(`/workstreams/${workstreamId}`)
    }
  }

  // Find orgs without workstreams OR with empty workstreams (0 entries)
  const orgsWithWorkstreams = new Set(workstreams.map((w) => w.org_id))
  const orgsWithoutWorkstreams = organizations.filter((org) => !orgsWithWorkstreams.has(org.id))
  const emptyWorkstreams = workstreams.filter((w) => (w.total_entries || 0) === 0)
  const orgsNeedingAttention = [
    ...orgsWithoutWorkstreams.map(org => ({ id: org.id, name: org.name, hasWorkstream: false })),
    ...emptyWorkstreams.map(w => ({ id: w.org_id, name: w.organization?.name || 'Unknown', hasWorkstream: true, workstreamId: w.id })),
  ]

  // Filter workstreams
  const filteredWorkstreams = workstreams.filter((w) => {
    if (filters.org_id && w.org_id !== filters.org_id) {
      return false
    }
    if (filters.status && w.overall_status !== filters.status) {
      return false
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        w.organization?.name.toLowerCase().includes(searchLower) ||
        w.name.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-secondary rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search organizations..."
            className="pl-10"
          />
        </div>
        <Select
          value={filters.org_id || '__all__'}
          onValueChange={(value) => setFilters({ ...filters, org_id: value === '__all__' ? '' : value })}
        >
          <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Organizations ({workstreams.length})</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || '__all__'}
          onValueChange={(value) => setFilters({ ...filters, status: value === '__all__' ? '' : value })}
        >
          <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="red">Blocked</SelectItem>
            <SelectItem value="yellow">Resolving</SelectItem>
            <SelectItem value="green">Active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Workstreams Table */}
      {filteredWorkstreams.length === 0 && orgsNeedingAttention.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="font-medium">No workstreams yet</p>
          <p className="text-sm mt-2">
            Create workstreams for your client organizations to get started
          </p>
        </div>
      ) : (
        <>
          {/* Existing Workstreams Table */}
          {filteredWorkstreams.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary">
                  <TableRow>
                    <TableHead className="px-4 text-xs uppercase tracking-wider">
                      Organization
                    </TableHead>
                    <TableHead className="px-4 text-xs uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="px-4 text-xs uppercase tracking-wider">
                      Items
                    </TableHead>
                    <TableHead className="px-4 text-xs uppercase tracking-wider">
                      Verticals
                    </TableHead>
                    <TableHead className="px-4 text-xs uppercase tracking-wider">
                      Status Breakdown
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card">
                  {filteredWorkstreams.map((workstream) => {
                    const totalRed = workstream.vertical_rollups?.reduce((sum, r) => sum + r.red_count, 0) || 0
                    const totalYellow = workstream.vertical_rollups?.reduce((sum, r) => sum + r.yellow_count, 0) || 0
                    const totalGreen = workstream.vertical_rollups?.reduce((sum, r) => sum + r.green_count, 0) || 0

                    return (
                      <TableRow
                        key={workstream.id}
                        onClick={() => handleNavigate(workstream.id)}
                        className="cursor-pointer"
                      >
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-foreground">
                              {workstream.organization?.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <WorkstreamStatusBadge
                            status={workstream.overall_status || 'yellow'}
                            size="sm"
                            showLabel={true}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm font-semibold text-foreground">
                            {workstream.total_entries || 0}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm text-foreground/80">
                            {workstream.vertical_rollups?.length || 0} active
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1.5 w-full min-w-[120px]">
                            {(workstream.total_entries || 0) > 0 ? (
                              <>
                                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden flex">
                                  {totalGreen > 0 && (
                                    <div
                                      className="h-full bg-green-500"
                                      style={{ width: `${(totalGreen / (workstream.total_entries || 1)) * 100}%` }}
                                    />
                                  )}
                                  {totalYellow > 0 && (
                                    <div
                                      className="h-full bg-yellow-500"
                                      style={{ width: `${(totalYellow / (workstream.total_entries || 1)) * 100}%` }}
                                    />
                                  )}
                                  {totalRed > 0 && (
                                    <div
                                      className="h-full bg-red-500"
                                      style={{ width: `${(totalRed / (workstream.total_entries || 1)) * 100}%` }}
                                    />
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {totalGreen}/{totalYellow}/{totalRed}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Organizations needing attention (no workstream or 0 entries) */}
          {!filters.org_id && !filters.status && !filters.search && orgsNeedingAttention.length > 0 && (
            <div className="space-y-3">
              <div className="pt-2 border-t border-border">
                <h3 className="text-sm font-medium text-foreground/80 mb-3">
                  Needs Setup ({orgsNeedingAttention.length})
                </h3>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableBody className="bg-card">
                    {orgsNeedingAttention.map((item) => (
                      <TableRow key={item.id + (item.hasWorkstream ? '-ws' : '')}>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-foreground">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.hasWorkstream ? 'Workstream has no entries' : 'No workstream created yet'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          {item.hasWorkstream ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNavigate((item as any).workstreamId)
                              }}
                            >
                              Add Entries
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCreateWorkstream(item.id)
                              }}
                              disabled={createWorkstreamMutation.isPending}
                            >
                              <Plus className="h-3.5 w-3.5 mr-2" />
                              Create Workstream
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Summary Stats */}
      {filteredWorkstreams.length > 0 && (
        <div className="flex gap-6 text-sm text-foreground/80 pt-2 border-t border-border">
          <div>
            Total: <span className="font-semibold text-foreground">{filteredWorkstreams.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <WorkstreamStatusBadge status="red" size="sm" />
            <span className="font-semibold text-foreground">
              {filteredWorkstreams.filter((w) => w.overall_status === 'red').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <WorkstreamStatusBadge status="yellow" size="sm" />
            <span className="font-semibold text-foreground">
              {filteredWorkstreams.filter((w) => w.overall_status === 'yellow').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <WorkstreamStatusBadge status="green" size="sm" />
            <span className="font-semibold text-foreground">
              {filteredWorkstreams.filter((w) => w.overall_status === 'green').length}
            </span>
          </div>
        </div>
      )}

      {/* Create Workstream Confirmation */}
      <ConfirmDialog
        open={!!confirmCreateOrg}
        onOpenChange={(open) => { if (!open) setConfirmCreateOrg(null) }}
        title="Create Workstream"
        description={`Create a new workstream for ${confirmCreateOrg?.name}?`}
        confirmLabel="Create"
        variant="default"
        onConfirm={async () => {
          if (!confirmCreateOrg) return
          const { id: orgId } = confirmCreateOrg
          setConfirmCreateOrg(null)

          try {
            const result = await createWorkstreamMutation.mutateAsync({
              org_id: orgId,
              name: 'Workstream',
              notes: null,
            })
            toast.success('Workstream created successfully')
            if (onSelectWorkstream) {
              onSelectWorkstream(result.workstream.id)
            } else {
              navigate(`/workstreams/${result.workstream.id}`)
            }
          } catch (error: any) {
            toast.error(error.message || 'Failed to create workstream')
          }
        }}
      />
    </div>
  )
}
