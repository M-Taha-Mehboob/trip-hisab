import { useState } from 'react'
import { useSession } from '../data/session'
import { Avatar } from './ui'

/** The signed-in user's Google photo, or their initials when there is none / it can't load (offline). */
export function UserAvatar({ size = 36 }: { size?: number }) {
  const { user } = useSession()
  const [failed, setFailed] = useState(false)
  if (!user.avatarUrl || failed) return <Avatar name={user.name || user.email} size={size} />
  return (
    <img
      src={user.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover"
    />
  )
}
