import { useEffect } from 'react'
import type maplibregl from 'maplibre-gl'

interface Props {
  map?: maplibregl.Map
  sourceId: string
}

export default function ClusterLayer({ map, sourceId }: Props) {
  useEffect(() => {
    if (!map) return
    if (map.getSource(sourceId)) return
    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterRadius: 50,
    })
    map.addLayer({
      id: `${sourceId}-clusters`,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#0d6efd',
        'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
      },
    })
    map.addLayer({
      id: `${sourceId}-cluster-count`,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 12,
      },
    })
  }, [map, sourceId])
  return null
}
