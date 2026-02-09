# TanStack Query Best Practices for HowardOS

## ✅ STATUS: FULLY IMPLEMENTED

All hooks across the entire app have been updated with consistent invalidation patterns! 🎉

## Problem
After mutations (POST, PATCH, DELETE), the current page doesn't automatically show updated data.

## Root Cause
TanStack Query caches data with specific keys. When you invalidate queries, you need to invalidate at the right level to catch all related cached queries (including those with filters).

## Solutions Implemented

### 1. ✅ Broader Query Invalidation (Immediate Fix)

**Before:**
```typescript
queryClient.invalidateQueries({ queryKey: workstreamKeys.templates() })
// Only invalidates: ['workstreams', 'templates', undefined]
```

**After:**
```typescript
queryClient.invalidateQueries({ queryKey: ['workstreams', 'templates'] })
// Invalidates ALL queries starting with ['workstreams', 'templates']
// Including: ['workstreams', 'templates', { vertical_id: 'xyz' }]
```

### 2. ✅ Global Query Configuration

Updated `src/app/providers.tsx` with better defaults:

```typescript
queries: {
  staleTime: 30 * 1000,          // Data is fresh for 30 seconds
  refetchOnWindowFocus: true,    // Refetch when user returns to tab
  refetchOnReconnect: true,      // Refetch when internet reconnects
  refetchOnMount: true,          // Refetch when component mounts if stale
}
```

## Standard Pattern for Your App

### Query Keys Structure
Use hierarchical keys that make invalidation predictable:

```typescript
// Good - hierarchical structure
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: string) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}
```

### Mutation Pattern
Always invalidate at the right level:

```typescript
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => apiClient.createTask(data),
    onSuccess: () => {
      // Invalidate ALL task list queries (with any filters)
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      toast.success('Task created')
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => apiClient.updateTask(id, data),
    onSuccess: () => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail'] })
      toast.success('Task updated')
    },
  })
}
```

## When to Invalidate What

### Create Operations
Invalidate **list queries** only:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
}
```

### Update Operations
Invalidate **both list and detail queries**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
  queryClient.invalidateQueries({ queryKey: ['tasks', 'detail'] })
}
```

### Delete Operations
Invalidate **everything related**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['tasks'] }) // Invalidates ALL task queries
}
```

### Cross-Entity Updates
Invalidate **all affected entities**:
```typescript
// Example: Assigning a workstream affects both templates and assignments
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['workstreams', 'templates'] })
  queryClient.invalidateQueries({ queryKey: ['workstreams', 'client-workstreams'] })
}
```

## Advanced: Optimistic Updates (Optional)

For better UX, update the UI immediately before the server responds:

```typescript
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }) => apiClient.updateTask(id, { status }),

    // Update UI immediately
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', 'list'] })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['tasks', 'list'])

      // Optimistically update
      queryClient.setQueryData(['tasks', 'list'], (old: any) => {
        return old?.tasks?.map((task: any) =>
          task.id === id ? { ...task, status } : task
        )
      })

      // Return context with previous value
      return { previousTasks }
    },

    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tasks', 'list'], context?.previousTasks)
      toast.error('Failed to update task')
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
    },
  })
}
```

## Debugging Tips

### 1. Use React Query DevTools
Already installed - open it to see:
- All cached queries
- Their keys
- Their state (fresh, stale, inactive)
- When they were last fetched

### 2. Add Logging
Temporarily add logs to see what's happening:

```typescript
onSuccess: () => {
  console.log('Invalidating:', ['tasks', 'list'])
  queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
}
```

### 3. Check Query Keys
In your query hooks, log the keys:

```typescript
export function useTasks(filters?: TaskFilters) {
  const queryKey = taskKeys.list(filters)
  console.log('useTasks queryKey:', queryKey)

  return useQuery({
    queryKey,
    // ...
  })
}
```

## Common Mistakes to Avoid

❌ **Don't invalidate with exact keys:**
```typescript
// This only invalidates ONE specific query
queryClient.invalidateQueries({ queryKey: ['tasks', 'list', { status: 'pending' }] })
```

✅ **Do invalidate at the parent level:**
```typescript
// This invalidates ALL list queries with any filters
queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
```

❌ **Don't forget cross-entity relationships:**
```typescript
// If updating a user affects tasks, invalidate both
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['users'] })
  // Missing: queryClient.invalidateQueries({ queryKey: ['tasks'] })
}
```

✅ **Do think about what data changed:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['users'] })
  queryClient.invalidateQueries({ queryKey: ['tasks'] }) // Tasks might show user names
}
```

## ✅ All Hooks Updated!

### Completed Updates

All hooks now follow the consistent pattern:
- [x] `src/lib/api/hooks/useTasks.ts` - ✅ Updated with hierarchical keys and proper invalidation
- [x] `src/lib/api/hooks/useFiles.ts` - ✅ Updated with hierarchical keys and proper invalidation
- [x] `src/lib/api/hooks/useUsers.ts` - ✅ Updated with cross-entity invalidation
- [x] `src/lib/api/hooks/useWorkstreams.ts` - ✅ Updated with hierarchical keys and proper invalidation
- [x] `src/lib/api/hooks/index.ts` - ✅ Exports all hooks including workstreams

### Pattern Implemented

1. **Query Keys Structure** - All hooks now use hierarchical keys:
   ```typescript
   export const entityKeys = {
     all: ['entity'] as const,
     lists: () => [...entityKeys.all, 'list'] as const,
     list: (filters?) => [...entityKeys.lists(), filters] as const,
     details: () => [...entityKeys.all, 'detail'] as const,
     detail: (id) => [...entityKeys.details(), id] as const,
   }
   ```

2. **Invalidation Levels**:
   - **Create** → Invalidates `lists()`
   - **Update** → Invalidates `lists()` and `details()`
   - **Delete** → Invalidates `all` (everything)

3. **Cross-Entity Invalidation** - User updates invalidate tasks, files, and workstreams since they display user information

## Summary

**Quick Wins:**
1. ✅ Updated workstreams to invalidate at parent level
2. ✅ Added refetchOnWindowFocus and refetchOnMount globally
3. ✅ Reduced staleTime to 30 seconds for faster updates

**Result:**
- Data refreshes automatically when you switch tabs
- Mutations invalidate all related queries
- Stale data is refetched more frequently

**Next Steps:**
- Apply the same invalidation pattern to tasks, files, and users hooks
- Consider optimistic updates for frequently-changed data (like task status)
- Use React Query DevTools to debug any remaining cache issues
