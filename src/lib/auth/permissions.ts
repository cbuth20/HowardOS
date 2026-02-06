import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type File = Database['public']['Tables']['files']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

/**
 * Check if user is an admin
 */
export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'admin'
}

/**
 * Check if user is a client
 */
export function isClient(profile: Profile | null): boolean {
  return profile?.role === 'client'
}

/**
 * Check if user belongs to the same org as the resource
 */
export function isSameOrg(profile: Profile | null, orgId: string): boolean {
  return profile?.org_id === orgId
}

/**
 * Check if user can access a file
 */
export function canAccessFile(
  profile: Profile | null,
  file: File
): boolean {
  if (!profile) return false

  // Must be in same org
  if (!isSameOrg(profile, file.org_id)) return false

  // Admins can access all files in their org
  if (isAdmin(profile)) return true

  // Users can access files they uploaded
  if (file.uploaded_by === profile.id) return true

  // Additional permission checks would go here
  // (e.g., checking file_permissions table)

  return true // For now, allow all users in same org
}

/**
 * Check if user can edit a file
 */
export function canEditFile(
  profile: Profile | null,
  file: File
): boolean {
  if (!profile) return false

  // Must be in same org
  if (!isSameOrg(profile, file.org_id)) return false

  // Admins can edit all files in their org
  if (isAdmin(profile)) return true

  // Users can edit files they uploaded
  if (file.uploaded_by === profile.id) return true

  return false
}

/**
 * Check if user can delete a file
 */
export function canDeleteFile(
  profile: Profile | null,
  file: File
): boolean {
  if (!profile) return false

  // Must be in same org
  if (!isSameOrg(profile, file.org_id)) return false

  // Only admins can delete files
  return isAdmin(profile)
}

/**
 * Check if user can access a task
 */
export function canAccessTask(
  profile: Profile | null,
  task: Task
): boolean {
  if (!profile) return false

  // Must be in same org
  return isSameOrg(profile, task.org_id)
}

/**
 * Check if user can edit a task
 */
export function canEditTask(
  profile: Profile | null,
  task: Task
): boolean {
  if (!profile) return false

  // Must be in same org
  if (!isSameOrg(profile, task.org_id)) return false

  // Admins can edit all tasks
  if (isAdmin(profile)) return true

  // Users can edit tasks they created
  if (task.created_by === profile.id) return true

  // Users can edit tasks assigned to them
  if (task.assigned_to === profile.id) return true

  return false
}

/**
 * Check if user can delete a task
 */
export function canDeleteTask(
  profile: Profile | null,
  task: Task
): boolean {
  if (!profile) return false

  // Must be in same org
  if (!isSameOrg(profile, task.org_id)) return false

  // Admins can delete all tasks
  if (isAdmin(profile)) return true

  // Clients can only delete tasks they created
  if (isClient(profile) && task.created_by === profile.id) return true

  return false
}

/**
 * Check if user can assign a task to a specific user
 */
export function canAssignTaskTo(
  profile: Profile | null,
  assigneeId: string,
  assigneeRole: 'admin' | 'client'
): boolean {
  if (!profile) return false

  // Admins can assign to anyone
  if (isAdmin(profile)) return true

  // Clients can only assign to themselves or admins
  if (isClient(profile)) {
    return assigneeId === profile.id || assigneeRole === 'admin'
  }

  return false
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(profile: Profile | null): boolean {
  return isAdmin(profile)
}

/**
 * Check if user can manage organization settings
 */
export function canManageOrg(profile: Profile | null): boolean {
  return isAdmin(profile)
}
