import React from 'react'
import { AlertInbox } from '@/components/watchlists/AlertInbox'
import { WatchlistEditor } from '@/components/watchlists/WatchlistEditor'
import { DigestSettings } from '@/components/watchlists/DigestSettings'

export default function WatchlistsPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Watchlists</h1>
      <WatchlistEditor />
      <AlertInbox />
      <DigestSettings />
    </div>
  )
}
