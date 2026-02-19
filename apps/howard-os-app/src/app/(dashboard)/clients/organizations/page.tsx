'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@howard/ui/lib/api/hooks/useProfile'
import { createClient } from '@howard/ui/lib/supabase/client'

import { Button } from '@howard/ui/components/ui/button'
import { Input } from '@howard/ui/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@howard/ui/components/ui/accordion'
import { OrganizationUsers } from '@/components/clients/OrganizationUsers'
import { CreateOrganizationModal } from '@/components/clients/CreateOrganizationModal'
import { authFetch } from '@howard/ui/lib/utils/auth-fetch'
import {
  Building2,
  Loader2,
  Save,
  Upload,
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
  const { profile } = useProfile()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)
  const [defaultOpenOrg, setDefaultOpenOrg] = useState<string | undefined>(undefined)

  // Per-org settings state keyed by org id
  const [dashboardUrls, setDashboardUrls] = useState<Record<string, string>>({})
  const [savingUrlOrgId, setSavingUrlOrgId] = useState<string | null>(null)
  const [uploadingLogoOrgId, setUploadingLogoOrgId] = useState<string | null>(null)
  const [loadedOrgSettings, setLoadedOrgSettings] = useState<Set<string>>(new Set())

  const supabase = createClient()

  const currentProfile = profile ? { id: profile.id, org_id: profile.org_id, role: profile.role } : null
  const userRole = profile?.role || ''

  useEffect(() => {
    if (currentProfile) {
      loadOrganizations()
    }
  }, [profile])

  const loadOrganizations = async () => {
    try {
      const isAdminManager = ['admin', 'manager'].includes(currentProfile?.role || '')

      let query = (supabase as any).from('organizations').select('*').order('name')

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
              .from('user_organizations')
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

      // Client role with single org: auto-expand
      if (!isAdminManager && orgsWithCounts.length === 1) {
        setDefaultOpenOrg(orgsWithCounts[0].id)
      }
    } catch (error) {
      console.error('Error loading organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleDataChanged = () => {
    loadOrganizations()
  }

  const handleCreateComplete = () => {
    setShowCreateOrgModal(false)
    loadOrganizations()
  }

  const loadOrgSettings = async (orgId: string) => {
    if (loadedOrgSettings.has(orgId)) return

    const { data } = await (supabase as any)
      .from('profiles')
      .select('dashboard_iframe_url')
      .eq('org_id', orgId)
      .eq('role', 'client')
      .limit(1)
      .maybeSingle()

    setDashboardUrls(prev => ({ ...prev, [orgId]: data?.dashboard_iframe_url || '' }))
    setLoadedOrgSettings(prev => new Set(prev).add(orgId))
  }

  const handleAccordionChange = (value: string) => {
    if (value) {
      loadOrgSettings(value)
    }
  }

  // Also load settings when auto-expanding for client role
  useEffect(() => {
    if (defaultOpenOrg) {
      loadOrgSettings(defaultOpenOrg)
    }
  }, [defaultOpenOrg])

  const handleSaveDashboardUrl = async (org: Organization) => {
    setSavingUrlOrgId(org.id)
    try {
      const url = dashboardUrls[org.id] || ''
      const response = await authFetch('/api/organizations-update-dashboard-url', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: org.id,
          dashboardUrl: url.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update dashboard URL')
      }

      toast.success('Dashboard URL updated for all clients in this organization')
    } catch (error: any) {
      console.error('Error saving URL:', error)
      toast.error(error.message || 'Failed to save URL')
    } finally {
      setSavingUrlOrgId(null)
    }
  }

  const handleLogoUpload = async (org: Organization, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    setUploadingLogoOrgId(org.id)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `organizations/${org.id}/logo.${fileExt}`

      const { error: uploadError } = await (supabase as any).storage
        .from('logos')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      const logoUrl = `/api/storage-logo?path=${encodeURIComponent(filePath)}`

      const { error: updateError } = await (supabase as any)
        .from('organizations')
        .update({ logo_url: logoUrl })
        .eq('id', org.id)

      if (updateError) throw updateError

      toast.success('Logo uploaded successfully')
      handleDataChanged()
    } catch (error: any) {
      console.error('Logo upload error:', error)
      toast.error(error.message || 'Failed to upload logo')
    } finally {
      setUploadingLogoOrgId(null)
    }
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
            {isAdminManager && (
              <Button onClick={() => setShowCreateOrgModal(true)}>
                <Building2 className="w-4 h-4 mr-2" />
                New Organization
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl pb-8">
            {organizations.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No client organizations found</p>
              </div>
            ) : (
              <Accordion
                type="single"
                collapsible
                defaultValue={defaultOpenOrg}
                onValueChange={handleAccordionChange}
                className="space-y-3"
              >
                {organizations.map((org) => (
                  <AccordionItem
                    key={org.id}
                    value={org.id}
                    className="bg-card rounded-lg border border-border shadow-sm overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-4 flex-1">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div className="flex items-center gap-4 flex-1">
                          <span className="font-semibold text-foreground text-base">
                            {org.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {org._count?.users || 0} users · {org._count?.tasks || 0} tasks
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      {/* Settings Section — admin/manager only */}
                      {isAdminManager && (
                        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
                          <h3 className="text-sm font-medium text-foreground mb-3">Settings</h3>
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* Logo Upload */}
                            <div className="flex items-center gap-3">
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
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleLogoUpload(org, e)}
                                  disabled={uploadingLogoOrgId === org.id}
                                  className="hidden"
                                  id={`logo-upload-${org.id}`}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={uploadingLogoOrgId === org.id}
                                  onClick={() => document.getElementById(`logo-upload-${org.id}`)?.click()}
                                >
                                  {uploadingLogoOrgId === org.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      {org.logo_url ? 'Change Logo' : 'Upload Logo'}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Dashboard URL */}
                            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                              <Input
                                type="url"
                                value={dashboardUrls[org.id] ?? ''}
                                onChange={(e) => setDashboardUrls(prev => ({ ...prev, [org.id]: e.target.value }))}
                                placeholder="Dashboard URL (https://...)"
                                disabled={savingUrlOrgId === org.id}
                                className="font-mono text-sm flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveDashboardUrl(org)}
                                disabled={savingUrlOrgId === org.id}
                              >
                                {savingUrlOrgId === org.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Users Section */}
                      <OrganizationUsers
                        orgId={org.id}
                        orgName={org.name}
                        userRole={userRole}
                        currentProfile={currentProfile}
                        onDataChanged={handleDataChanged}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </div>

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
