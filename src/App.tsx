import { Navigate, Route, Routes } from 'react-router'
import RequireAuth from './auth/RequireAuth'
import TripLayout from './components/TripLayout'
import ExpenseFormPage from './pages/ExpenseFormPage'
import ExpensesPage from './pages/ExpensesPage'
import FundPage from './pages/FundPage'
import HisabPage from './pages/HisabPage'
import HomePage from './pages/HomePage'
import JoinPage from './pages/JoinPage'
import LoginPage from './pages/LoginPage'
import MembersPage from './pages/MembersPage'
import SettlePage from './pages/SettlePage'
import TripDashboardPage from './pages/TripDashboardPage'

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<HomePage />} />
        <Route path="join/:code" element={<JoinPage />} />
        <Route path="trip/:tripId" element={<TripLayout />}>
          <Route index element={<TripDashboardPage />} />
          <Route path="kharche" element={<ExpensesPage />} />
          <Route path="fund" element={<FundPage />} />
          <Route path="hisab" element={<HisabPage />} />
          <Route path="hisab/settle" element={<SettlePage />} />
          <Route path="members" element={<MembersPage />} />
        </Route>
        <Route path="trip/:tripId/kharcha/new" element={<ExpenseFormPage />} />
        <Route path="trip/:tripId/kharcha/:expenseId" element={<ExpenseFormPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
