'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeftRight,
  Link2,
  Unlink,
  Download,
  Loader2,
  Building2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/howard-loading'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import {
  useQuickbooksConnections,
  useInitiateQuickbooksAuth,
  useDisconnectQuickbooks,
  usePullTransactions,
} from '@/lib/api/hooks'

interface Organization {
  id: string
  name: string
  slug: string
}

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportType, setReportType] = useState<'general_ledger' | 'profit_and_loss'>('general_ledger')
  const [reportData, setReportData] = useState<any>(null)
  const [disconnectId, setDisconnectId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Hooks
  const { data: connections = [], isLoading: loadingConnections } = useQuickbooksConnections()
  const initiateAuth = useInitiateQuickbooksAuth()
  const disconnect = useDisconnectQuickbooks()
  const pullTransactions = usePullTransactions()

  // Set default date range (current month)
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  // Show toast on successful connection redirect
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast.success('QuickBooks connected successfully')
    }
    const error = searchParams.get('error')
    if (error) {
      const messages: Record<string, string> = {
        missing_params: 'QuickBooks callback was missing required parameters',
        invalid_state: 'Invalid state in QuickBooks callback',
        storage_failed: 'Failed to save QuickBooks connection',
        auth_failed: 'QuickBooks authentication failed',
      }
      toast.error(messages[error] || 'QuickBooks connection error')
    }
  }, [searchParams])

  // Fetch organizations for the dropdown
  useEffect(() => {
    async function fetchOrgs() {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name')
      setOrganizations(data || [])
    }
    fetchOrgs()
  }, [])

  // Find the connection for the selected org
  const selectedConnection = connections.find((c: any) => c.org_id === selectedOrgId)

  const handlePull = async () => {
    if (!selectedOrgId || !startDate || !endDate) {
      toast.error('Please select an organization and date range')
      return
    }

    try {
      const result = await pullTransactions.mutateAsync({
        org_id: selectedOrgId,
        start_date: startDate,
        end_date: endDate,
        report_type: reportType,
      })
      setReportData(result)
    } catch {
      // Error handled by hook
    }
  }

  const handleDisconnect = () => {
    if (!disconnectId) return
    disconnect.mutate(disconnectId, {
      onSettled: () => setDisconnectId(null),
    })
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Controls Card */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-5">
            {/* Organization selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Client Organization
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => {
                  setSelectedOrgId(e.target.value)
                  setReportData(null)
                }}
                className="w-full max-w-md px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select an organization...</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            {/* Connection status */}
            {selectedOrgId && (
              <div className="flex items-center gap-3">
                {loadingConnections ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking connection...
                  </div>
                ) : selectedConnection ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-md">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700 dark:text-green-400">
                        Connected to {selectedConnection.company_name || 'QuickBooks'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Realm: {selectedConnection.realm_id}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDisconnectId(selectedConnection.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Unlink className="w-4 h-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-400">
                        Not connected to QuickBooks
                      </span>
                    </div>
                    <Button
                      onClick={() => initiateAuth.mutate(selectedOrgId)}
                      disabled={initiateAuth.isPending}
                      size="sm"
                    >
                      {initiateAuth.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4 mr-1" />
                      )}
                      Connect QuickBooks
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Date range + Pull button */}
            {selectedConnection && (
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="general_ledger">General Ledger</option>
                    <option value="profit_and_loss">Profit & Loss</option>
                  </select>
                </div>
                <Button
                  onClick={handlePull}
                  disabled={pullTransactions.isPending || !startDate || !endDate}
                >
                  {pullTransactions.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Pull from QuickBooks
                </Button>
              </div>
            )}
          </div>

          {/* All Connections Overview */}
          {connections.length > 0 && !selectedOrgId && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Connected Organizations</h2>
              <div className="space-y-2">
                {connections.map((conn: any) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-md cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => setSelectedOrgId(conn.org_id)}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {conn.organization?.name || 'Unknown Org'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          QB Company: {conn.company_name || conn.realm_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Connected</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {pullTransactions.isPending && (
            <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground">Pulling data from QuickBooks...</p>
            </div>
          )}

          {/* Results */}
          {reportData && !pullTransactions.isPending && (
            <div className="space-y-6">

              {/* Chart of Accounts */}
              {reportData.accounts && reportData.accounts.length > 0 && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('accounts')}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
                  >
                    <h2 className="text-lg font-semibold text-foreground">
                      Chart of Accounts ({reportData.accounts.length})
                    </h2>
                    {expandedSections['accounts'] ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  {expandedSections['accounts'] && (
                    <div className="border-t border-border">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-secondary/50">
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Sub-Type</th>
                              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Balance</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Active</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {reportData.accounts.map((acct: any) => (
                              <tr key={acct.Id} className="hover:bg-secondary/20">
                                <td className="px-4 py-2 text-foreground font-medium">
                                  {acct.FullyQualifiedName || acct.Name}
                                </td>
                                <td className="px-4 py-2 text-muted-foreground">{acct.AccountType}</td>
                                <td className="px-4 py-2 text-muted-foreground">{acct.AccountSubType || '—'}</td>
                                <td className="px-4 py-2 text-foreground text-right font-mono">
                                  {acct.CurrentBalance != null
                                    ? `$${Number(acct.CurrentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                    : '—'}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    acct.Active
                                      ? 'bg-green-500/10 text-green-600'
                                      : 'bg-red-500/10 text-red-600'
                                  }`}>
                                    {acct.Active ? 'Yes' : 'No'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Report Data */}
              {reportData.report && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('report')}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
                  >
                    <h2 className="text-lg font-semibold text-foreground">
                      {reportType === 'profit_and_loss' ? 'Profit & Loss' : 'General Ledger'}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {reportData.date_range.start_date} to {reportData.date_range.end_date}
                      </span>
                    </h2>
                    {expandedSections['report'] ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  {expandedSections['report'] && (
                    <div className="border-t border-border p-6">
                      <ReportDisplay report={reportData.report} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!selectedOrgId && connections.length === 0 && !loadingConnections && (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <ArrowLeftRight className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">QuickBooks Transactions</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Select a client organization above to connect their QuickBooks account and pull transaction data.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Disconnect confirmation */}
      <ConfirmDialog
        open={!!disconnectId}
        onOpenChange={(open) => !open && setDisconnectId(null)}
        title="Disconnect QuickBooks"
        description="Are you sure you want to disconnect this QuickBooks connection? You can reconnect later."
        confirmLabel="Disconnect"
        onConfirm={handleDisconnect}
        variant="destructive"
      />
    </div>
  )
}

/**
 * Renders QB report data (General Ledger or P&L) as a readable table.
 * QB reports come in a nested Header/Rows/Columns structure.
 */
function ReportDisplay({ report }: { report: any }) {
  // QB reports have a Columns + Rows structure
  const columns = report?.Columns?.Column || []
  const rows = report?.Rows?.Row || []

  if (columns.length === 0 && rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No report data available for the selected date range.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary/50">
            {columns.map((col: any, i: number) => (
              <th
                key={i}
                className={`px-4 py-2 font-medium text-muted-foreground ${
                  col.ColType === 'Money' ? 'text-right' : 'text-left'
                }`}
              >
                {col.ColTitle || col.ColType}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row: any, i: number) => (
            <ReportRow key={i} row={row} depth={0} columnCount={columns.length} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReportRow({ row, depth, columnCount }: { row: any; depth: number; columnCount: number }) {
  // QB rows can be: Data rows, Section headers, or nested groups
  if (row.type === 'Section' || row.Rows) {
    const headerCols = row.Header?.ColData || []
    const childRows = row.Rows?.Row || []
    const summaryCols = row.Summary?.ColData || []

    return (
      <>
        {/* Section header */}
        {headerCols.length > 0 && (
          <tr className="bg-secondary/30">
            {headerCols.map((col: any, i: number) => (
              <td
                key={i}
                className={`px-4 py-2 font-semibold text-foreground ${i === 0 ? '' : 'text-right'}`}
                style={i === 0 ? { paddingLeft: `${depth * 16 + 16}px` } : undefined}
              >
                {col.value || ''}
              </td>
            ))}
            {/* Fill remaining columns if header has fewer */}
            {Array.from({ length: Math.max(0, columnCount - headerCols.length) }).map((_, i) => (
              <td key={`fill-${i}`} />
            ))}
          </tr>
        )}
        {/* Child rows */}
        {childRows.map((childRow: any, i: number) => (
          <ReportRow key={i} row={childRow} depth={depth + 1} columnCount={columnCount} />
        ))}
        {/* Section summary / total */}
        {summaryCols.length > 0 && (
          <tr className="bg-secondary/20 font-medium">
            {summaryCols.map((col: any, i: number) => (
              <td
                key={i}
                className={`px-4 py-2 text-foreground ${i === 0 ? '' : 'text-right font-mono'}`}
                style={i === 0 ? { paddingLeft: `${depth * 16 + 16}px` } : undefined}
              >
                {col.value || ''}
              </td>
            ))}
          </tr>
        )}
      </>
    )
  }

  // Data row
  const cols = row.ColData || []
  return (
    <tr className="hover:bg-secondary/20">
      {cols.map((col: any, i: number) => (
        <td
          key={i}
          className={`px-4 py-2 ${i === 0 ? 'text-foreground' : 'text-foreground text-right font-mono'}`}
          style={i === 0 ? { paddingLeft: `${depth * 16 + 16}px` } : undefined}
        >
          {col.value || ''}
        </td>
      ))}
    </tr>
  )
}
