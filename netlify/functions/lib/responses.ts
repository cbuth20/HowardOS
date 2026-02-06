export interface ApiResponse<T = any> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  details?: any
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data }
}

export function errorResponse(message: string, details?: any): ApiError {
  return { success: false, error: message, details }
}
