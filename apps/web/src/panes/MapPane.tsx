import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import $ from 'jquery';
import { useAppDispatch } from '../store/hooks';
import { setGeoBounds } from '../features/viewSync/viewSyncSlice';

export default function MapPane() {
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    mapboxgl.accessToken = (window as any).__MAPBOX_TOKEN__ || '';
    const map = new mapboxgl.Map({
      container: ref.current,
      style: mapboxgl.accessToken
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [0, 0],
      zoom: 1.5,
    });

    const $m = $(ref.current);
    map.on('moveend', () => {
      const b = map.getBounds();
      const bbox: [number, number, number, number] = [
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ];
      dispatch(setGeoBounds(bbox));
      $m.trigger('intelgraph:map:bounds_changed', [{ bbox }]);
    });

    return () => {
      map.remove();
      $m.off();
    };
  }, []);
  return <div id="map" ref={ref} style={{ width: '100%', height: '100%' }} />;
}
