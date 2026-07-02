import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { FacilitiesPage } from '@/pages/FacilitiesPage'
import { ParticipantsPage } from '@/pages/ParticipantsPage'
import { ReservationsPage } from '@/pages/ReservationsPage'
import { UsersPage } from '@/pages/UsersPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="facilities" element={<FacilitiesPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="participants" element={<ParticipantsPage />} />
      </Route>
    </Routes>
  )
}
