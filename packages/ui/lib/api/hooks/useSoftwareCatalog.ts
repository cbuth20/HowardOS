import { useQuery } from '@tanstack/react-query'
import { createClient } from '../../supabase/client'

interface SoftwareItem {
  id: string
  name: string
  category: string | null
}

export function useSoftwareCatalog() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['software-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('software_catalog')
        .select('id, name, category')
        .order('name')

      if (error) throw error
      return (data || []) as SoftwareItem[]
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes — reference data
  })
}
