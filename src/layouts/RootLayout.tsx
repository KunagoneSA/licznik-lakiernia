import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import ErrorBoundary from '../components/ErrorBoundary'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ErrorBoundary>
  )
}
