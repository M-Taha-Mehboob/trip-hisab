import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/context'
import { useViewAsMember } from '../data/hooks'
import { useSession } from '../data/session'
import { setViewAsMember } from '../data/store'
import { useSync } from '../sync/context'
import { setThemePref, THEMES, useThemePref } from '../theme/theme'
import Modal from './Modal'
import { buttonDanger, checkboxClass } from './styles'
import { UserAvatar } from './UserAvatar'

/** Avatar menu: account, sync status, "view as member", logout. */
export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const viewAsMember = useViewAsMember()
  const { user } = useSession()
  const { signOut } = useAuth()
  const { pending, lastSyncedAt, error } = useSync()
  const themePref = useThemePref()

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

      <div className="mb-4">
        <div className="mb-1.5 px-1 text-sm font-medium text-ink-2">Theme</div>
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-card-2 p-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setThemePref(t.id)}
              aria-pressed={themePref === t.id}
              className={`rounded-xl px-1 py-2 text-center transition ${
                themePref === t.id ? 'bg-card text-ink shadow-sm' : 'text-ink-3'
              }`}
            >
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className="block text-[11px]">{t.hint}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 px-1 text-xs text-ink-3">Auto: din mein Glacier, 4:30 se Sunset, 7:30 se Raat. Sirf is phone par.</p>
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
