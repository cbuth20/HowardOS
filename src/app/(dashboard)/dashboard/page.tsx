import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface ProfileData {
  full_name: string | null
  email: string
  role: string
  dashboard_iframe_url: string | null
  organizations: {
    name: string
  } | null
}

interface FileData {
  id: string
  name: string
  created_at: string
  mime_type: string
  channel_id: string | null
}

interface TaskData {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, dashboard_iframe_url, organizations(name)')
    .eq('id', user!.id)
    .single() as { data: ProfileData | null }

  // Get some basic stats
  const { count: filesCount } = await supabase
    .from('files')
    .select('*', { count: 'exact', head: true })

  const { count: tasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { data: recentFiles } = await supabase
    .from('files')
    .select('id, name, created_at, mime_type, channel_id')
    .order('created_at', { ascending: false })
    .limit(5) as { data: FileData[] | null }

  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date')
    .order('created_at', { ascending: false })
    .limit(5) as { data: TaskData[] | null }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sticky Topbar */}
      <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Welcome back, {profile?.full_name || profile?.email}
              </h1>
              <p className="text-sm text-muted-foreground">
                {profile?.organizations?.name} • {{admin: 'Administrator', manager: 'Manager', user: 'Team Member', client: 'Client', client_no_access: 'Contact'}[profile?.role || ''] || profile?.role}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Stats */}
        <div className="flex items-center gap-6 mb-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-tight">{filesCount || 0}</p>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-tight">{tasksCount || 0}</p>
              <p className="text-xs text-muted-foreground">Pending Tasks</p>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {profile?.dashboard_iframe_url && (
          <div className="mb-8">
            <div className="bg-card rounded-lg shadow-sm border border-border">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Analytics Dashboard</h2>
                <p className="text-sm text-muted-foreground mt-1">Real-time performance metrics</p>
              </div>
              <div className="p-6">
                <div
                  style={{
                    width: '100%',
                    height: '600px',
                    overflowY: 'scroll',
                    overflowX: 'hidden',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px'
                  }}
                >
                  <iframe
                    src={profile.dashboard_iframe_url}
                    style={{
                      width: '100%',
                      height: '2000px',
                      border: 'none',
                      display: 'block'
                    }}
                    title="Analytics Dashboard"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Files */}
          <div className="bg-card rounded-lg shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Recent Files</h2>
            </div>
            <div className="p-6">
              {recentFiles && recentFiles.length > 0 ? (
                <ul className="space-y-3">
                  {recentFiles.map((file) => (
                    <li key={file.id}>
                      <Link
                        href={file.channel_id ? `/files?channel=${file.channel_id}` : '/files'}
                        className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-foreground">{file.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No files yet</p>
              )}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-card rounded-lg shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Recent Tasks</h2>
            </div>
            <div className="p-6">
              {recentTasks && recentTasks.length > 0 ? (
                <ul className="space-y-3">
                  {recentTasks.map((task) => (
                    <li key={task.id}>
                      <Link
                        href={`/tasks?task=${task.id}`}
                        className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === 'urgent' ? 'bg-destructive' :
                            task.priority === 'high' ? 'bg-amber-500' :
                            task.priority === 'medium' ? 'bg-muted-foreground' :
                            'bg-muted'
                          }`} />
                          <span className="text-sm font-medium text-foreground">{task.title}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.status === 'completed' ? 'bg-primary/10 text-primary' :
                          task.status === 'in_progress' ? 'bg-muted text-muted-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No tasks yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
