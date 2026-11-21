import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Day chips for the next 60 days plus an hour and minute stepper. Works the same on every platform. */
export function DateTimePicker({ value, onChange }: { value: number; onChange: (ms: number) => void }) {
  const v = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 60 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  const setDay = (d: Date) => onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate(), v.getHours(), v.getMinutes()).getTime());
  const shift = (mins: number) => onChange(value + mins * 60_000);

  return (
    <View style={{ gap: Spacing.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
        {days.map((d, i) => {
          const on = d.toDateString() === v.toDateString();
          return (
            <Pressable
              key={d.toISOString()}
              testID={`day-${i}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={d.toDateString()}
              onPress={() => setDay(d)}
              style={[styles.day, on && { borderColor: Colors.primary, backgroundColor: Colors.surfaceRaised }]}>
              <Text style={[Type.caption, { color: on ? Colors.primary : Colors.textSecondary }]}>{i === 0 ? 'TODAY' : DAY[d.getDay()].toUpperCase()}</Text>
              <Text style={[Type.heading, { color: Colors.text }]}>{d.getDate()}</Text>
              <Text style={[Type.caption, { color: Colors.textSecondary }]}>{MON[d.getMonth()].toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.timeRow}>
        <Stepper label="Hour" onMinus={() => shift(-60)} onPlus={() => shift(60)} testID="hour" />
        <Text style={styles.time} testID="picked-time">
          {String(v.getHours()).padStart(2, '0')}:{String(v.getMinutes()).padStart(2, '0')}
        </Text>
        <Stepper label="Minutes" onMinus={() => shift(-15)} onPlus={() => shift(15)} testID="minute" />
      </View>
    </View>
  );
}

function Stepper({ label, onMinus, onPlus, testID }: { label: string; onMinus: () => void; onPlus: () => void; testID: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={[Type.caption, { color: Colors.textSecondary }]}>{label.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Pressable testID={`${testID}-minus`} accessibilityRole="button" accessibilityLabel={`Earlier ${label.toLowerCase()}`} onPress={onMinus} style={styles.step}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Pressable testID={`${testID}-plus`} accessibilityRole="button" accessibilityLabel={`Later ${label.toLowerCase()}`} onPress={onPlus} style={styles.step}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { width: 64, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { fontSize: 36, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  stepText: { fontSize: 22, color: Colors.text, fontWeight: '700' },
});
