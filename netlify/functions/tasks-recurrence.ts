import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

/**
 * Scheduled function that creates new task instances from recurring tasks.
 * Should be triggered via Netlify Scheduled Functions or a cron job.
 *
 * Checks for recurring tasks where next_occurrence_at <= now,
 * creates a new task instance, and calculates the next occurrence.
 *
 * Can also be triggered manually via GET request for testing.
 */
export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()

    // Find all recurring tasks that are due for a new instance
    const { data: recurringTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .not('recurrence_rule', 'is', null)
      .not('next_occurrence_at', 'is', null)
      .lte('next_occurrence_at', now.toISOString())
      .neq('status', 'cancelled')

    if (fetchError) {
      console.error('Error fetching recurring tasks:', fetchError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch recurring tasks' }),
      }
    }

    if (!recurringTasks || recurringTasks.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No recurring tasks due', created: 0 }),
      }
    }

    let created = 0
    const errors: string[] = []

    for (const task of recurringTasks) {
      try {
        const rule = task.recurrence_rule as any
        if (!rule?.frequency) continue

        // Create new task instance
        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert({
            org_id: task.org_id,
            title: task.title,
            description: task.description,
            status: 'pending',
            priority: task.priority,
            assigned_to: task.assigned_to,
            created_by: task.created_by,
            due_date: calculateDueDate(rule),
            is_internal: task.is_internal,
            parent_task_id: task.id,
            metadata: { generated_from_recurring: true },
          })
          .select('id')
          .single()

        if (createError) {
          errors.push(`Task ${task.id}: ${createError.message}`)
          continue
        }

        // Calculate and set next occurrence
        const nextOccurrence = calculateNextOccurrence(rule, now)

        await supabase
          .from('tasks')
          .update({ next_occurrence_at: nextOccurrence.toISOString() })
          .eq('id', task.id)

        created++
        console.log(`Created recurring instance for task ${task.id}, next at ${nextOccurrence.toISOString()}`)
      } catch (taskError: any) {
        errors.push(`Task ${task.id}: ${taskError.message}`)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Processed ${recurringTasks.length} recurring tasks`,
        created,
        errors: errors.length > 0 ? errors : undefined,
      }),
    }
  } catch (error: any) {
    console.error('Recurrence handler error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    }
  }
}

/**
 * Calculate the next occurrence date based on the recurrence rule.
 */
function calculateNextOccurrence(rule: any, from: Date): Date {
  const next = new Date(from)
  const interval = rule.interval || 1

  switch (rule.frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval)
      // Adjust to the specified day of week
      if (rule.day_of_week !== undefined) {
        const currentDay = next.getDay()
        const targetDay = rule.day_of_week
        const diff = targetDay - currentDay
        if (diff !== 0) {
          next.setDate(next.getDate() + diff)
        }
      }
      break

    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      if (rule.day_of_month) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(rule.day_of_month, maxDay))
      }
      break

    case 'quarterly':
      next.setMonth(next.getMonth() + 3 * interval)
      if (rule.day_of_month) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        next.setDate(Math.min(rule.day_of_month, maxDay))
      }
      break
  }

  // Set to 9am in the task's timezone (approximation — use UTC 9am)
  next.setHours(9, 0, 0, 0)

  return next
}

/**
 * Calculate a due date for the generated task instance (optional).
 * Sets due date to the occurrence date.
 */
function calculateDueDate(rule: any): string | null {
  // Due date = the occurrence date itself
  const now = new Date()
  const due = calculateNextOccurrence(rule, new Date(now.getTime() - 24 * 60 * 60 * 1000))
  return due.toISOString()
}
