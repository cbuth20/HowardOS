import { createBrowserRouter, Navigate } from 'react-router'
import App from './App'
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Auth pages
import LoginPage from './app/(auth)/login/page'
import CallbackPage from './app/(auth)/callback/page'
import SetPasswordPage from './app/(auth)/set-password/page'

// Dashboard pages
import DashboardPage from './app/(dashboard)/dashboard/page'
import ContactsPage from './app/(dashboard)/contacts/page'
import DealsPage from './app/(dashboard)/deals/page'
import PipelinePage from './app/(dashboard)/pipeline/page'
import SettingsPage from './app/(dashboard)/settings/page'

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
        ],
      },
      { path: '/callback', element: <CallbackPage /> },
      { path: '/auth/callback', element: <Navigate to="/callback" replace /> },
      { path: '/set-password', element: <SetPasswordPage /> },
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/contacts', element: <ContactsPage /> },
          { path: '/deals', element: <DealsPage /> },
          { path: '/pipeline', element: <PipelinePage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])
