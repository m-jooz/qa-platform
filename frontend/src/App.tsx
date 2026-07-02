import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'))
const ProjectDetailPage = lazy(
  () => import('./pages/projects/ProjectDetailPage'),
)
const TestCaseDetailPage = lazy(
  () => import('./pages/test-cases/TestCaseDetailPage'),
)
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))
const UsersPage = lazy(() => import('./pages/users/UsersPage'))
const ReportSharePage = lazy(() => import('./pages/reports/ReportSharePage'))

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-500">
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reports/share/:token" element={<ReportSharePage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route
                path="/test-cases/:id"
                element={<TestCaseDetailPage />}
              />
              <Route path="/profile" element={<ProfilePage />} />

              <Route element={<AdminRoute />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
