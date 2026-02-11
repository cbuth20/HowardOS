'use client'

import { useState } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail, User, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { authFetch } from '@/lib/utils/auth-fetch'
import toast from 'react-hot-toast'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  orgId?: string
  organizations?: Array<{ id: string; name: string }>
}

export function InviteUserModal({ isOpen, onClose, onComplete, orgId, organizations }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'client'>('client')
  const [loading, setLoading] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState(orgId || '')

  const supabase = createClient()

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
        if (role === 'admin') {
          // For admin role, use current user's org_id
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

      // Call API to create user invitation
      const response = await authFetch('/api/users-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          role,
          orgId: resolvedOrgId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to invite user')
      }

      toast.success(`Invitation sent to ${email}`)
      onComplete()
      resetForm()
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
    setRole('client')
    setSelectedOrgId(orgId || '')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite New User" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
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

        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-text-primary mb-2">
            Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
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

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            <Shield className="inline-block w-4 h-4 mr-1 mb-1" />
            Role *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('client')}
              disabled={loading}
              className={`p-4 rounded-lg border-2 transition-all ${
                role === 'client'
                  ? 'border-brand-primary bg-brand-primary/10'
                  : 'border-neutral-border bg-white hover:border-brand-primary/50'
              } disabled:opacity-50`}
            >
              <div className="text-center">
                <User className="w-6 h-6 mx-auto mb-2 text-brand-slate" />
                <p className="font-semibold text-text-primary">Client</p>
                <p className="text-xs text-text-muted mt-1">
                  View files and tasks
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('admin')}
              disabled={loading}
              className={`p-4 rounded-lg border-2 transition-all ${
                role === 'admin'
                  ? 'border-brand-navy bg-brand-navy/10'
                  : 'border-neutral-border bg-white hover:border-brand-navy/50'
              } disabled:opacity-50`}
            >
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-brand-navy" />
                <p className="font-semibold text-text-primary">Admin</p>
                <p className="text-xs text-text-muted mt-1">
                  Full access & management
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Organization Selector (when no orgId prop and role is client) */}
        {!orgId && role === 'client' && organizations && organizations.length > 0 && (
          <div>
            <label htmlFor="orgSelect" className="block text-sm font-medium text-text-primary mb-2">
              Organization *
            </label>
            <select
              id="orgSelect"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              required
              disabled={loading}
              className="w-full border border-neutral-border rounded-md px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="">Select an organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 bg-state-info-light rounded-lg border border-brand-primary/20">
          <p className="text-sm text-text-primary">
            <strong>Note:</strong> An invitation email will be sent to {email || 'the user'} with instructions to set up their account.
          </p>
        </div>

        {/* Actions */}
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
