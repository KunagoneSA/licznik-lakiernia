import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrdersListPage from './pages/OrdersListPage'
import OrderDetailPage from './pages/OrderDetailPage'
import WorkerReportPage from './pages/WorkerReportPage'
import FinancePage from './pages/FinancePage'
import ClientsPage from './pages/ClientsPage'
import PaintPurchasesPage from './pages/PaintPurchasesPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'zamowienia', element: <OrdersListPage /> },
          { path: 'zamowienia/:id', element: <OrderDetailPage /> },
          { path: 'raport', element: <WorkerReportPage /> },
          { path: 'finanse', element: <FinancePage /> },
          { path: 'klienci', element: <ClientsPage /> },
          { path: 'lakiery', element: <PaintPurchasesPage /> },
        ],
      },
    ],
  },
], { basename: import.meta.env.BASE_URL })
