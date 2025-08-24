'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../lib/api'

export default function SearchBar() {
  const [q, setQ] = useState('')
  const router = useRouter()
  const onSearch = async () => {
    const res = await api(`/entities/search?q=${encodeURIComponent(q)}`)
    if (res.results.length > 0) {
      router.push(`/entities/${res.results[0].id}`)
    }
  }
  return (
    <div className="p-2 flex gap-2">
      <input className="border" value={q} onChange={(e) => setQ(e.target.value)} />
      <button onClick={onSearch}>Search</button>
    </div>
  )
}
