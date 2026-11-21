import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  formatSpeedKmh,
} from "@/lib/format";
import { boundsOf, decodePolyline } from "@/lib/tracking/geo";
import type { Activity } from "@/lib/types";
import { Icon } from "./icons";
import { SPORT_COLOR } from "./sport-button";

/** Small route thumbnail drawn from the activity's encoded preview polyline. */
export function RouteThumb({
  polyline,
  color,
  size = 64,
  width,
}: {
  polyline: string;
  color: string;
  /** Height, and width unless `width` is given. */
  size?: number;
  width?: number;
}) {
  const w = width ?? size;
  const pts = decodePolyline(polyline);
  const b = boundsOf(pts);
  if (!b || pts.length < 2) {
    return <View style={[styles.thumb, { width: w, height: size }]} />;
  }
  const midLat = ((b.minLat + b.maxLat) / 2) * (Math.PI / 180);
  const spanX = Math.max((b.maxLng - b.minLng) * Math.cos(midLat), 1e-5);
  const spanY = Math.max(b.maxLat - b.minLat, 1e-5);
  const scale = Math.min((w - 14) / spanX, (size - 14) / spanY);
  const ox = (w - spanX * scale) / 2;
  const oy = (size - spanY * scale) / 2;
  const d = pts
    .map(
      (p) =>
        `${ox + (p.lng - b.minLng) * Math.cos(midLat) * scale},${oy + (b.maxLat - p.lat) * scale}`,
    )
    .join(" ");
  return (
    <View style={[styles.thumb, { width: w, height: size }]}>
      <Svg width={w} height={size}>
        <Polyline
          points={d}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function formatActivityDate(a: Activity): string {
  const d = a.startedAt.toDate();
  return (
    d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export function ActivityRow({ a }: { a: Activity }) {
  const color = SPORT_COLOR[a.sport];
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      testID={`activity-row-${a.id}`}
      onPress={() =>
        router.push({ pathname: "/activity/[id]", params: { id: a.id } })
      }
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: Colors.surfaceRaised },
      ]}
    >
      <RouteThumb polyline={a.polyline} color={color} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.titleRow}>
          <Icon name={a.sport} size={18} color={color} />
          <Text
            style={[Type.bodyStrong, { color: Colors.text, flex: 1 }]}
            numberOfLines={1}
          >
            {a.title}
          </Text>
        </View>
        <Text style={[Type.small, { color: Colors.textMuted }]}>
          {formatActivityDate(a)}
        </Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>{formatDistanceKm(a.distanceM)} km</Text>
          <Text style={styles.stat}>{formatDuration(a.movingTimeS)}</Text>
          <Text style={styles.stat}>
            {a.sport === "ride"
              ? `${formatSpeedKmh(a.avgSpeedMps)} km/h`
              : `${formatPace(a.avgPaceSPerKm)} /km`}
          </Text>
        </View>
      </View>
      <Icon name="chevron-right" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  thumb: {
    borderRadius: Radius.md,
    backgroundColor: "#0B1829",
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stats: { flexDirection: "row", gap: Spacing.lg },
  stat: { ...Type.small, color: Colors.text, fontWeight: "600" },
});
