'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task, TaskStatus } from '@/types/tasks'
import { TaskCard } from './TaskCard'
import { CheckSquare } from 'lucide-react'

interface TaskColumnProps {
  status: TaskStatus
  title: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
  canEditTask: (task: Task) => boolean
}

export function TaskColumn({ status, title, tasks, onTaskClick, canEditTask }: TaskColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  })

  return (
    <div className="flex-1 min-w-[240px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-border">
        <h2 className="font-semibold text-text-primary text-base">
          {title}
        </h2>
        <span className="text-xs text-text-muted bg-muted-DEFAULT px-2 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className="min-h-[150px] space-y-2"
      >
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                canEdit={canEditTask(task)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-text-muted opacity-40">
              <CheckSquare className="w-8 h-8 mb-1.5" />
              <p className="text-xs">No tasks</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}
