import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSelector } from 'react-redux';
import { fetchGraph, GraphData } from '../data/mockGraph';
import type { RootState } from '../store';

mapboxgl.accessToken = 'no-token';

export function MapPane() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedNode = useSelector(
    (s: RootState) => s.selection.selectedNodeId,
  );
  const graphDataRef = useRef<GraphData | null>(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 0],
      zoom: 1,
    });
    mapRef.current = map;
    fetchGraph().then((data) => {
      graphDataRef.current = data;
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || !graphDataRef.current) return;
    const map = mapRef.current;
    (map as any).__marker?.remove();
    if (selectedNode) {
      const node = graphDataRef.current.nodes.find(
        (n) => n.id === selectedNode,
      );
      if (node) {
        (map as any).__marker = new mapboxgl.Marker()
          .setLngLat(node.coords)
          .addTo(map);
        map.flyTo({ center: node.coords, zoom: 3 });
      }
    }
  }, [selectedNode]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
