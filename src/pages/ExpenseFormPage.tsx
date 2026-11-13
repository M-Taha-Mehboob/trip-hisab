import { Camera, Trash2, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { buttonDanger, buttonPrimary, inputClass, labelClass } from '../components/styles'
import { Avatar } from '../components/ui'
import { useTripView } from '../data/hooks'
import { deleteExpense, saveExpense } from '../data/store'
import type { Category } from '../data/types'
import { CATEGORIES } from '../lib/categories'
import { formatNumber, formatPKR, parseAmount, todayISO } from '../lib/format'
import { blobToDataUrl, compressImage } from '../lib/image'

/** Naya kharcha (admin) / edit, and the read-only detail view for members. */
export default function ExpenseFormPage() {
  const { tripId, expenseId } = useParams()
  const view = useTripView(tripId)
  const navigate = useNavigate()
  const existing = view?.data.expenses.find((e) => e.id === expenseId)
  const isNew = !expenseId
  const readOnly = !view?.isAdmin || view.data.trip.status !== 'active'

  const [amountText, setAmountText] = useState(existing ? formatNumber(existing.amount) : '')
  const [category, setCategory] = useState<Category>(existing?.category ?? 'khana')
  const [fromFund, setFromFund] = useState(existing ? existing.paid_by_member_id === null : true)
  const [payerId, setPayerId] = useState<string | null>(existing?.paid_by_member_id ?? view?.me?.id ?? null)
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [note, setNote] = useState(existing?.note ?? '')
  const [receipt, setReceipt] = useState<string | null>(existing?.receipt_path ?? null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!view || (!isNew && !existing) || (isNew && readOnly)) return <Navigate to={`/trip/${tripId ?? ''}`} replace />

  const back = () => navigate(-1)
  const amount = parseAmount(amountText)
  const n = view.summary.memberCount
  const perHead = amount ? Math.floor(amount / n) : 0
  const uneven = amount ? amount % n !== 0 : false
  // Fund money available for this expense (an edited fund expense gives its old amount back first).
  const fundAvailable = view.summary.fundLeft + (existing && existing.paid_by_member_id === null ? existing.amount : 0)
  const overFund = fromFund && amount !== null && amount > fundAvailable
  const canSave = !readOnly && amount !== null && amount > 0 && (fromFund || payerId !== null)

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    try {
      setReceipt(await blobToDataUrl(await compressImage(file)))
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Photo load nahi hui')
    } finally {
      setPhotoBusy(false)
    }
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!canSave || amount === null) return
    saveExpense(
      tripId!,
      { amount, category, paid_by_member_id: fromFund ? null : payerId, date, note: note.trim(), receipt_path: receipt },
      existing?.id,
    )
    back()
  }

  function remove() {
    if (!existing || !window.confirm('Ye kharcha delete karein?')) return
    deleteExpense(tripId!, existing.id)
    back()
  }

  const segment = (active: boolean, fund: boolean) =>
    `flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
      active ? (fund ? 'bg-fund text-white shadow-sm' : 'bg-primary text-on-primary shadow-sm') : 'text-ink-2'
    }`

  return (
    <div className="mx-auto min-h-full max-w-xl">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-surface/85 px-3 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md">
        <button onClick={back} aria-label="Band karein" className="grid h-9 w-9 place-items-center rounded-xl text-ink-2 active:bg-card-2">
          <X size={22} />
        </button>
        <h1 className="flex-1 text-lg font-extrabold">{isNew ? 'Naya kharcha' : readOnly ? 'Kharcha' : 'Kharcha edit'}</h1>
      </header>

      <form onSubmit={save} className="px-4 pb-32">
        <fieldset disabled={readOnly} className="space-y-5">
          {/* Amount */}
          <div className="pt-2 text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-2xl font-bold text-ink-3">Rs</span>
              <input
                aria-label="Amount"
                inputMode="numeric"
                autoFocus={isNew}
                placeholder="0"
                value={amountText}
                onChange={(e) => {
                  const v = parseAmount(e.target.value)
                  setAmountText(v === null ? e.target.value.replace(/[^\d,]/g, '') : formatNumber(v))
                }}
                className="w-[9ch] bg-transparent text-center text-5xl font-extrabold tracking-tight text-ink tabular-nums outline-none placeholder:text-line"
              />
            </div>
            <div className="mt-2 inline-block rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary-text">
              {n} members · {uneven ? '~' : ''}
              {formatPKR(perHead)} per head
            </div>
          </div>

          {/* Category */}
          <div>
            <div className={labelClass}>Category</div>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(({ id, label, icon: Icon, tone }) => {
                const active = category === id
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setCategory(id)}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border bg-card py-3 text-sm font-semibold transition ${
                      active ? 'border-primary ring-2 ring-primary/25' : 'border-line'
                    }`}
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-full ${tone}`}>
                      <Icon size={20} />
                    </span>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Paid by */}
          <div>
            <div className={labelClass}>Kis ne pay kiya</div>
            <div className="flex gap-1 rounded-2xl border border-line bg-card p-1">
              <button type="button" className={segment(fromFund, true)} onClick={() => setFromFund(true)}>
                Group Fund
              </button>
              <button type="button" className={segment(!fromFund, false)} onClick={() => setFromFund(false)}>
                Member (jeb se)
              </button>
            </div>
            {fromFund ? (
              <p className={`mt-2 px-1 text-sm ${overFund ? 'font-semibold text-danger' : 'text-ink-3'}`}>
                Group Fund mein {formatPKR(fundAvailable)} baqi{view.holder ? ` (${view.holder.display_name} ke paas)` : ''}
                {overFund && ' — itna cash nahi hai'}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {view.data.members.map((m) => {
                  const active = payerId === m.id
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPayerId(m.id)}
                      aria-pressed={active}
                      className={`flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm font-semibold ${
                        active ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-card text-ink-2'
                      }`}
                    >
                      <Avatar name={m.display_name} size={28} />
                      {m.display_name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Date + note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="exp-date">Date</label>
              <input id="exp-date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="exp-note">Note</label>
              <input id="exp-note" className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Dinner Chilas" />
            </div>
          </div>

          {/* Receipt */}
          <div>
            <div className={labelClass}>Receipt photo</div>
            {receipt ? (
              <div className="relative overflow-hidden rounded-2xl border border-line bg-card-2">
                {receipt.startsWith('data:') ? (
                  <img src={receipt} alt="Receipt" className="max-h-72 w-full object-contain" />
                ) : (
                  <div className="py-10 text-center text-sm text-ink-3">Receipt photo (sample data)</div>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setReceipt(null)}
                    aria-label="Photo hatayen"
                    className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : readOnly ? (
              <div className="rounded-2xl border border-line bg-card px-4 py-4 text-sm text-ink-3">Koi photo nahi</div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-card py-5 font-semibold text-ink-2"
              >
                <Camera size={20} /> {photoBusy ? 'Photo chhoti ho rahi hai…' : 'Photo lagayen'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                void onPhoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        </fieldset>

        {!readOnly && (
          <div className="fixed inset-x-0 bottom-0 z-20 bg-surface/90 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md">
            <div className="mx-auto flex max-w-xl gap-2">
              {!isNew && (
                <button type="button" onClick={remove} aria-label="Delete" className={`${buttonDanger} py-3`}>
                  <Trash2 size={18} />
                </button>
              )}
              <button className={`${buttonPrimary} flex-1 py-3 text-base`} disabled={!canSave}>
                Save
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
