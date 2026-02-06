'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { User, Lock, Loader2 } from 'lucide-react'
import { useUpdateUserProfile, useChangePassword } from '@/lib/api/hooks'

interface ProfileData {
  full_name: string | null
  email: string
  avatar_url: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile update state
  const [fullName, setFullName] = useState('')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const supabase = createClient()

  // Use TanStack Query hooks
  const updateProfile = useUpdateUserProfile()
  const changePassword = useChangePassword()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await (supabase as any)
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim() || undefined,
      })
      loadProfile()
    } catch (error) {
      // Error already handled by mutation hook
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
        confirmPassword,
      })

      // Clear form on success
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      // Error already handled by mutation hook
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sticky Topbar */}
      <div className="flex-shrink-0 bg-white border-b border-neutral-border shadow-sm">
        <div className="px-8 py-4">
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            Settings
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl space-y-6">
          {/* Profile Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-border">
            <div className="p-6 border-b border-neutral-border">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-brand-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Profile Settings</h2>
                  <p className="text-sm text-text-muted mt-1">
                    Update your personal information and avatar
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
              {/* Avatar - Display only */}
              <div className="flex items-center gap-4 pb-4 border-b border-neutral-border">
                <Avatar
                  name={fullName || profile?.email || ''}
                  email={profile?.email || ''}
                  src={profile?.avatar_url || undefined}
                  size="xl"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Profile Picture</p>
                  <p className="text-xs text-text-muted mt-1">
                    Contact your administrator to change your avatar
                  </p>
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-background-elevated"
                />
                <p className="text-xs text-text-muted mt-1">
                  Contact your administrator to change your email
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-text-primary mb-2">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={updateProfile.isPending}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t border-neutral-border">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-border">
            <div className="p-6 border-b border-neutral-border">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-brand-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Change Password</h2>
                  <p className="text-sm text-text-muted mt-1">
                    Update your password to keep your account secure
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
              {/* Current Password */}
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-text-primary mb-2">
                  Current Password
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  disabled={changePassword.isPending}
                />
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-text-primary mb-2">
                  New Password
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  disabled={changePassword.isPending}
                />
                <p className="text-xs text-text-muted mt-1">
                  Must be at least 6 characters
                </p>
              </div>

              {/* Confirm New Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  disabled={changePassword.isPending}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t border-neutral-border">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={changePassword.isPending}
                >
                  {changePassword.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
