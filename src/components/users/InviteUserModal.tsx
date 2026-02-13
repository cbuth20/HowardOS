'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Mail, User, Shield, Users, UserX, Briefcase, Lock, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/utils/auth-fetch'
import { toast } from 'sonner'

const ROLE_OPTIONS = [
  { value: 'client', label: 'Client', icon: User, description: 'View assigned tasks, files, and workstreams' },
  { value: 'client_no_access', label: 'Contact (No Login)', icon: UserX, description: 'For tagging and distributions only' },
  { value: 'user', label: 'Team User', icon: Briefcase, description: 'Team member with optional org restrictions' },
  { value: 'manager', label: 'Manager', icon: Users, description: 'Can manage users, clients, and most access' },
  { value: 'admin', label: 'Admin', icon: Shield, description: 'Full access to everything' },
] as const

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  orgId?: string
  organizations?: Array<{ id: string; name: string }>
  allowedRoles?: string[]
}

export function InviteUserModal({ isOpen, onClose, onComplete, orgId, organizations, allowedRoles }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [role, setRole] = useState('client')
  const [loading, setLoading] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState(orgId || '')
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [emailTags, setEmailTags] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')

  const supabase = createClient()
  const filteredRoleOptions = allowedRoles
    ? ROLE_OPTIONS.filter(r => allowedRoles.includes(r.value))
    : ROLE_OPTIONS
  const isTeamRole = ['admin', 'manager', 'user'].includes(role)
  const isClientRole = ['client', 'client_no_access'].includes(role)

  // Helper to derive full name from email
  const deriveNameFromEmail = (email: string): string => {
    const localPart = email.split('@')[0]
    const parts = localPart.split(/[._-]/)
    return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  }

  // Handle adding email tags
  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
      e.preventDefault()
      addEmailTag()
    } else if (e.key === 'Backspace' && emailInput === '' && emailTags.length > 0) {
      // Remove last tag if backspace on empty input
      setEmailTags(emailTags.slice(0, -1))
    }
  }

  const addEmailTag = () => {
    const trimmedEmail = emailInput.trim()
    if (!trimmedEmail) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Invalid email format')
      return
    }

    if (emailTags.includes(trimmedEmail)) {
      toast.error('Email already added')
      setEmailInput('')
      return
    }

    setEmailTags([...emailTags, trimmedEmail])
    setEmailInput('')
  }

  const removeEmailTag = (emailToRemove: string) => {
    setEmailTags(emailTags.filter(e => e !== emailToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Not authenticated')

      // Determine which org_id to use
      let resolvedOrgId = orgId || selectedOrgId

      // If no orgId provided (inviting from main Users tab)
      if (!resolvedOrgId) {
        if (isTeamRole) {
          // For team roles, use current user's org_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', currentUser.id)
            .single() as { data: { org_id: string } | null }

          if (!profile) throw new Error('Profile not found')
          resolvedOrgId = profile.org_id
        } else {
          // For client role, require org selection
          if (!selectedOrgId) {
            toast.error('Please select an organization')
            setLoading(false)
            return
          }
          resolvedOrgId = selectedOrgId
        }
      }

      // Bulk mode: send invitations for all email tags
      if (isBulkMode) {
        if (emailTags.length === 0) {
          toast.error('Please add at least one email')
          setLoading(false)
          return
        }

        let successCount = 0
        let failureCount = 0
        const errors: string[] = []

        for (const emailAddress of emailTags) {
          try {
            const derivedName = deriveNameFromEmail(emailAddress)
            const response = await authFetch('/api/users-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: emailAddress,
                fullName: derivedName,
                role,
                orgId: resolvedOrgId,
                tempPassword: tempPassword || undefined,
              }),
            })

            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Failed to invite user')
            }

            successCount++
          } catch (error: any) {
            failureCount++
            errors.push(`${emailAddress}: ${error.message}`)
          }
        }

        // Show summary
        if (successCount > 0) {
          const verb = role === 'client_no_access' ? 'Contacts created' : 'Invitations sent'
          toast.success(`${verb} for ${successCount} user${successCount > 1 ? 's' : ''}`)
        }
        if (failureCount > 0) {
          toast.error(`Failed to invite ${failureCount} user${failureCount > 1 ? 's' : ''}`)
          console.error('Bulk invite errors:', errors)
        }

        onComplete()
        resetForm()
      } else {
        // Single mode: send invitation for one user
        const response = await authFetch('/api/users-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            fullName,
            role,
            orgId: resolvedOrgId,
            tempPassword: tempPassword || undefined,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to invite user')
        }

        const verb = role === 'client_no_access' ? 'Contact created' : 'Invitation sent'
        toast.success(`${verb} for ${email}`)
        onComplete()
        resetForm()
      }
    } catch (error: any) {
      console.error('Error inviting user:', error)
      toast.error(error.message || 'Failed to invite user')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setFullName('')
    setTempPassword('')
    setRole('client')
    setSelectedOrgId(orgId || '')
    setIsBulkMode(false)
    setEmailTags([])
    setEmailInput('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const selectedRoleOption = filteredRoleOptions.find(r => r.value === role)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bulk Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
            <div>
              <Label htmlFor="bulkMode" className="font-medium">Bulk Invite Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Invite multiple users with the same settings</p>
            </div>
            <Switch
              id="bulkMode"
              checked={isBulkMode}
              onCheckedChange={setIsBulkMode}
              disabled={loading}
            />
          </div>

          {/* Email - Single Mode */}
          {!isBulkMode && (
            <div>
              <Label htmlFor="email" className="mb-2">
                Email Address *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {/* Email Tags - Bulk Mode */}
          {isBulkMode && (
            <div>
              <Label htmlFor="emailTags" className="mb-2">
                Email Addresses *
              </Label>
              <div className="min-h-[80px] p-2 border rounded-md focus-within:ring-2 focus-within:ring-ring">
                <div className="flex flex-wrap gap-2 mb-2">
                  {emailTags.map((emailTag, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                    >
                      <span>{emailTag}</span>
                      <button
                        type="button"
                        onClick={() => removeEmailTag(emailTag)}
                        disabled={loading}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Input
                  id="emailTags"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleEmailInputKeyDown}
                  onBlur={addEmailTag}
                  placeholder="Type email and press space or comma..."
                  disabled={loading}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Press space, comma, or enter to add each email. Names will be auto-generated from email addresses.
              </p>
            </div>
          )}

          {/* Full Name - Single Mode Only */}
          {!isBulkMode && (
            <div>
              <Label htmlFor="fullName" className="mb-2">
                Full Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {/* Temporary Password */}
          {role !== 'client_no_access' && (
            <div>
              <Label htmlFor="tempPassword" className="mb-2">
                Temporary Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="tempPassword"
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Example: Welcome123!"
                  disabled={loading}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Leave blank to auto-generate. Must have: 8+ chars, uppercase, special character (!@#$...)
              </p>
            </div>
          )}

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
                {filteredRoleOptions.map((option) => {
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
            {selectedRoleOption && (
              <p className="text-xs text-muted-foreground mt-1.5">{selectedRoleOption.description}</p>
            )}
          </div>

          {/* Organization Selector (when no orgId prop and role is client) */}
          {!orgId && isClientRole && organizations && organizations.length > 0 && (
            <div>
              <Label htmlFor="orgSelect" className="mb-2">
                Organization *
              </Label>
              <Select
                value={selectedOrgId || undefined}
                onValueChange={(value) => setSelectedOrgId(value)}
                required
                disabled={loading}
              >
                <SelectTrigger id="orgSelect"><SelectValue placeholder="Select an organization..." /></SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-foreground">
              {role === 'client_no_access' ? (
                <><strong>Note:</strong> {isBulkMode ? 'These contacts' : 'This contact'} will be created without login access. They can be used for tagging and email distributions.</>
              ) : (
                <><strong>Note:</strong> An invitation email will be sent to {isBulkMode ? 'each user' : (email || 'the user')} with instructions to set up their account.</>
              )}
            </p>
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : role === 'client_no_access'
                ? (isBulkMode ? 'Create Contacts' : 'Create Contact')
                : (isBulkMode ? 'Send Invitations' : 'Send Invitation')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
