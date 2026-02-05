import { createClient } from '@/lib/supabase/server'
import Script from 'next/script'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(name)')
    .eq('id', user!.id)
    .single()

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
    .select('id, name, created_at, mime_type')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="flex-1 flex flex-col">
      {/* Sticky Topbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-border shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">
                Welcome back, {profile?.full_name || profile?.email}
              </h1>
              <p className="text-sm text-text-muted">
                {profile?.organizations?.name} • {profile?.role === 'admin' ? 'Administrator' : 'Client'}
              </p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="search"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 text-sm border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary w-64"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-6 hover:shadow-md transition-shadow before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-brand-primary before:rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm font-medium">Total Files</p>
                <p className="text-3xl font-bold text-brand-navy mt-2">{filesCount || 0}</p>
              </div>
              <div className="w-12 h-12 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-6 hover:shadow-md transition-shadow before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-brand-slate before:rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm font-medium">Pending Tasks</p>
                <p className="text-3xl font-bold text-brand-navy mt-2">{tasksCount || 0}</p>
              </div>
              <div className="w-12 h-12 bg-brand-slate/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-brand-slate" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="relative bg-background-card rounded-lg shadow-sm border border-neutral-border p-6 hover:shadow-md transition-shadow before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-brand-terracotta before:rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm font-medium">Your Role</p>
                <p className="text-xl font-bold text-brand-navy mt-2 capitalize">{profile?.role}</p>
              </div>
              <div className="w-12 h-12 bg-brand-terracotta/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-brand-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <div className="bg-background-card rounded-lg shadow-sm border border-neutral-border overflow-hidden">
            <div className="p-6 border-b border-neutral-border">
              <h2 className="text-lg font-semibold text-text-primary">Analytics Dashboard</h2>
              <p className="text-sm text-text-muted mt-1">Real-time performance metrics</p>
            </div>
            <div className="p-6">
              <div id="dashboard-273667" style={{ position: 'relative', overflow: 'hidden', height: '1000px' }}>
                <iframe
                  src="https://app.reachreporting.com/embed/-4CV2UoMvusB--r7?theme=light"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  className="rr-embed"
                  data-rr-id="273667"
                  title="Analytics Dashboard"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Files */}
          <div className="bg-background-card rounded-lg shadow-sm border border-neutral-border">
            <div className="p-6 border-b border-neutral-border">
              <h2 className="text-lg font-semibold text-text-primary">Recent Files</h2>
            </div>
            <div className="p-6">
              {recentFiles && recentFiles.length > 0 ? (
                <ul className="space-y-3">
                  {recentFiles.map((file) => (
                    <li key={file.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-primary/10 rounded flex items-center justify-center">
                          <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-text-primary">{file.name}</span>
                      </div>
                      <span className="text-xs text-text-muted">
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-sm">No files yet</p>
              )}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-background-card rounded-lg shadow-sm border border-neutral-border">
            <div className="p-6 border-b border-neutral-border">
              <h2 className="text-lg font-semibold text-text-primary">Recent Tasks</h2>
            </div>
            <div className="p-6">
              {recentTasks && recentTasks.length > 0 ? (
                <ul className="space-y-3">
                  {recentTasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority === 'urgent' ? 'bg-state-error' :
                          task.priority === 'high' ? 'bg-brand-terracotta' :
                          task.priority === 'medium' ? 'bg-brand-slate' :
                          'bg-text-muted'
                        }`} />
                        <span className="text-sm font-medium text-text-primary">{task.title}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.status === 'completed' ? 'bg-state-success/10 text-state-success' :
                        task.status === 'in_progress' ? 'bg-brand-slate/10 text-brand-slate' :
                        'bg-text-muted/10 text-text-muted'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-sm">No tasks yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reach Reporting iframe script */}
      <Script id="reach-reporting-script" strategy="afterInteractive">
        {`
          function rrSendScroll() {
            var iframes = document.getElementsByClassName("rr-embed");
            var de = document.documentElement;
            for (var i = 0; i < iframes.length; i += 1) {
              var box = iframes[i].getBoundingClientRect();
              var top = box.top + window.pageYOffset - de.clientTop;
              var message = JSON.stringify({
                channel: "rr",
                id: parseInt(iframes[i].getAttribute("data-rr-id"), 10),
                scrollY: window.scrollY,
                offsetTop: top
              });
              iframes[i].contentWindow.postMessage(message, "*");
            }
          }

          window.addEventListener("message", function(e) {
            try {
              var d = JSON.parse(e.data);
              var c = d.channel;
              if (c === "rr") {
                document.getElementById("dashboard-" + d.id).style.height = d.height + "px";
                rrSendScroll();
              }
            } catch {}
          });

          window.addEventListener("scroll", rrSendScroll);
        `}
      </Script>
    </div>
  )
}
