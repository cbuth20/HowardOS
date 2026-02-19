import { createBrowserRouter, Navigate } from 'react-router'
import App from './App'
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Auth pages
import LoginPage from './app/(auth)/login/page'
import CallbackPage from './app/(auth)/callback/page'
import DevLoginPage from './app/(auth)/dev-login/page'
import DevSwitchPage from './app/(auth)/dev-switch/page'
import SetPasswordPage from './app/(auth)/set-password/page'

// Dashboard pages
import DashboardPage from './app/(dashboard)/dashboard/page'
import TasksPage from './app/(dashboard)/tasks/page'
import FilesPage from './app/(dashboard)/files/page'
import SettingsPage from './app/(dashboard)/settings/page'
import WorkstreamsPage from './app/(dashboard)/workstreams/page'
import WorkstreamDetailPage from './app/(dashboard)/workstreams/[id]/page'
import OrganizationsPage from './app/(dashboard)/clients/organizations/page'
import UsersPage from './app/(dashboard)/clients/users/page'
import TransactionsPage from './app/(dashboard)/tools/transactions/page'

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      // Root redirect
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },

      // Auth routes (redirect authenticated users away)
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
        ],
      },

      // Auth routes that don't redirect (callback, dev tools, set-password)
      { path: '/callback', element: <CallbackPage /> },
      { path: '/auth/callback', element: <Navigate to="/callback" replace /> },
      { path: '/dev-login', element: <DevLoginPage /> },
      { path: '/dev-switch', element: <DevSwitchPage /> },
      { path: '/set-password', element: <SetPasswordPage /> },

      // Dashboard routes (auth guard)
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/files', element: <FilesPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/workstreams', element: <WorkstreamsPage /> },
          { path: '/workstreams/:id', element: <WorkstreamDetailPage /> },
          { path: '/clients', element: <Navigate to="/clients/organizations" replace /> },
          { path: '/clients/organizations', element: <OrganizationsPage /> },
          { path: '/clients/users', element: <UsersPage /> },
          { path: '/tools/transactions', element: <TransactionsPage /> },
        ],
      },
    ],
  },
])
