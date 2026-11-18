import { useState, type FormEvent } from 'react'
import { addCategory } from '../data/store'
import { CUSTOM_ICONS } from '../lib/categories'
import Modal from './Modal'
import { buttonPrimary, inputClass, labelClass } from './styles'

/** Admin: add the trip's own expense type ("Shopping", "Boating"...). Calls onCreated with its id. */
export default function NewCategorySheet({
  tripId,
  takenNames,
  onCreated,
  onClose,
}: {
  tripId: string
  /** Names already in use (built-in + custom), lower-case, to stop duplicates. */
  takenNames: string[]
  onCreated: (id: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(CUSTOM_ICONS[0].key)
  const [busy, setBusy] = useState(false)
  const trimmed = name.trim()
  const duplicate = takenNames.includes(trimmed.toLowerCase())

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || duplicate || busy) return
    setBusy(true)
    try {
      onCreated(await addCategory(tripId, trimmed, icon))
      onClose()
    } catch (err) {
      window.alert(`Type nahi bani: ${err instanceof Error ? err.message : String(err)}`)
      setBusy(false)
    }
  }

  return (
    <Modal title="Nayi kharcha type" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="cat-name">Naam</label>
          <input
            id="cat-name"
            className={inputClass}
            value={name}
            maxLength={30}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Shopping"
          />
          {duplicate && <p className="mt-1.5 text-sm text-danger">Ye type pehle se hai.</p>}
        </div>
        <div>
          <div className={labelClass}>Icon</div>
          <div className="grid grid-cols-7 gap-2">
            {CUSTOM_ICONS.map(({ key, icon: Icon }) => (
              <button
                type="button"
                key={key}
                onClick={() => setIcon(key)}
                aria-pressed={icon === key}
                aria-label={key}
                className={`grid aspect-square place-items-center rounded-xl border transition ${
                  icon === key ? 'border-primary bg-accent-soft text-accent-ink ring-2 ring-primary/25' : 'border-line bg-card text-ink-2'
                }`}
              >
                <Icon size={20} />
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-ink-3">Ye type sirf is trip mein aayegi aur sab members ko nazar aayegi.</p>
        <button className={`${buttonPrimary} w-full py-3`} disabled={!trimmed || duplicate || busy}>
          Type banayen
        </button>
      </form>
    </Modal>
  )
}
