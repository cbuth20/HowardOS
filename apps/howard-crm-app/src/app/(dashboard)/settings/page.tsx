'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@howard/ui/lib/api/hooks/useProfile'
import { Button } from '@howard/ui/components/ui/button'
import { Input } from '@howard/ui/components/ui/input'
import { Label } from '@howard/ui/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@howard/ui/components/ui/card'
import { Separator } from '@howard/ui/components/ui/separator'
import { HowardAvatar } from '@howard/ui/components/ui/howard-avatar'
import { Switch } from '@howard/ui/components/ui/switch'
import { User, Lock, Bell, Loader2 } from 'lucide-react'
import { useUpdateUserProfile, useChangePassword, useNotificationPreferences, useUpdateNotificationPreferences } from '@howard/ui/lib/api/hooks'

export default function SettingsPage() {
  const { profile, isLoading: loading, refreshProfile } = useProfile()

  // Profile update state
  const [fullName, setFullName] = useState('')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Use TanStack Query hooks
  const updateProfile = useUpdateUserProfile()
  const changePassword = useChangePassword()
  const { data: notifPrefs, isLoading: notifLoading } = useNotificationPreferences()
  const updateNotifPrefs = useUpdateNotificationPreferences()

  // Sync fullName when profile loads/changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
    }
  }, [profile])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim() || undefined,
      })
      refreshProfile()
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sticky Topbar */}
      <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
        <div className="px-8 py-4">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Profile Settings</CardTitle>
                  <CardDescription>
                    Update your personal information and avatar
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Avatar - Display only */}
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <HowardAvatar
                    name={fullName || profile?.email || ''}
                    email={profile?.email || ''}
                    src={profile?.avatar_url || undefined}
                    size="xl"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile Picture</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Contact your administrator to change your avatar
                    </p>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-secondary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact your administrator to change your email
                  </p>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
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
                <Separator />
                <div className="flex justify-end">
                  <Button
                    type="submit"
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
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Email Notifications</CardTitle>
                  <CardDescription>
                    Choose which email notifications you receive
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {notifLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { key: 'task_assigned' as const, label: 'Task Assigned', description: 'When a task is assigned to you' },
                    { key: 'task_status_changed' as const, label: 'Status Changes', description: 'When a task you created or are assigned to changes status' },
                    { key: 'task_comment_added' as const, label: 'New Comments', description: 'When someone comments on your tasks' },
                    { key: 'task_mentioned' as const, label: 'Mentions', description: 'When someone @mentions you in a comment' },
                    { key: 'file_uploaded' as const, label: 'File Uploads', description: 'When files are uploaded to your channels' },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                      <Switch
                        checked={notifPrefs?.[key] ?? true}
                        onCheckedChange={(checked) => {
                          updateNotifPrefs.mutate({ [key]: checked })
                        }}
                        disabled={updateNotifPrefs.isPending}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    disabled={changePassword.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
                <Separator />
                <div className="flex justify-end">
                  <Button
                    type="submit"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
