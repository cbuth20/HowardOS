'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@howard/ui/components/ui/dialog'
import { Button } from '@howard/ui/components/ui/button'
import { Input } from '@howard/ui/components/ui/input'
import { Label } from '@howard/ui/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@howard/ui/components/ui/select'
import { HowardAvatar } from '@howard/ui/components/ui/howard-avatar'
import { HowardBadge } from '@howard/ui/components/ui/howard-badge'
import { Switch } from '@howard/ui/components/ui/switch'
import { User, Mail, Shield, Upload, X, Plus, Building2, Users, UserX, Briefcase } from 'lucide-react'
import { createClient } from '@howard/ui/lib/supabase/client'
import { authFetch } from '@howard/ui/lib/utils/auth-fetch'
import { toast } from 'sonner'

const ROLE_OPTIONS = [
  { value: 'client', label: 'Client', icon: User },
  { value: 'client_no_access', label: 'Contact (No Login)', icon: UserX },
  { value: 'user', label: 'Team User', icon: Briefcase },
  { value: 'manager', label: 'Manager', icon: Users },
  { value: 'admin', label: 'Admin', icon: Shield },
] as const

interface OrgMembership {
  id: string
  org_id: string
  is_primary: boolean
  organization?: { id: string; name: string; slug: string }
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    email: string
    full_name: string | null
    role: string
    is_active: boolean
    avatar_url: string | null
  }
  onComplete: () => void
  organizations?: Array<{ id: string; name: string }>
}

export function EditUserModal({ isOpen, onClose, user, onComplete, organizations }: EditUserModalProps) {
  const [fullName, setFullName] = useState(user.full_name || '')
  const [role, setRole] = useState(user.role)
  const [isActive, setIsActive] = useState(user.is_active)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url)
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [orgMemberships, setOrgMemberships] = useState<OrgMembership[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [addOrgId, setAddOrgId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  // Fetch org memberships when modal opens
  useEffect(() => {
    if (isOpen && user.id) {
      fetchOrgMemberships()
    }
  }, [isOpen, user.id])

  // Reset state when user changes
  useEffect(() => {
    setFullName(user.full_name || '')
    setRole(user.role)
    setIsActive(user.is_active)
    setAvatarPreview(user.avatar_url)
    setAvatarFile(null)
  }, [user])

  const fetchOrgMemberships = async () => {
    setLoadingOrgs(true)
    try {
      const { data, error } = await (supabase as any)
        .from('user_organizations')
        .select('id, org_id, is_primary, organization:organizations(id, name, slug)')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })

      if (!error && data) {
        setOrgMemberships(data)
      }
    } catch (err) {
      console.error('Error fetching org memberships:', err)
    } finally {
      setLoadingOrgs(false)
    }
  }

  const handleAddOrg = async () => {
    if (!addOrgId) return
    try {
      const { error } = await (supabase as any)
        .from('user_organizations')
        .insert({ user_id: user.id, org_id: addOrgId, is_primary: orgMemberships.length === 0 })

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already a member of this organization')
        } else {
          throw error
        }
        return
      }

      toast.success('Organization added')
      setAddOrgId('')
      fetchOrgMemberships()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add organization')
    }
  }

  const handleRemoveOrg = async (membershipId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('user_organizations')
        .delete()
        .eq('id', membershipId)

      if (error) throw error
      toast.success('Organization removed')
      fetchOrgMemberships()
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove organization')
    }
  }

  const handleSetPrimary = async (membershipId: string) => {
    try {
      // Unset all primaries first
      await (supabase as any)
        .from('user_organizations')
        .update({ is_primary: false })
        .eq('user_id', user.id)

      // Set the new primary
      const { error } = await (supabase as any)
        .from('user_organizations')
        .update({ is_primary: true })
        .eq('id', membershipId)

      if (error) throw error
      toast.success('Primary organization updated')
      fetchOrgMemberships()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update primary organization')
    }
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return avatarPreview
    setUploadingAvatar(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type })
      if (uploadError) throw uploadError
      // Return the proxy URL instead of public URL
      return `/api/storage-avatar?path=${encodeURIComponent(filePath)}`
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
      return null
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let avatarUrl = avatarPreview
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
        if (!avatarUrl) { setLoading(false); return }
      }

      // Use API endpoint (supabaseAdmin) to avoid RLS recursion on profiles
      const response = await authFetch(`/api/users-update-profile?id=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          role,
          is_active: isActive,
          avatar_url: avatarUrl,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update user')
      }

      toast.success('User updated successfully')
      onComplete()
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error(error.message || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  // Orgs not yet assigned to this user
  const availableOrgs = (organizations || []).filter(
    org => !orgMemberships.some(m => m.org_id === org.id)
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
            <HowardAvatar
              name={fullName || user.email}
              email={user.email}
              role={role}
              src={avatarPreview || undefined}
              size="xl"
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading || uploadingAvatar}>
                <Upload className="w-4 h-4 mr-2" />
                {avatarPreview ? 'Change Photo' : 'Upload Photo'}
              </Button>
              {avatarPreview && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveAvatar} disabled={loading || uploadingAvatar}>
                  <X className="w-4 h-4 mr-2" />Remove
                </Button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
          </div>

          {/* Email (read-only) */}
          <div>
            <Label className="mb-2">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input type="email" value={user.email} disabled className="pl-10 bg-secondary" />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="editFullName" className="mb-2">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input id="editFullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required disabled={loading} className="pl-10" />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <Label className="mb-2">
              <Shield className="inline-block w-4 h-4 mr-1 mb-0.5" />
              Role *
            </Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Organization Memberships */}
          <div>
            <Label className="mb-2">
              <Building2 className="inline-block w-4 h-4 mr-1 mb-0.5" />
              Organizations
            </Label>
            <div className="space-y-2">
              {loadingOrgs ? (
                <p className="text-sm text-muted-foreground py-2">Loading...</p>
              ) : orgMemberships.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No organization memberships</p>
              ) : (
                orgMemberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 bg-secondary rounded-md border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{m.organization?.name || 'Unknown'}</span>
                      {m.is_primary && (
                        <HowardBadge variant="default" className="text-[10px] px-1.5 py-0">Primary</HowardBadge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!m.is_primary && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSetPrimary(m.id)}>
                          Set Primary
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleRemoveOrg(m.id)}>
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {/* Add org */}
              {availableOrgs.length > 0 && (
                <div className="flex gap-2 mt-2">
                  <Select value={addOrgId || undefined} onValueChange={setAddOrgId}>
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Add organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" size="sm" className="h-9" onClick={handleAddOrg} disabled={!addOrgId}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
            <div>
              <p className="font-medium text-sm text-foreground">Account Status</p>
              <p className="text-xs text-muted-foreground">
                {isActive ? 'User can access the system' : 'User account is disabled'}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} disabled={loading} />
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading || uploadingAvatar}>Cancel</Button>
            <Button type="submit" disabled={loading || uploadingAvatar}>
              {loading || uploadingAvatar ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
