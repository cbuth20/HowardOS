# Loading Patterns in HowardOS

This document explains the loading pattern implementation in HowardOS, which provides clear user feedback during navigation and data fetching.

## Overview

HowardOS uses a simple, standard loading strategy:

1. **Route-level loading** - Shows `LoadingSpinner` during page navigation (Next.js Suspense)
2. **Query-level loading** - Shows `LoadingSpinner` while data is being fetched (TanStack Query)
3. **Skeleton screens** (optional) - Available for advanced use cases

## Components

### 1. LoadingSpinner (Primary)

A reusable loading spinner component with text support.

**Location:** `src/components/ui/LoadingSpinner.tsx`

**Props:**
- `size?: 'sm' | 'md' | 'lg'` - Size of the spinner
- `className?: string` - Additional CSS classes
- `text?: string` - Optional loading text

**Usage:**
```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Standard usage - centered in a container
<div className="flex items-center justify-center min-h-[60vh]">
  <LoadingSpinner size="lg" />
</div>

// With custom text (optional)
<LoadingSpinner size="md" text="Loading..." />

// Different sizes
<LoadingSpinner size="sm" />  // Small
<LoadingSpinner size="md" />  // Medium
<LoadingSpinner size="lg" />  // Large (default for pages)
```

### 2. Skeleton Components (Optional - Advanced)

Placeholder components that mimic your actual content layout.

**Location:** `src/components/ui/Skeleton.tsx`

**Base Component:**
```tsx
import { Skeleton } from '@/components/ui/Skeleton'

// Basic skeleton
<Skeleton className="h-4 w-32" />

// Circular (for avatars)
<Skeleton variant="circular" className="h-10 w-10" />
```

**Preset Components:**
```tsx
// Multiple lines of text
<SkeletonText lines={5} />

// Card skeleton
<SkeletonCard />

// Table skeleton
<SkeletonTable rows={10} />
```

### 4. Page-Specific Skeletons

**TaskBoardSkeleton** - For the Kanban-style task board
```tsx
import { TaskBoardSkeleton } from '@/components/ui/TaskBoardSkeleton'

<TaskBoardSkeleton />
```

**PageSkeleton** - Generic page skeleton with variants
```tsx
import { PageSkeleton } from '@/components/ui/PageSkeleton'

// List variant
<PageSkeleton hasTopbar hasFilters variant="list" />

// Table variant
<PageSkeleton hasTopbar hasFilters variant="table" />

// Cards variant
<PageSkeleton hasTopbar hasFilters variant="cards" />
```

## Implementation Patterns

### Pattern 1: Route-Level Loading (Next.js loading.tsx) ⭐ PRIMARY

Create a `loading.tsx` file in any route folder to show a loading spinner during navigation.

**Example:** `src/app/(dashboard)/tasks/loading.tsx`
```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function TasksLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
```

**That's it!** This is the standard pattern for all pages.

### Pattern 2: TanStack Query Loading States ⭐ PRIMARY

Use the `isLoading` state from TanStack Query hooks to show a spinner while data loads.

**Example:**
```tsx
'use client'

import { useTasks } from '@/lib/api/hooks'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function TasksPage() {
  const { data, isLoading } = useTasks()

  return (
    <div className="p-8">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <TaskBoard tasks={data?.tasks || []} />
      )}
    </div>
  )
}
```

### Pattern 3: Initial Data Loading ⭐ PRIMARY

Show a centered spinner while loading initial required data (like user profile).

**Example:**
```tsx
'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function Page() {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    loadProfile()
  }, [])

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return <div>Content</div>
}
```

### Pattern 4: Mutation Loading States

Show loading states during mutations (create, update, delete).

**Example:**
```tsx
'use client'

import { useCreateTask } from '@/lib/api/hooks'
import { Button } from '@/components/ui/Button'

export default function CreateTaskButton() {
  const createTask = useCreateTask()

  const handleCreate = async () => {
    await createTask.mutateAsync({
      title: 'New Task',
      status: 'todo',
    })
  }

  return (
    <Button
      onClick={handleCreate}
      disabled={createTask.isPending}
    >
      {createTask.isPending ? 'Creating...' : 'Create Task'}
    </Button>
  )
}
```

## Best Practices

### 1. Keep It Simple

Use `LoadingSpinner` for all loading states. It's clear, consistent, and user-friendly.

```tsx
// Good - standard pattern
<div className="flex items-center justify-center h-64">
  <LoadingSpinner size="lg" />
</div>

// Also good - with text when context helps
<LoadingSpinner size="md" text="Uploading..." />
```

### 2. Use Appropriate Container Heights

Ensure the loading container has sufficient height to be visible:

```tsx
// Good - visible height
<div className="flex items-center justify-center min-h-[60vh]">
  <LoadingSpinner size="lg" />
</div>

// Also good - specific height
<div className="flex items-center justify-center h-64">
  <LoadingSpinner size="lg" />
</div>
```

### 3. Use TanStack Query States Effectively

TanStack Query provides multiple loading states:

```tsx
const { data, isLoading, isFetching, isPending } = useQuery()

// isLoading - true only on first load (no cached data)
// isFetching - true whenever fetching (including background refetch)
// isPending - true when query is not yet resolved
```

For initial page load, use `isLoading`:
```tsx
{isLoading ? <LoadingSpinner size="lg" /> : <Content />}
```

For background refetches, optionally show a subtle indicator:
```tsx
{isFetching && !isLoading && <div className="text-sm text-muted">Updating...</div>}
```

## Testing Loading States

To test loading states in development:

1. **Slow down your network:** Chrome DevTools → Network tab → Throttling → Slow 3G
2. **Add artificial delay:**
```tsx
// In development only
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}, [])
```

## Checklist for New Pages

When creating a new page, ensure you implement:

- [ ] Create a `loading.tsx` file with `LoadingSpinner` for route-level loading
- [ ] Use `LoadingSpinner` for TanStack Query loading states
- [ ] Show loading states for initial data fetches
- [ ] Handle mutation loading states (buttons with disabled + text change)
- [ ] Test with network throttling

## Examples

See these files for complete examples:

- **Tasks Page:** `src/app/(dashboard)/tasks/page.tsx` + `loading.tsx`
- **Files Page:** `src/app/(dashboard)/files/loading.tsx`
- **Clients Page:** `src/app/(dashboard)/clients/loading.tsx`

## Summary

The loading pattern system provides:

- ✅ Simple `LoadingSpinner` component for all loading states
- ✅ Route-level `loading.tsx` files for page transitions
- ✅ TanStack Query integration for data loading
- ✅ Consistent, clear loading experience
- ✅ Optional skeleton components for advanced use cases
- ✅ Accessible loading states

**Key Principle:** Keep it simple. Use `LoadingSpinner` for everything unless you have a specific reason to use skeletons.
