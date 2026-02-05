export default function TasksPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Sticky Topbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-border shadow-sm">
        <div className="px-8 py-4">
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">Tasks</h1>
          <p className="text-sm text-text-muted">Manage your tasks and assignments</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-background-card rounded-lg shadow-sm border border-neutral-border p-6">
          <p className="text-text-muted">Task management feature coming soon...</p>
        </div>
      </div>
    </div>
  )
}
