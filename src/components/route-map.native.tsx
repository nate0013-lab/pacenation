import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { boundsOf, type LatLng } from '@/lib/tracking/geo';
import type { RouteMapProps } from './route-map.types';

/**
 * Free OpenStreetMap maps from OpenFreeMap: no API key, no billing, same map
 * on Android and iPhone. If the dark style ever fails to load, the standard
 * style is used instead.
 */
const MAP_STYLES = ['https://tiles.openfreemap.org/styles/dark', 'https://tiles.openfreemap.org/styles/liberty'];

const lngLat = (p: LatLng): [number, number] => [p.lng, p.lat];
const line = (ps: LatLng[]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: ps.map(lngLat) } });
const dot = (p: LatLng, kind: string) => ({ type: 'Feature' as const, properties: { kind }, geometry: { type: 'Point' as const, coordinates: lngLat(p) } });

export function RouteMap({ points, current, follow = false, showEndpoints = true, color = Colors.primary, height = 240, style, interactive = true, highlight, marker }: RouteMapProps) {
  const camera = useRef<CameraRef>(null);
  const [styleIndex, setStyleIndex] = useState(0);

  // Follow the runner while tracking; otherwise frame the whole route.
  useEffect(() => {
    if (follow && current) camera.current?.easeTo({ center: lngLat(current), zoom: 16, duration: 600 });
  }, [follow, current]);

  const frame = () => {
    const b = boundsOf(points);
    if (follow || !b || points.length < 2) return;
    camera.current?.fitBounds([b.minLng, b.minLat, b.maxLng, b.maxLat], { padding: { top: 40, right: 40, bottom: 40, left: 40 }, duration: 0 });
  };
  // Only when the route itself changes length.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(frame, [follow, points.length]);

  const dots = [];
  if (showEndpoints && points[0]) dots.push(dot(points[0], 'start'));
  if (showEndpoints && !current && points.length > 1) dots.push(dot(points[points.length - 1], 'finish'));
  if (marker) dots.push(dot(marker, 'replay'));
  if (current) dots.push(dot(current, 'me'));

  const initial = current ?? points[0];
  return (
    <View style={[styles.wrap, { height }, style]}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLES[styleIndex]}
        onDidFailLoadingMap={() => setStyleIndex((i) => Math.min(i + 1, MAP_STYLES.length - 1))}
        onDidFinishLoadingMap={frame}
        dragPan={interactive}
        touchZoom={interactive}
        touchRotate={false}
        touchPitch={false}
        compass={false}
        logo={false}
        attribution
        attributionPosition={{ bottom: 6, right: 6 }}>
        <Camera ref={camera} initialViewState={initial ? { center: lngLat(initial), zoom: 15 } : { center: [18.42, -33.92], zoom: 11 }} />
        {points.length > 1 ? (
          <GeoJSONSource id="route" data={line(points)}>
            <Layer id="route-line" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }} paint={{ 'line-color': color, 'line-width': 5, 'line-opacity': highlight ? 0.35 : 1 }} />
          </GeoJSONSource>
        ) : null}
        {highlight && highlight.length > 1 ? (
          <GeoJSONSource id="travelled" data={line(highlight)}>
            <Layer id="travelled-line" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }} paint={{ 'line-color': color, 'line-width': 6 }} />
          </GeoJSONSource>
        ) : null}
        {dots.length ? (
          <GeoJSONSource id="dots" data={{ type: 'FeatureCollection', features: dots }}>
            <Layer
              id="dots-halo"
              type="circle"
              paint={{
                'circle-radius': ['match', ['get', 'kind'], 'me', 15, 'replay', 14, 0],
                'circle-color': ['match', ['get', 'kind'], 'me', '#4DA3FF', Colors.gold],
                'circle-opacity': 0.28,
              }}
            />
            <Layer
              id="dots-core"
              type="circle"
              paint={{
                'circle-radius': 7,
                'circle-color': ['match', ['get', 'kind'], 'start', Colors.success, 'finish', Colors.danger, 'replay', Colors.gold, '#4DA3FF'],
                'circle-stroke-width': 2.5,
                'circle-stroke-color': ['match', ['get', 'kind'], 'replay', Colors.bg, '#ffffff'],
              }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.surface },
});
