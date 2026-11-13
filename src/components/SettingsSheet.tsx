import { resetMockData, setViewAsMember } from '../data/store'
import { useViewAsMember } from '../data/hooks'
import Modal from './Modal'
import { buttonSecondary, checkboxClass } from './styles'

/** Avatar menu. Phase 1 only has mock-data switches; Google account + logout come in phase 3. */
export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const viewAsMember = useViewAsMember()
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="mb-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
        Abhi sample (mock) data chal raha hai. Google login aur asli data phase 3 mein.
      </div>
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
        <span>
          <span className="block font-semibold">Member ki nazar se dekhein</span>
          <span className="block text-sm text-ink-3">Admin buttons chhup jayenge (read-only member)</span>
        </span>
        <input
          type="checkbox"
          className={checkboxClass}
          checked={viewAsMember}
          onChange={(e) => setViewAsMember(e.target.checked)}
        />
      </label>
      <button
        className={`${buttonSecondary} mt-3 w-full`}
        onClick={() => {
          if (window.confirm('Sample data wapas shuru wali halat mein reset karein?')) {
            resetMockData()
            onClose()
          }
        }}
      >
        Sample data reset
      </button>
    </Modal>
  )
}
