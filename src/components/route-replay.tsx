import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { formatDistanceKm, formatDuration } from '@/lib/format';
import type { TrackPoint } from '@/lib/tracking/geo';
import { prepareReplay, replayAt } from '@/lib/tracking/route-tools';
import { Icon } from './icons';
import { RouteMap } from './route-map';

const BASE_DURATION_S = 20; // a full replay takes 20 s at 1x, whatever the activity length
const SPEEDS = [1, 2, 4] as const;

/**
 * Interactive route map with an animated replay: a marker travels the route
 * by moving time, drawing the path behind it. Play, pause, change speed or
 * tap the scrubber to jump.
 */
export function RouteReplay({ points, color, height = 300 }: { points: TrackPoint[]; color: string; height?: number }) {
  const track = useMemo(() => prepareReplay(points), [points]);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [barWidth, setBarWidth] = useState(1);
  const last = useRef<number | null>(null);
  const active = playing || progress > 0;

  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    let frame: number;
    const tick = (ts: number) => {
      const dt = last.current === null ? 0 : (ts - last.current) / 1000;
      last.current = ts;
      setProgress((p) => {
        const next = p + (dt * speed) / BASE_DURATION_S;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  const at = useMemo(() => replayAt(track, progress), [track, progress]);
  const canReplay = track.points.length > 1 && track.totalS > 0;

  function toggle() {
    if (!playing && progress >= 1) setProgress(0);
    setPlaying((p) => !p);
  }

  function seek(x: number | undefined) {
    // locationX is missing on some web builds; ignore taps we cannot place.
    if (typeof x !== 'number' || !Number.isFinite(x)) return;
    setProgress(Math.max(0, Math.min(1, x / barWidth)));
  }

  return (
    <View style={{ gap: Spacing.sm }}>
      <RouteMap
        points={points}
        color={color}
        height={height}
        highlight={active ? at.travelled : null}
        marker={active ? at.position : null}
      />
      {canReplay ? (
        <View style={styles.controls}>
          <Pressable
            testID="replay-toggle"
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause replay' : 'Play replay'}
            onPress={toggle}
            style={({ pressed }) => [styles.play, { backgroundColor: color }, pressed && { opacity: 0.85 }]}>
            {playing ? (
              <View style={styles.pauseIcon}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <View style={styles.triangle} />
            )}
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.readout}>
              <Text style={[Type.small, { color: Colors.text, fontWeight: '700' }]} testID="replay-distance">
                {formatDistanceKm(at.distanceM)} km
              </Text>
              <Text style={[Type.small, { color: Colors.textSecondary }]}>
                {formatDuration(at.timeS)} / {formatDuration(track.totalS)}
              </Text>
            </View>
            <Pressable
              testID="replay-scrubber"
              accessibilityRole="adjustable"
              accessibilityLabel="Replay position"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              onLayout={(e: LayoutChangeEvent) => setBarWidth(Math.max(1, e.nativeEvent.layout.width))}
              onPress={(e) => {
                const ne = e.nativeEvent as { locationX?: number; offsetX?: number };
                seek(Number.isFinite(ne.locationX) ? ne.locationX : ne.offsetX);
              }}
              hitSlop={{ top: 12, bottom: 12 }}
              style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
              <View style={[styles.knob, { left: `${progress * 100}%`, borderColor: color }]} />
            </Pressable>
          </View>
          <Pressable
            testID="replay-speed"
            accessibilityRole="button"
            accessibilityLabel={`Replay speed ${speed}x`}
            onPress={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
            style={styles.speed}>
            <Text style={[Type.small, { color: Colors.text, fontWeight: '800' }]}>{speed}x</Text>
          </Pressable>
        </View>
      ) : null}
      {canReplay && !active ? (
        <View style={styles.hint}>
          <Icon name="map" size={16} color={Colors.textMuted} />
          <Text style={[Type.small, { color: Colors.textMuted }]}>Press play to replay your route.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  triangle: {
    marginLeft: 4,
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: Colors.onPrimary,
  },
  pauseIcon: { flexDirection: 'row', gap: 5 },
  pauseBar: { width: 5, height: 18, borderRadius: 2, backgroundColor: Colors.onPrimary },
  readout: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.surfaceRaised, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: Radius.pill },
  knob: { position: 'absolute', width: 16, height: 16, borderRadius: 8, marginLeft: -8, backgroundColor: Colors.text, borderWidth: 3 },
  speed: { minWidth: 44, height: 36, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
