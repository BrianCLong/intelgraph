import { useState } from 'react'

export default function LayerToggles() {
  const [cluster, setCluster] = useState(true)
  const [heatmap, setHeatmap] = useState(false)
  return (
    <div className="bg-white p-2 rounded shadow text-xs space-y-1">
      <label className="flex items-center space-x-1">
        <input
          type="checkbox"
          checked={cluster}
          onChange={() => setCluster(!cluster)}
        />
        <span>Clusters</span>
      </label>
      <label className="flex items-center space-x-1">
        <input
          type="checkbox"
          checked={heatmap}
          onChange={() => setHeatmap(!heatmap)}
        />
        <span>Heatmap</span>
      </label>
    </div>
  )
}
