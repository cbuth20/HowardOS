'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { HowardLogo } from '@/components/ui/HowardLogo'
import { User, Upload, X, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface WelcomeModalProps {
  isOpen: boolean
  onComplete: () => void
  user: {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'client'
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

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
      return null
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

      // Update profile
      const updateData: {
        full_name: string
        is_onboarded: boolean
        avatar_url?: string
      } = {
        full_name: fullName,
        is_onboarded: true,
      }

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl
      }

      // @ts-ignore - Database types not properly inferred
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) throw error

      toast.success('Welcome to HowardOS!')
      onComplete()
    } catch (error: any) {
      console.error('Error completing onboarding:', error)
      toast.error('Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title=""
      size="lg"
      hideCloseButton
    >
      <div className="text-center">
        {/* Welcome Step */}
        {step === 1 && (
          <div className="py-8">
            <div className="flex justify-center mb-6">
              <HowardLogo variant="full" showText={false} />
            </div>
            <div className="mb-6">
              <Sparkles className="w-12 h-12 mx-auto text-brand-primary mb-4" />
              <h2 className="text-3xl font-bold font-serif text-brand-navy mb-3">
                Welcome to HowardOS!
              </h2>
              <p className="text-lg text-text-muted mb-2">
                {orgName}
              </p>
              <p className="text-text-muted max-w-md mx-auto">
                {user.role === 'admin'
                  ? "You're all set up as an administrator. Let's personalize your profile to get started."
                  : "We're excited to have you on board. Let's set up your profile to get started."}
              </p>
            </div>

            <div className="bg-background-elevated rounded-lg p-6 max-w-md mx-auto mb-6">
              <div className="flex items-center gap-4 text-left">
                <Avatar
                  name={user.full_name || user.email}
                  email={user.email}
                  role={user.role}
                  size="lg"
                />
                <div>
                  <p className="font-semibold text-text-primary">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-sm text-text-muted">{user.email}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-brand-navy/20 text-brand-navy'
                        : 'bg-brand-slate/20 text-brand-slate'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => setStep(2)}
              className="min-w-[200px]"
            >
              Get Started
            </Button>
          </div>
        )}

        {/* Profile Setup Step */}
        {step === 2 && (
          <div className="py-6">
            <h2 className="text-2xl font-bold font-serif text-brand-navy mb-2">
              Personalize Your Profile
            </h2>
            <p className="text-text-muted mb-8">
              Add a photo and update your name so your team can recognize you
            </p>

            <div className="space-y-6 max-w-md mx-auto text-left">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4 pb-6 border-b border-neutral-border">
                <Avatar
                  name={fullName || user.email}
                  email={user.email}
                  role={user.role}
                  src={avatarPreview || undefined}
                  size="xl"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
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
                <p className="text-xs text-text-muted">
                  Square image recommended, max 5MB
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-text-primary mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
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
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-background-muted"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-neutral-border">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="primary"
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
    </Modal>
  )
}
