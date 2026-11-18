import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/context'
import { useViewAsMember } from '../data/hooks'
import { useSession } from '../data/session'
import { setViewAsMember } from '../data/store'
import { useSync } from '../sync/context'
import Modal from './Modal'
import { buttonDanger, checkboxClass } from './styles'
import { UserAvatar } from './UserAvatar'

/** Avatar menu: account, sync status, "view as member", logout. */
export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const viewAsMember = useViewAsMember()
  const { user } = useSession()
  const { signOut } = useAuth()
  const { pending, lastSyncedAt, error } = useSync()

  async function logout() {
    const warn = pending
      ? `${pending} cheezen abhi upload nahi huin. Ye is phone par rahengi aur agli dafa isi Google ID se login par upload hongi.\n\nLogout karein?`
      : 'Logout karein?'
    if (!window.confirm(warn)) return
    await signOut()
    onClose()
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
        <UserAvatar size={44} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{user.name}</div>
          <div className="truncate text-sm text-ink-3">{user.email}</div>
        </div>
      </div>

      <div className="mb-4 px-1 text-sm text-ink-3">
        {error
          ? `Sync error: ${error}`
          : pending
            ? `${pending} cheezen upload honi baqi hain (net aate hi ho jayengi).`
            : lastSyncedAt
              ? `Sab synced · ${lastSyncedAt.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}`
              : 'Sync ho raha hai…'}
      </div>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
        <span>
          <span className="block font-semibold">Member ki nazar se dekhein</span>
          <span className="block text-sm text-ink-3">Admin buttons chhup jayenge (sirf is phone par)</span>
        </span>
        <input type="checkbox" className={checkboxClass} checked={viewAsMember} onChange={(e) => setViewAsMember(e.target.checked)} />
      </label>

      <button className={`${buttonDanger} mt-4 w-full`} onClick={() => void logout()}>
        <LogOut size={18} /> Logout
      </button>
    </Modal>
  )
}
