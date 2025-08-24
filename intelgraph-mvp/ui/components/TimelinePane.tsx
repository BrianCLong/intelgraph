'use client'

export default function TimelinePane({ events }: { events: any[] }) {
  return (
    <ul className="p-2 border">
      {events.map((e) => (
        <li key={e.id}>{e.label}</li>
      ))}
    </ul>
  )
}
