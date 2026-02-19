'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { HowardAvatar } from '../ui/howard-avatar'
import { HowardLogo } from '../ui/howard-logo'
import { User, Upload, X, Sparkles, Building2, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { authFetch } from '../../lib/utils/auth-fetch'
import { toast } from 'sonner'

interface WelcomeModalProps {
  isOpen: boolean
  onComplete: () => void
  user: {
    id: string
    email: string
    full_name: string
    role: string
  }
  orgName: string
}

export function WelcomeModal({ isOpen, onComplete, user, orgName }: WelcomeModalProps) {
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState(user.full_name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password step state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const supabase = createClient() as any

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
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null

    try {
      const fileExt = avatarFile.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        })

      if (uploadError) throw uploadError

      // Return the proxy URL instead of public URL
      // Format: /api/storage-avatar?path={filePath}
      return `/api/storage-avatar?path=${encodeURIComponent(filePath)}`
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
      return null
    }
  }

  const handlePasswordSubmit = async () => {
    setPasswordError('')

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated successfully')
      setStep(3)
    } catch (error: any) {
      console.error('Error updating password:', error)
      setPasswordError(error.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)

    try {
      // Upload avatar if selected
      let avatarUrl = null
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
      }

      // Update profile via API (bypasses RLS)
      const updateData: Record<string, any> = {
        full_name: fullName,
        is_onboarded: true,
      }

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl
      }

      const response = await authFetch(`/api/users-update-profile?id=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to save profile' }))
        throw new Error(err.error || 'Failed to save profile')
      }

      toast.success('Welcome to HowardOS!')
      onComplete()
    } catch (error: any) {
      console.error('Error completing onboarding:', error)
      toast.error(error.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden">
        <div className="text-center">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="py-8">
              <div className="flex justify-center mb-6">
                <HowardLogo variant="full" showText={false} />
              </div>
              <div className="mb-6">
                <Sparkles className="w-12 h-12 mx-auto text-primary mb-4" />
                <h2 className="text-3xl font-bold font-serif text-foreground mb-3">
                  Welcome to HowardOS!
                </h2>
                <p className="text-lg text-muted-foreground mb-2">
                  {orgName}
                </p>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {user.role === 'admin'
                    ? "You're all set up as an administrator. Let's personalize your profile to get started."
                    : "We're excited to have you on board. Let's set up your profile to get started."}
                </p>
              </div>

              <div className="bg-secondary rounded-lg p-6 max-w-md mx-auto mb-6">
                <div className="flex items-center gap-4 text-left">
                  <HowardAvatar
                    name={user.full_name || user.email}
                    email={user.email}
                    role={user.role}
                    size="lg"
                  />
                  <div>
                    <p className="font-semibold text-foreground">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-howard-ink/20 text-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => setStep(2)}
                className="min-w-[200px]"
              >
                Get Started
              </Button>
            </div>
          )}

          {/* Step 2: Set Password */}
          {step === 2 && (
            <div className="py-6">
              <Lock className="w-10 h-10 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold font-serif text-foreground mb-2">
                Secure Your Account
              </h2>
              <p className="text-muted-foreground mb-8">
                Replace your temporary password with a secure one you'll remember
              </p>

              <div className="space-y-4 max-w-md mx-auto text-left">
                {/* New Password */}
                <div>
                  <Label htmlFor="newPassword" className="mb-2">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="At least 8 characters"
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <Label htmlFor="confirmPassword" className="mb-2">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="Re-enter your password"
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handlePasswordSubmit}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="min-w-[150px]"
                >
                  {loading ? 'Updating...' : 'Set Password'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Profile Setup */}
          {step === 3 && (
            <div className="py-6">
              <h2 className="text-2xl font-bold font-serif text-foreground mb-2">
                Personalize Your Profile
              </h2>
              <p className="text-muted-foreground mb-8">
                Add a photo and update your name so your team can recognize you
              </p>

              <div className="space-y-6 max-w-md mx-auto text-left">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4 pb-6 border-b border-border">
                  <HowardAvatar
                    name={fullName || user.email}
                    email={user.email}
                    role={user.role}
                    src={avatarPreview || undefined}
                    size="xl"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {avatarPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    Square image recommended, max 5MB
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <Label htmlFor="fullName" className="mb-2">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <Label className="mb-2">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                {/* Organization (read-only) */}
                {orgName && (
                  <div>
                    <Label className="mb-2">
                      Organization
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        value={orgName}
                        disabled
                        className="bg-muted pl-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={loading || !fullName.trim()}
                  className="min-w-[150px]"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
