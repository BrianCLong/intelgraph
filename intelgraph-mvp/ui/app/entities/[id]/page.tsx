import GraphPane from '../../../components/GraphPane'
import MapPane from '../../../components/MapPane'
import TimelinePane from '../../../components/TimelinePane'
import PolicyBadge from '../../../components/PolicyBadge'
import { api } from '../../../lib/api'

export default async function EntityPage({ params }: { params: { id: string } }) {
  const data = await api(`/views/tripane?entity_id=${params.id}`)
  return (
    <div>
      <PolicyBadge policy={{ sensitivity: 'T' }} />
      <div className="grid grid-cols-3 gap-2 mt-2">
        <GraphPane data={data.graph} />
        <MapPane points={data.map} />
        <TimelinePane events={data.timeline} />
      </div>
    </div>
  )
}
