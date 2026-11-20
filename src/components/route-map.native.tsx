import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, type MapStyleElement } from 'react-native-maps';

import { Colors, Radius } from '@/constants/theme';
import type { RouteMapProps } from './route-map.types';

/** Dark map styling for Google Maps on Android; iOS follows userInterfaceStyle. */
const DARK_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#0e1c2f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8aa0b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#07111f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c3352' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0b1829' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06243a' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#10302a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const toCoord = (p: { lat: number; lng: number }) => ({ latitude: p.lat, longitude: p.lng });

export function RouteMap({ points, current, follow = false, showEndpoints = true, color = Colors.primary, height = 240, style, interactive = true, highlight, marker }: RouteMapProps) {
  const map = useRef<MapView>(null);
  const coords = points.map(toCoord);

  // Follow the runner while tracking; otherwise frame the whole route once.
  useEffect(() => {
    if (follow && current) {
      map.current?.animateCamera({ center: toCoord(current), zoom: 16 }, { duration: 600 });
    }
  }, [follow, current]);

  useEffect(() => {
    if (!follow && coords.length > 1) {
      map.current?.fitToCoordinates(coords, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false });
    }
    // Only when the route itself changes length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, coords.length]);

  const initial = current ?? points[0];
  return (
    <View style={[styles.wrap, { height }, style]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle="dark"
        customMapStyle={Platform.OS === 'android' ? DARK_STYLE : undefined}
        initialRegion={initial ? { ...toCoord(initial), latitudeDelta: 0.01, longitudeDelta: 0.01 } : undefined}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        showsCompass={false}
        toolbarEnabled={false}
        onMapReady={() => {
          if (!follow && coords.length > 1) {
            map.current?.fitToCoordinates(coords, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false });
          }
        }}>
        {coords.length > 1 ? (
          <Polyline coordinates={coords} strokeColor={highlight ? `${color}59` : color} strokeWidth={5} lineJoin="round" lineCap="round" />
        ) : null}
        {highlight && highlight.length > 1 ? (
          <Polyline coordinates={highlight.map(toCoord)} strokeColor={color} strokeWidth={6} lineJoin="round" lineCap="round" zIndex={2} />
        ) : null}
        {marker ? (
          <Marker coordinate={toCoord(marker)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} zIndex={3}>
            <View style={styles.replayHalo}>
              <View style={styles.replayDot} />
            </View>
          </Marker>
        ) : null}
        {showEndpoints && coords[0] ? <Marker coordinate={coords[0]} pinColor={Colors.success} title="Start" /> : null}
        {showEndpoints && !current && coords.length > 1 ? <Marker coordinate={coords[coords.length - 1]} pinColor={Colors.danger} title="Finish" /> : null}
        {current ? (
          <Marker coordinate={toCoord(current)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.dotHalo}>
              <View style={styles.dot} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.surface },
  dotHalo: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(77,163,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  replayHalo: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,201,74,0.3)', alignItems: 'center', justifyContent: 'center' },
  replayDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.gold, borderWidth: 2.5, borderColor: Colors.bg },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#4DA3FF', borderWidth: 2.5, borderColor: '#fff' },
});
