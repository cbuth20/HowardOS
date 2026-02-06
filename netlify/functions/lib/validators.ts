export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'hidden', 'cancelled'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export function validateTaskStatus(status: string): status is typeof TASK_STATUSES[number] {
  return (TASK_STATUSES as readonly string[]).includes(status)
}

export function validateTaskPriority(priority: string): priority is typeof TASK_PRIORITIES[number] {
  return (TASK_PRIORITIES as readonly string[]).includes(priority)
}
