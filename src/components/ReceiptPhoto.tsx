import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useOnline } from '../data/hooks'
import { useSession } from '../data/session'
import { objectUrlFor } from '../lib/objectUrl'
import { RECEIPTS_BUCKET, supabase } from '../lib/supabase'

/**
 * A receipt from the private bucket. Shown from the phone's copy when there is one (works offline);
 * otherwise downloaded once (members of the trip only, by RLS) and kept on the phone.
 */
export default function ReceiptPhoto({ path }: { path: string }) {
  const { db } = useSession()
  const online = useOnline()
  const local = useLiveQuery(async () => (await db.receipts.get(path)) ?? null, [db, path])
  const [failed, setFailed] = useState<string | null>(null)
  const url = objectUrlFor(local?.blob)

  useEffect(() => {
    if (local !== null || !online || !supabase) return
    let cancelled = false
    supabase.storage
      .from(RECEIPTS_BUCKET)
      .download(path)
      .then(async ({ data, error }) => {
        if (cancelled) return
        if (error || !data) return setFailed('Photo abhi upload nahi hui (jis phone se lagi, wahan net aane par aa jayegi).')
        await db.receipts.put({ path, blob: data, pending: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [db, path, local, online])

  if (url) return <img src={url} alt="Receipt" className="max-h-72 w-full object-contain" />
  const message =
    local === undefined ? 'Loading…' : failed ?? (online ? 'Photo load ho rahi hai…' : 'Photo dekhne ke liye internet chahiye')
  return <div className="px-4 py-10 text-center text-sm text-ink-3">{message}</div>
}
