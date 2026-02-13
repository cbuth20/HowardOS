import { z } from 'zod'

// Task schemas
export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled'])
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const RecurrenceFrequencySchema = z.enum(['weekly', 'monthly', 'quarterly'])

export const RecurrenceRuleSchema = z.object({
  frequency: RecurrenceFrequencySchema,
  interval: z.number().int().min(1).max(12).default(1),
  day_of_week: z.number().int().min(0).max(6).optional(),
  day_of_month: z.number().int().min(1).max(31).optional(),
})

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  target_org_id: z.string().uuid().optional(),
  is_internal: z.boolean().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: RecurrenceRuleSchema.optional().nullable(),
})

export const UpdateTaskSchema = CreateTaskSchema.partial()

// File schemas
export const UploadFileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
  mime_type: z.string().min(1, 'MIME type is required'),
  folder_path: z.string().default('/'),
  description: z.string().optional().nullable(),
  channel_id: z.string().uuid('Invalid channel ID').optional(),
})

export const ShareFileSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  userIds: z.array(z.string().uuid()).min(1, 'At least one user must be selected'),
  permission: z.enum(['view', 'edit', 'delete']).default('view'),
})

// File Channel schemas
export const CreateFileChannelSchema = z.object({
  client_org_id: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Channel name is required').max(200).optional(),
  description: z.string().optional().nullable(),
})

export const UpdateFileChannelSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
})

export const CreateChannelFolderSchema = z.object({
  channel_id: z.string().uuid('Invalid channel ID'),
  name: z.string().min(1, 'Folder name is required').max(200),
  parent_path: z.string().default('/'),
})

// User schemas
export const UserRoleSchema = z.enum(['admin', 'manager', 'user', 'client', 'client_no_access'])

export const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  role: UserRoleSchema,
  org_id: z.string().uuid('Invalid organization ID'),
  allowed_org_ids: z.array(z.string().uuid()).optional(),
  org_ids: z.array(z.string().uuid()).optional(),
  temp_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .optional(),
})

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  avatar_url: z.string().url('Invalid URL').optional().nullable(),
  metadata: z.record(z.any()).optional(),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Workstream schemas
export const WorkstreamTimingSchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad-hoc'])
export const WorkstreamStatusSchema = z.enum(['red', 'yellow', 'green'])

export const CreateWorkstreamTemplateSchema = z.object({
  vertical_id: z.string().uuid('Invalid vertical ID'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().optional().nullable(),
  associated_software: z.string().optional().nullable(),
  timing: WorkstreamTimingSchema.optional().nullable(),
  display_order: z.number().int().default(0),
  default_sop: z.any().optional().nullable(),
})

export const UpdateWorkstreamTemplateSchema = CreateWorkstreamTemplateSchema.partial()

// New entry-based workstream schemas
export const CreateWorkstreamSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1).max(200).default('Workstream'),
  notes: z.string().optional().nullable(),
})

export const UpdateWorkstreamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  notes: z.string().optional().nullable(),
})

export const CreateWorkstreamEntrySchema = z.object({
  workstream_id: z.string().uuid('Invalid workstream ID'),
  vertical_id: z.string().uuid('Invalid vertical ID'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().optional().nullable(),
  associated_software: z.string().optional().nullable(),
  timing: WorkstreamTimingSchema.optional().nullable(),
  point_person_id: z.string().uuid('Invalid user ID').optional().nullable(),
  status: WorkstreamStatusSchema.default('yellow'),
  notes: z.string().optional().nullable(),
  custom_sop: z.any().optional().nullable(),
  template_id: z.string().uuid('Invalid template ID').optional().nullable(),
  display_order: z.number().int().default(0),
})

export const UpdateWorkstreamEntrySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  associated_software: z.string().optional().nullable(),
  timing: WorkstreamTimingSchema.optional().nullable(),
  point_person_id: z.string().uuid('Invalid user ID').optional().nullable(),
  status: WorkstreamStatusSchema.optional(),
  notes: z.string().optional().nullable(),
  custom_sop: z.any().optional().nullable(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

export const BulkCreateEntriesSchema = z.object({
  workstream_id: z.string().uuid('Invalid workstream ID'),
  template_ids: z.array(z.string().uuid('Invalid template ID')).min(1, 'At least one template must be selected'),
})

// Legacy template assignment schemas (keeping for backward compatibility if needed)
export const AssignWorkstreamSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  org_id: z.string().uuid('Invalid organization ID'),
  status: WorkstreamStatusSchema.default('yellow'),
  point_person_id: z.string().uuid('Invalid user ID').optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const UpdateClientWorkstreamSchema = z.object({
  status: WorkstreamStatusSchema.optional(),
  point_person_id: z.string().uuid('Invalid user ID').optional().nullable(),
  custom_sop: z.any().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

// Export inferred types from schemas
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
export type UploadFileInput = z.infer<typeof UploadFileSchema>
export type ShareFileInput = z.infer<typeof ShareFileSchema>
export type InviteUserInput = z.infer<typeof InviteUserSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
export type CreateWorkstreamTemplateInput = z.infer<typeof CreateWorkstreamTemplateSchema>
export type UpdateWorkstreamTemplateInput = z.infer<typeof UpdateWorkstreamTemplateSchema>
export type CreateWorkstreamSchemaInput = z.infer<typeof CreateWorkstreamSchema>
export type UpdateWorkstreamSchemaInput = z.infer<typeof UpdateWorkstreamSchema>
export type CreateWorkstreamEntrySchemaInput = z.infer<typeof CreateWorkstreamEntrySchema>
export type UpdateWorkstreamEntrySchemaInput = z.infer<typeof UpdateWorkstreamEntrySchema>
export type BulkCreateEntriesSchemaInput = z.infer<typeof BulkCreateEntriesSchema>
export type AssignWorkstreamInput = z.infer<typeof AssignWorkstreamSchema>
export type UpdateClientWorkstreamInput = z.infer<typeof UpdateClientWorkstreamSchema>
