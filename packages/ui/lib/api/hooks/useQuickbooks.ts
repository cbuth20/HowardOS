import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '../client'
import { toast } from 'sonner'

// Query keys
export const qbKeys = {
  all: ['quickbooks'] as const,
  connections: () => [...qbKeys.all, 'connections'] as const,
  connection: (orgId: string) => [...qbKeys.connections(), orgId] as const,
  accounts: (orgId: string) => [...qbKeys.all, 'accounts', orgId] as const,
  transactions: () => [...qbKeys.all, 'transactions'] as const,
}

export function useQuickbooksConnections(orgId?: string) {
  return useQuery({
    queryKey: orgId ? qbKeys.connection(orgId) : qbKeys.connections(),
    queryFn: async () => {
      const response = await apiClient.getQuickbooksConnections(orgId)
      return response.connections
    },
  })
}

export function useInitiateQuickbooksAuth() {
  return useMutation({
    mutationFn: (orgId: string) => apiClient.initiateQuickbooksAuth(orgId),
    onSuccess: (data) => {
      // Redirect to Intuit's OAuth page
      window.location.href = data.authUrl
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to start QuickBooks connection')
    },
  })
}

export function useDisconnectQuickbooks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteQuickbooksConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qbKeys.connections() })
      toast.success('QuickBooks disconnected')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to disconnect')
    },
  })
}

export function useTransactionAccounts(orgId: string) {
  return useQuery({
    queryKey: qbKeys.accounts(orgId),
    queryFn: async () => {
      const response = await apiClient.getTransactionAccounts(orgId)
      return response.accounts
    },
    enabled: !!orgId,
  })
}

export function usePullTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      org_id: string
      start_date: string
      end_date: string
      report_type?: 'general_ledger' | 'profit_and_loss'
    }) => apiClient.pullTransactions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qbKeys.transactions() })
      toast.success('Transactions pulled from QuickBooks')
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to pull transactions')
    },
  })
}
