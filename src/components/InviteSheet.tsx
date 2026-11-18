import { Copy, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import type { TripView } from '../data/hooks'
import type { LocalTrip } from '../data/db'
import Modal from './Modal'
import { buttonPrimary, buttonSecondary } from './styles'
import { Avatar } from './ui'

/** Admin: share the trip's invite link on WhatsApp; shows who hasn't joined yet. */
export default function InviteSheet({ view, onClose }: { view: TripView; onClose: () => void }) {
  const trip = view.data.trip as LocalTrip
  const link = `${window.location.origin}/join/${trip.invite_code}`
  const notJoined = view.data.members.filter((m) => !m.user_id)
  const uploaded = trip._new !== 1
  const [copied, setCopied] = useState(false)
  const text = `${trip.name} ka hisab Trip Hisab app par hai. Is link se Google login karke apna naam chunein:\n${link}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      window.prompt('Link copy karein:', link)
    }
  }

  return (
    <Modal title="Doston ko bulayen" onClose={onClose}>
      {!uploaded && (
        <p className="mb-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">
          Ye trip abhi upload nahi hui. Net par aate hi link chalega; abhi bhej sakte hain.
        </p>
      )}
      <div className="rounded-2xl border border-line bg-card-2 px-4 py-3 text-sm break-all text-ink-2">{link}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a className={`${buttonPrimary} py-3`} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          <MessageCircle size={18} /> WhatsApp
        </a>
        <button className={`${buttonSecondary} py-3`} onClick={() => void copy()}>
          <Copy size={18} /> {copied ? 'Copy ho gaya' : 'Copy link'}
        </button>
      </div>

      <h3 className="mt-5 mb-2 text-sm font-bold tracking-wide text-ink-2 uppercase">
        {notJoined.length ? `Abhi join nahi kiya (${notJoined.length})` : 'Sab join kar chuke'}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {notJoined.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pr-3 pl-1 text-sm font-semibold text-ink-2">
            <Avatar name={m.display_name} size={26} />
            {m.display_name}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-3">
        Link kholne wala login ke baad list mein se apna naam chunega. Jo list mein nahi, wo naye member ke taur par judega.
      </p>
    </Modal>
  )
}
