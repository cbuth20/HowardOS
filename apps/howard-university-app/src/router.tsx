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
import CoursesPage from './app/(dashboard)/courses/page'
import StudentsPage from './app/(dashboard)/students/page'
import LibraryPage from './app/(dashboard)/library/page'
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
          { path: '/courses', element: <CoursesPage /> },
          { path: '/students', element: <StudentsPage /> },
          { path: '/library', element: <LibraryPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])
