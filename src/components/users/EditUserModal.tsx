'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { User, Mail, Shield, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    email: string
    full_name: string | null
    role: 'admin' | 'client'
    is_active: boolean
    avatar_url: string | null
  }
  onComplete: () => void
}

export function EditUserModal({ isOpen, onClose, user, onComplete }: EditUserModalProps) {
  const [fullName, setFullName] = useState(user.full_name || '')
  const [role, setRole] = useState<'admin' | 'client'>(user.role)
  const [isActive, setIsActive] = useState(user.is_active)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url)
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setAvatarFile(file)

    // Create preview
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
    if (!avatarFile) return avatarPreview

    setUploadingAvatar(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`
      const filePath = `${user.id}/avatar.${fileExt}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return data.publicUrl
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
      // Upload avatar if changed
      let avatarUrl = avatarPreview
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
        if (!avatarUrl) {
          setLoading(false)
          return
        }
      }

      // Update user profile
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          full_name: fullName,
          role,
          is_active: isActive,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('User updated successfully')
      onComplete()
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error(error.message || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-4 pb-6 border-b border-neutral-border">
          <Avatar
            name={fullName || user.email}
            email={user.email}
            role={role}
            src={avatarPreview || undefined}
            size="xl"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingAvatar}
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
                disabled={loading || uploadingAvatar}
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
          <p className="text-xs text-text-muted text-center">
            Recommended: Square image, max 5MB
          </p>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
            <Input
              type="email"
              value={user.email}
              disabled
              className="pl-10 bg-background-muted"
            />
          </div>
          <p className="text-xs text-text-muted mt-1">Email cannot be changed</p>
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

        {/* Active Status */}
        <div className="flex items-center justify-between p-4 bg-background-elevated rounded-lg border border-neutral-border">
          <div>
            <p className="font-medium text-text-primary">Account Status</p>
            <p className="text-sm text-text-muted">
              {isActive ? 'User can access the system' : 'User account is disabled'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-state-success' : 'bg-neutral-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading || uploadingAvatar}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || uploadingAvatar}
          >
            {loading || uploadingAvatar ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
