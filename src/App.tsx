import { Navigate, Route, Routes } from 'react-router'
import TripLayout from './components/TripLayout'
import ExpenseFormPage from './pages/ExpenseFormPage'
import ExpensesPage from './pages/ExpensesPage'
import FundPage from './pages/FundPage'
import HisabPage from './pages/HisabPage'
import HomePage from './pages/HomePage'
import SettlePage from './pages/SettlePage'
import TripDashboardPage from './pages/TripDashboardPage'

export default function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="trip/:tripId" element={<TripLayout />}>
        <Route index element={<TripDashboardPage />} />
        <Route path="kharche" element={<ExpensesPage />} />
        <Route path="fund" element={<FundPage />} />
        <Route path="hisab" element={<HisabPage />} />
        <Route path="hisab/settle" element={<SettlePage />} />
      </Route>
      <Route path="trip/:tripId/kharcha/new" element={<ExpenseFormPage />} />
      <Route path="trip/:tripId/kharcha/:expenseId" element={<ExpenseFormPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
