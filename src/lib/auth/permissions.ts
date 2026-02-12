import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type File = Database['public']['Tables']['files']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

type UserRole = Profile['role']

// =====================================================
// Role hierarchy helpers
// =====================================================

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'admin'
}

export function isManager(profile: Profile | null): boolean {
  return profile?.role === 'manager'
}

export function isAdminOrManager(profile: Profile | null): boolean {
  return profile?.role === 'admin' || profile?.role === 'manager'
}

export function isTeamMember(profile: Profile | null): boolean {
  return profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'user'
}

export function isClient(profile: Profile | null): boolean {
  return profile?.role === 'client'
}

export function isClientNoAccess(profile: Profile | null): boolean {
  return profile?.role === 'client_no_access'
}

export function isTeamUser(profile: Profile | null): boolean {
  return profile?.role === 'user'
}

/**
 * Check if user belongs to the same org as the resource
 */
export function isSameOrg(profile: Profile | null, orgId: string): boolean {
  return profile?.org_id === orgId
}

/**
 * Check if a team 'user' can access a given org based on allowed_org_ids
 * Empty allowed_org_ids means access to all orgs
 */
export function canTeamUserAccessOrg(profile: Profile | null, orgId: string): boolean {
  if (!profile) return false
  if (profile.role !== 'user') return true // non-user roles handled elsewhere
  const allowed = profile.allowed_org_ids
  if (!allowed || allowed.length === 0) return true // empty = all access
  return allowed.includes(orgId)
}

/**
 * General org access check incorporating role hierarchy
 */
export function canAccessOrg(profile: Profile | null, orgId: string): boolean {
  if (!profile) return false
  if (isAdminOrManager(profile)) return true
  if (isTeamUser(profile)) return canTeamUserAccessOrg(profile, orgId)
  if (isClient(profile)) return isSameOrg(profile, orgId) // basic check; multi-org checked via user_organizations in DB
  return false
}

// =====================================================
// File permissions
// =====================================================

export function canAccessFile(
  profile: Profile | null,
  file: File
): boolean {
  if (!profile) return false
  if (isAdminOrManager(profile)) return true
  if (isTeamUser(profile)) return canTeamUserAccessOrg(profile, file.org_id)
  if (file.uploaded_by === profile.id) return true
  return isSameOrg(profile, file.org_id)
}

export function canEditFile(
  profile: Profile | null,
  file: File
): boolean {
  if (!profile) return false
  if (isAdminOrManager(profile)) return true
  if (file.uploaded_by === profile.id) return true
  return false
}

export function canDeleteFile(
  profile: Profile | null,
  file: File
): boolean {
  if (!profile) return false
  return isAdminOrManager(profile)
}

// =====================================================
// Task permissions
// =====================================================

export function canAccessTask(
  profile: Profile | null,
  task: Task
): boolean {
  if (!profile) return false
  if (isAdminOrManager(profile)) return true
  if (isTeamUser(profile)) return canTeamUserAccessOrg(profile, task.org_id)
  if (isClient(profile)) return task.assigned_to === profile.id || task.created_by === profile.id
  return false
}

export function canEditTask(
  profile: Profile | null,
  task: Task
): boolean {
  if (!profile) return false
  if (isAdminOrManager(profile)) return true
  if (isTeamUser(profile)) return canTeamUserAccessOrg(profile, task.org_id)
  if (task.created_by === profile.id) return true
  if (task.assigned_to === profile.id) return true
  return false
}

export function canDeleteTask(
  profile: Profile | null,
  task: Task
): boolean {
  if (!profile) return false
  if (isAdminOrManager(profile)) return true
  if (isClient(profile) && task.created_by === profile.id) return true
  return false
}

export function canAssignTaskTo(
  profile: Profile | null,
  assigneeId: string,
  assigneeRole: UserRole
): boolean {
  if (!profile) return false
  if (isAdminOrManager(profile)) return true
  if (isTeamUser(profile)) return true // team users can assign within their access
  if (isClient(profile)) {
    return assigneeId === profile.id || assigneeRole === 'admin' || assigneeRole === 'manager'
  }
  return false
}

// =====================================================
// Management permissions
// =====================================================

export function canManageUsers(profile: Profile | null): boolean {
  return isAdminOrManager(profile)
}

export function canManageOrg(profile: Profile | null): boolean {
  return isAdminOrManager(profile)
}

export function canManageRoles(profile: Profile | null): boolean {
  return isAdmin(profile) // only full admin can change roles
}

export function canManageWorkstreamTemplates(profile: Profile | null): boolean {
  return isAdminOrManager(profile)
}

export function canAssignWorkstreams(profile: Profile | null): boolean {
  return isAdminOrManager(profile)
}

export function canViewClientWorkstream(
  profile: Profile | null,
  workstream: { org_id: string }
): boolean {
  if (!profile) return false
  if (isAdminOrManager(profile)) return true
  if (isTeamUser(profile)) return canTeamUserAccessOrg(profile, workstream.org_id)
  return isSameOrg(profile, workstream.org_id)
}

export function canEditWorkstreamStatus(profile: Profile | null): boolean {
  return isAdminOrManager(profile)
}

// =====================================================
// Role display helpers
// =====================================================

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  user: 'User',
  client: 'Client',
  client_no_access: 'Client (No Access)',
}

export const TEAM_ROLES: UserRole[] = ['admin', 'manager', 'user']
export const CLIENT_ROLES: UserRole[] = ['client', 'client_no_access']
export const ALL_ROLES: UserRole[] = ['admin', 'manager', 'user', 'client', 'client_no_access']
