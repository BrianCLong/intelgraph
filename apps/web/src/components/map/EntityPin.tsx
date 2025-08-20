import { useEffect } from 'react'
import type maplibregl from 'maplibre-gl'

interface Props {
  map?: maplibregl.Map
  id: string
  lon: number
  lat: number
}

export default function EntityPin({ map, lon, lat }: Props) {
  useEffect(() => {
    if (!map) return
    const el = document.createElement('div')
    el.className = 'w-2 h-2 bg-red-500 rounded-full'
    const marker = new maplibregl.Marker(el).setLngLat([lon, lat]).addTo(map)
    return () => marker.remove()
  }, [map, lon, lat])
  return null
}
