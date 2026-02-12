export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'quarterly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;       // e.g. every 2 weeks
  day_of_week?: number;   // 0=Sun, 1=Mon, ..., 6=Sat (for weekly)
  day_of_month?: number;  // 1-31 (for monthly/quarterly)
}

export interface Task {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  is_internal: boolean;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  parent_task_id: string | null;
  next_occurrence_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    role: string;
  };
  created_by_profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export type TaskView = 'my-tasks' | 'team-tasks' | 'client-tasks' | 'all-tasks';

export interface TaskFilters {
  view: TaskView;
  assignee?: string | null;
  status?: TaskStatus | null;
}

export interface TaskFormData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  is_internal?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule | null;
}
