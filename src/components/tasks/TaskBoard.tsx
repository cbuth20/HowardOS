'use client'

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { Task, TaskStatus } from '@/types/tasks'
import { TaskColumn } from './TaskColumn'
import { TaskCard } from './TaskCard'
import { useState } from 'react'

interface TaskBoardProps {
  tasks: Task[]
  onTaskUpdate: (taskId: string, updates: { status: TaskStatus }) => Promise<void>
  onTaskClick: (task: Task) => void
  canEditTask: (task: Task) => boolean
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'pending', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'completed', title: 'Done' },
]

export function TaskBoard({ tasks, onTaskUpdate, onTaskClick, canEditTask }: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  const handleDragStart = (event: any) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Check if user can edit this task
    if (!canEditTask(task)) return

    await onTaskUpdate(taskId, { status: newStatus })
  }

  const handleDragCancel = () => {
    setActiveTask(null)
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none -mx-6 px-6 md:mx-0 md:px-0">
        {columns.map((column) => (
          <TaskColumn
            key={column.status}
            status={column.status}
            title={column.title}
            tasks={getTasksByStatus(column.status)}
            onTaskClick={onTaskClick}
            canEditTask={canEditTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3">
            <TaskCard
              task={activeTask}
              onTaskClick={() => {}}
              canEdit={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
