'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { OrganizationDetailModal } from '@/components/clients/OrganizationDetailModal'
import { CreateOrganizationModal } from '@/components/clients/CreateOrganizationModal'
import {
  Building2,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  _count?: {
    users: number
    tasks: number
  }
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (currentProfile) {
      loadOrganizations()
    }
  }, [currentProfile])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()

      setCurrentProfile(data)
      setUserRole(data?.role || '')
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadOrganizations = async () => {
    try {
      const isAdminManager = ['admin', 'manager'].includes(currentProfile?.role)

      let query = (supabase as any).from('organizations').select('*').order('name')

      // Client/client_no_access: only their org
      if (!isAdminManager && currentProfile?.org_id) {
        query = query.eq('id', currentProfile.org_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching organizations:', error)
        throw error
      }

      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org: Organization) => {
          try {
            const { count: userCount } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('org_id', org.id)

            const { count: taskCount } = await supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('org_id', org.id)

            return {
              ...org,
              _count: { users: userCount || 0, tasks: taskCount || 0 }
            }
          } catch {
            return { ...org, _count: { users: 0, tasks: 0 } }
          }
        })
      )

      setOrganizations(orgsWithCounts)

      // For client/client_no_access: auto-open the single org
      if (!isAdminManager && orgsWithCounts.length === 1) {
        setSelectedOrg(orgsWithCounts[0])
        setShowOrgModal(true)
      }
    } catch (error) {
      console.error('Error loading organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org)
    setShowOrgModal(true)
  }

  const handleDataChanged = () => {
    loadOrganizations()
  }

  const handleCreateComplete = () => {
    setShowCreateOrgModal(false)
    loadOrganizations()
  }

  const isAdminManager = ['admin', 'manager'].includes(userRole)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Topbar */}
        <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Organizations
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdminManager ? 'Manage client organizations, dashboards, and users' : 'Your organization'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl space-y-4 pb-8">
            {isAdminManager && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowCreateOrgModal(true)}>
                  <Building2 className="w-4 h-4 mr-2" />
                  New Organization
                </Button>
              </div>
            )}

            {organizations.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No client organizations found</p>
              </div>
            ) : (
              organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className="w-full bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {org.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {org._count?.users || 0} users • {org._count?.tasks || 0} tasks
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Organization Detail Modal */}
      <OrganizationDetailModal
        organization={selectedOrg}
        isOpen={showOrgModal}
        onClose={() => {
          setShowOrgModal(false)
          setSelectedOrg(null)
        }}
        onDataChanged={handleDataChanged}
        userRole={userRole}
        currentProfile={currentProfile}
      />

      {/* Create Organization Modal */}
      {isAdminManager && (
        <CreateOrganizationModal
          isOpen={showCreateOrgModal}
          onClose={() => setShowCreateOrgModal(false)}
          onComplete={handleCreateComplete}
        />
      )}
    </>
  )
}
