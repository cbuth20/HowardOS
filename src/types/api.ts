import { Task, File, User, TaskWithProfiles, FileWithUploader, ClientWithOrganization } from './entities'

// Generic API response types
export type ApiSuccessResponse<T> = {
  success: true
  data: T
}

export type ApiErrorResponse = {
  success: false
  error: string
  details?: any
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// Task endpoint responses
export type GetTasksResponse = ApiSuccessResponse<{
  tasks: TaskWithProfiles[]
}>

export type GetTaskResponse = ApiSuccessResponse<{
  task: TaskWithProfiles
}>

export type CreateTaskResponse = ApiSuccessResponse<{
  task: TaskWithProfiles
}>

export type UpdateTaskResponse = ApiSuccessResponse<{
  task: TaskWithProfiles
}>

export type DeleteTaskResponse = ApiSuccessResponse<{
  message: string
}>

// File endpoint responses
export type GetFilesResponse = ApiSuccessResponse<{
  files: FileWithUploader[]
  view: string
  folderPath: string
}>

export type UploadFileResponse = ApiSuccessResponse<{
  file: File
  message: string
}>

export type DeleteFileResponse = ApiSuccessResponse<{
  message: string
}>

export type ShareFileResponse = ApiSuccessResponse<{
  message: string
}>

export type GetFilePermissionsResponse = ApiSuccessResponse<{
  permissions: any[]
}>

// User endpoint responses
export type GetClientsResponse = ApiSuccessResponse<{
  clients: ClientWithOrganization[]
  clientsByOrg: Record<string, ClientWithOrganization[]>
}>

export type InviteUserResponse = ApiSuccessResponse<{
  user: User
}>

export type UpdateProfileResponse = ApiSuccessResponse<{
  profile: User
}>

export type ChangePasswordResponse = ApiSuccessResponse<{
  message: string
}>
