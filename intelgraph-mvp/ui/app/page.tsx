import GraphPane from '../components/GraphPane'
import MapPane from '../components/MapPane'
import TimelinePane from '../components/TimelinePane'

export default function Home() {
  return (
    <div className="grid grid-cols-3 gap-2">
      <GraphPane data={{ nodes: [] }} />
      <MapPane points={[]} />
      <TimelinePane events={[]} />
    </div>
  )
}
