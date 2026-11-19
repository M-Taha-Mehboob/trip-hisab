import { Crown, Pencil, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import Modal from '../components/Modal'
import { buttonDanger, buttonPrimary, buttonSecondary, cardClass, iconButton, inputClass, labelClass } from '../components/styles'
import { Avatar, HolderBadge, SectionTitle } from '../components/ui'
import { useTripView, type TripView } from '../data/hooks'
import type { LocalTrip } from '../data/db'
import { addMember, deleteTrip, removeMember, renameMember, setMemberRole } from '../data/store'
import type { TripMember } from '../data/types'

/** Who is in the trip. Admins add / rename / remove; the owner also makes admins. */
export default function MembersPage() {
  const { tripId } = useParams()
  const view = useTripView(tripId)!
  const { data, isAdmin, isOwner } = view
  const active = data.trip.status === 'active'
  const canEdit = isAdmin && active
  const ownerUserId = (data.trip as LocalTrip).created_by
  const [renaming, setRenaming] = useState<TripMember | null>(null)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const names = data.members.map((m) => m.display_name.trim().toLowerCase())
  const trimmed = newName.trim()
  const duplicate = names.includes(trimmed.toLowerCase())

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || duplicate || busy) return
    const hasMoney = data.expenses.length > 0 || data.contributions.length > 0
    if (hasMoney && !window.confirm(`${trimmed} ko add karein?\n\nHisab sab members mein barabar batta hai, is liye pichhle kharchon mein bhi ${trimmed} ka hissa lagega aur baqi sab ka share kam ho jayega.`)) return
    setBusy(true)
    try {
      await addMember(data.trip.id, trimmed)
      setNewName('')
    } catch (err) {
      window.alert(`Add nahi hua: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-baseline justify-between px-1">
        <h1 className="text-xl font-extrabold">Members</h1>
        <span className="text-sm text-ink-3">{data.members.length} log</span>
      </div>

      {canEdit && (
        <form onSubmit={add} className={`${cardClass} mt-3 p-4`}>
          <label className={labelClass} htmlFor="new-member">Naya member</label>
          <div className="flex gap-2">
            <input
              id="new-member"
              className={inputClass}
              value={newName}
              maxLength={40}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Naam"
            />
            <button className={`${buttonPrimary} shrink-0`} disabled={!trimmed || duplicate || busy}>
              <UserPlus size={18} /> Add
            </button>
          </div>
          {duplicate && <p className="mt-1.5 text-sm text-danger">Ye naam pehle se list mein hai.</p>}
          <p className="mt-2 text-xs text-ink-3">Wo invite link se Google login karke apna naam chunega.</p>
        </form>
      )}

      <SectionTitle title="List" />
      <ul className={`${cardClass} divide-y divide-line overflow-hidden`}>
        {data.members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            view={view}
            isTripOwner={m.user_id !== null && m.user_id === ownerUserId}
            canEdit={canEdit}
            canMakeAdmin={isOwner && active}
            onRename={() => setRenaming(m)}
          />
        ))}
      </ul>

      <p className="mt-3 px-1 text-xs text-ink-3">
        Admin kharche, Group Fund aur settle up badal sakte hain; baqi members sirf dekh sakte hain. Admin sirf trip owner bana
        sakta hai.
      </p>

      {isOwner && (
        <button onClick={() => setDeleting(true)} className={`${buttonDanger} mt-8 w-full py-3`}>
          <Trash2 size={18} /> Trip delete karo
        </button>
      )}

      {renaming && <RenameSheet member={renaming} taken={names} onClose={() => setRenaming(null)} />}
      {deleting && <DeleteTripSheet tripId={data.trip.id} tripName={data.trip.name} onClose={() => setDeleting(false)} />}
    </>
  )
}

/** Owner only. Type the trip's name to confirm; soft delete, so it leaves every member's phone. */
function DeleteTripSheet({ tripId, tripName, onClose }: { tripId: string; tripName: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [typed, setTyped] = useState('')
  const ok = typed.trim().toLowerCase() === tripName.trim().toLowerCase()

  async function remove(e: FormEvent) {
    e.preventDefault()
    if (!ok) return
    try {
      await deleteTrip(tripId)
      navigate('/', { replace: true })
    } catch (err) {
      window.alert(`Trip delete nahi hui: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <Modal title="Trip delete karein?" onClose={onClose}>
      <form onSubmit={remove} className="space-y-4">
        <p className="text-sm text-ink-2">
          <b>{tripName}</b> ke saare kharche, Group Fund aur hisab sab members ke phone se hat jayenge.
        </p>
        <div>
          <label className={labelClass} htmlFor="delete-confirm">Confirm karne ke liye trip ka naam likhein</label>
          <input id="delete-confirm" className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={tripName} autoFocus />
        </div>
        <button className={`${buttonDanger} w-full py-3`} disabled={!ok}>
          <Trash2 size={18} /> Haan, delete karo
        </button>
      </form>
    </Modal>
  )
}

function MemberRow({
  member: m,
  view,
  isTripOwner,
  canEdit,
  canMakeAdmin,
  onRename,
}: {
  member: TripMember
  view: TripView
  isTripOwner: boolean
  canEdit: boolean
  canMakeAdmin: boolean
  onRename: () => void
}) {
  const { data } = view
  const isHolder = data.trip.fund_holder_member_id === m.id
  const isMe = view.me?.id === m.id
  const usedIn =
    data.expenses.some((e) => e.paid_by_member_id === m.id) ||
    data.contributions.some((c) => c.member_id === m.id) ||
    data.settlements.some((s) => s.from_member_id === m.id || s.to_member_id === m.id)
  const removeBlocked = isTripOwner
    ? 'Trip owner ko hataya nahi ja sakta.'
    : isHolder
      ? 'Ye Group Fund holder hain. Pehle Group Fund page par holder badlein.'
      : usedIn
        ? 'Is ka paisa hisab mein hai (kharcha, contribution ya settle up), is liye hataya nahi ja sakta.'
        : null

  function remove() {
    if (removeBlocked) return window.alert(removeBlocked)
    const extra = m.user_id ? '\n\nWo is trip ko dekh bhi nahi sakenge.' : ''
    if (window.confirm(`${m.display_name} ko trip se hatayen?${extra}`)) removeMember(m.id)
  }

  function toggleAdmin() {
    const next = m.role === 'admin' ? 'member' : 'admin'
    const msg =
      next === 'admin'
        ? `${m.display_name} ko admin banayen? Wo kharche, Group Fund aur settle up badal sakenge.`
        : `${m.display_name} se admin hatayen? Wo sirf dekh sakenge.`
    if (window.confirm(msg)) setMemberRole(m.id, next)
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar name={m.display_name} size={40} fund={isHolder} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">
          {m.display_name}
          {isMe && <span className="font-normal text-ink-3"> (aap)</span>}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {isTripOwner ? (
            <Badge tone="bg-accent-soft text-accent-ink">
              <Crown size={11} /> Owner
            </Badge>
          ) : (
            m.role === 'admin' && (
              <Badge tone="bg-primary-soft text-primary-text">
                <ShieldCheck size={11} /> Admin
              </Badge>
            )
          )}
          {isHolder && <HolderBadge />}
          {!m.user_id && <Badge tone="bg-warn-soft text-warn">Join nahi kiya</Badge>}
          {canMakeAdmin && !isTripOwner && m.user_id && (
            <button
              onClick={toggleAdmin}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                m.role === 'admin' ? 'border-line text-ink-2' : 'border-primary text-primary-text'
              }`}
            >
              {m.role === 'admin' ? 'Admin hatayen' : '+ Admin banayen'}
            </button>
          )}
        </div>
      </div>
      {canEdit && (
        <>
          <button onClick={onRename} aria-label={`${m.display_name} ka naam badlein`} className={iconButton}>
            <Pencil size={17} />
          </button>
          {!isTripOwner && (
            <button
              onClick={remove}
              aria-label={`${m.display_name} ko hatayen`}
              className={`${iconButton} ${removeBlocked ? 'opacity-35' : 'text-danger'}`}
            >
              <Trash2 size={17} />
            </button>
          )}
        </>
      )}
    </li>
  )
}

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{children}</span>
}

function RenameSheet({ member, taken, onClose }: { member: TripMember; taken: string[]; onClose: () => void }) {
  const [name, setName] = useState(member.display_name)
  const trimmed = name.trim()
  const duplicate = trimmed.toLowerCase() !== member.display_name.trim().toLowerCase() && taken.includes(trimmed.toLowerCase())

  function save(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || duplicate) return
    if (trimmed !== member.display_name) renameMember(member.id, trimmed)
    onClose()
  }

  return (
    <Modal title="Naam badlein" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <input className={inputClass} value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
        {duplicate && <p className="text-sm text-danger">Ye naam pehle se list mein hai.</p>}
        <div className="flex gap-2">
          <button type="button" className={`${buttonSecondary} flex-1`} onClick={onClose}>
            Wapas
          </button>
          <button className={`${buttonPrimary} flex-1`} disabled={!trimmed || duplicate}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
