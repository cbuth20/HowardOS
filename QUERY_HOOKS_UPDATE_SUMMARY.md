# TanStack Query Hooks - Complete Update Summary

## ✅ Status: ALL HOOKS UPDATED & BUILD PASSING

All query hooks across your entire app have been updated with consistent invalidation patterns and hierarchical query keys!

---

## 📁 Files Updated (8 files)

### Core Hook Files (4 files)
1. ✅ **`src/lib/api/hooks/useTasks.ts`**
2. ✅ **`src/lib/api/hooks/useFiles.ts`**
3. ✅ **`src/lib/api/hooks/useUsers.ts`**
4. ✅ **`src/lib/api/hooks/useWorkstreams.ts`**

### Configuration & Index
5. ✅ **`src/lib/api/hooks/index.ts`** - Added workstreams export
6. ✅ **`src/app/providers.tsx`** - Global query configuration

### Page Components (2 files)
7. ✅ **`src/app/(dashboard)/tasks/page.tsx`** - Fixed data destructuring
8. ✅ **`src/app/(dashboard)/files/page.tsx`** - Fixed data destructuring

---

## 🔑 Changes Made

### 1. Query Key Structure
**Before:**
```typescript
// Inconsistent and hard to invalidate
queryKey: ['tasks', filters]
queryKey: ['tasks', id]
```

**After:**
```typescript
// Hierarchical structure for easy invalidation
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id) => [...taskKeys.details(), id] as const,
}
```

Applied to:
- ✅ `taskKeys` in useTasks.ts
- ✅ `fileKeys` in useFiles.ts
- ✅ `userKeys` in useUsers.ts
- ✅ `workstreamKeys` in useWorkstreams.ts

---

### 2. Query Invalidation Patterns

#### Create Operations
**Before:**
```typescript
queryClient.invalidateQueries({ queryKey: ['tasks'] }) // Too broad or too specific
```

**After:**
```typescript
// Invalidate ALL list queries with any filters
queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
```

#### Update Operations
**Before:**
```typescript
queryClient.invalidateQueries({ queryKey: ['tasks'] })
```

**After:**
```typescript
// Invalidate both lists AND details
queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
queryClient.invalidateQueries({ queryKey: taskKeys.details() })
```

#### Delete Operations
**Before:**
```typescript
queryClient.invalidateQueries({ queryKey: ['tasks'] })
```

**After:**
```typescript
// Invalidate EVERYTHING related
queryClient.invalidateQueries({ queryKey: taskKeys.all })
```

---

### 3. Cross-Entity Invalidation

**Users now invalidate related entities:**

When a user profile is updated, it affects:
- ✅ User lists (clients page, dropdowns)
- ✅ Tasks (display assignee names)
- ✅ Files (display uploader names)
- ✅ Workstreams (display point person names)

```typescript
export function useUpdateUserProfile() {
  return useMutation({
    mutationFn: (data) => apiClient.updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
      queryClient.invalidateQueries({ queryKey: userKeys.clients() })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['files', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['workstreams', 'client-workstreams'] })
      toast.success('Profile updated')
    },
  })
}
```

---

### 4. Global Query Configuration

Updated `src/app/providers.tsx`:

```typescript
queries: {
  staleTime: 30 * 1000,          // Data is fresh for 30 seconds
  refetchOnWindowFocus: true,    // Auto-refresh when returning to tab
  refetchOnReconnect: true,      // Auto-refresh on reconnect
  refetchOnMount: true,          // Refetch stale data on component mount
}
```

---

## 🎯 Results

### Before Issues:
❌ Create a task → tasks page doesn't update
❌ Upload a file → files page shows old data
❌ Invite a user → dropdown doesn't show new user
❌ Assign workstream → client view doesn't refresh

### After Fixes:
✅ **Immediate updates** - All mutations invalidate the right queries
✅ **Cross-entity updates** - Related data refreshes automatically
✅ **Tab switching** - Data refreshes when you return to the tab
✅ **Filter persistence** - Filtered queries invalidate correctly
✅ **Consistent patterns** - All hooks follow the same structure

---

## 📊 Query Key Hierarchy Overview

```
tasks/
├── list/
│   ├── { view: 'my-tasks', assignee: null, status: null }
│   ├── { view: 'all', assignee: 'user-123', status: null }
│   └── { view: 'all', assignee: null, status: 'completed' }
└── detail/
    ├── task-id-1
    ├── task-id-2
    └── task-id-3

files/
├── list/
│   ├── { folderPath: '/', view: 'all' }
│   ├── { folderPath: '/', view: 'my-files' }
│   └── { folderPath: '/documents', view: 'all' }
└── permissions/
    ├── file-id-1
    └── file-id-2

users/
├── clients
└── profile

workstreams/
├── verticals
├── templates/
│   ├── { vertical_id: 'xyz', timing: 'monthly', ... }
│   └── { is_active: true }
└── client-workstreams/
    ├── { org_id: 'abc', status: 'green', ... }
    └── { is_active: true }
```

When you invalidate at any level, ALL child queries are also invalidated!

---

## 🧪 Testing Checklist

Test these scenarios to verify everything works:

### Tasks
- [ ] Create a task → Task list updates immediately
- [ ] Update task status → Both list and detail views update
- [ ] Delete a task → Task disappears from list
- [ ] Switch filters → Correct tasks show

### Files
- [ ] Upload a file → File appears in list
- [ ] Delete a file → File disappears
- [ ] Share a file → Permissions update
- [ ] Switch folders → Correct files show

### Users
- [ ] Invite a user → User appears in clients list
- [ ] Update profile → Name/avatar updates everywhere (tasks, files, workstreams)
- [ ] User dropdowns show new users immediately

### Workstreams
- [ ] Create template → Appears in template list
- [ ] Assign workstream → Shows in client assignments
- [ ] Update status → Both admin and client views update
- [ ] Delete template → Removes from lists

### Auto-Refresh
- [ ] Switch browser tabs → Data refreshes when you return
- [ ] Wait 30 seconds → Data becomes stale and refetches on next interaction

---

## 🎓 Developer Guidelines

### When Creating New Hooks

1. **Define query keys first:**
```typescript
export const entityKeys = {
  all: ['entity'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  list: (filters?) => [...entityKeys.lists(), filters] as const,
}
```

2. **Use proper invalidation:**
```typescript
// Create → lists()
// Update → lists() + details()
// Delete → all
```

3. **Consider cross-entity effects:**
```typescript
// If updating X affects Y, invalidate both
queryClient.invalidateQueries({ queryKey: ['entity-x'] })
queryClient.invalidateQueries({ queryKey: ['entity-y'] })
```

4. **Export query keys for reuse:**
```typescript
export const entityKeys = { ... }
export function useEntity() { ... }
export function useCreateEntity() { ... }
```

---

## 📚 Reference

For detailed patterns, examples, and debugging tips, see:
- **[TANSTACK_QUERY_BEST_PRACTICES.md](./TANSTACK_QUERY_BEST_PRACTICES.md)** - Complete guide with examples

For official documentation:
- **[TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)**

---

## 🎉 Summary

**Lines Changed:** ~150 lines across 8 files
**Build Status:** ✅ Passing
**Type Safety:** ✅ All TypeScript errors resolved
**Pattern Consistency:** ✅ All hooks follow the same structure

**Your app now has:**
- ✅ Automatic data refreshing after mutations
- ✅ Smart cache invalidation
- ✅ Cross-entity updates
- ✅ Tab-switching refresh
- ✅ Consistent, maintainable patterns

The entire app is now using TanStack Query best practices! 🚀
