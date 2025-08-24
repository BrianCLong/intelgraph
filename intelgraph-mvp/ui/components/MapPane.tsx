'use client'

export default function MapPane({ points }: { points: any[] }) {
  return <div className="p-2 border">Map Pane ({points.length} points)</div>
}
