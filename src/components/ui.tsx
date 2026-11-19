import { forwardRef, type ComponentRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Radius, Spacing, Type } from '@/constants/theme';
import { Icon, type IconName } from './icons';

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  padded = true,
  header,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  header?: ReactNode;
}) {
  const inner = <View style={[styles.content, padded && styles.padded]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  testID,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
  testID?: string;
}) {
  const v = buttonVariants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !inactive && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        inactive && { opacity: 0.55 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.buttonRow}>
          {icon ? <Icon name={icon} size={20} color={v.fg} /> : null}
          <Text style={[Type.bodyStrong, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: Colors.primary, fg: Colors.onPrimary, border: Colors.primary },
  secondary: { bg: Colors.surfaceRaised, fg: Colors.text, border: Colors.borderStrong },
  ghost: { bg: 'transparent', fg: Colors.primary, border: 'transparent' },
  danger: { bg: 'transparent', fg: Colors.danger, border: Colors.danger },
};

export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextInputProps & { label: string; error?: string | null; hint?: string }>(
  function TextField({ label, error, hint, style, ...props }, ref) {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          ref={ref}
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, error ? { borderColor: Colors.danger } : null, style]}
          accessibilityLabel={label}
          {...props}
        />
        {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    );
  },
);

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[Type.heading, { color: Colors.text }]}>{title}</Text>
      {action}
    </View>
  );
}

export function StatTile({ label, value, unit, accent = Colors.primary }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statAccent, { backgroundColor: accent }]} />
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: IconName; title: string; body: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={Colors.primary} />
      </View>
      <Text style={[Type.bodyStrong, { color: Colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[Type.small, { color: Colors.textSecondary, textAlign: 'center' }]}>{body}</Text>
      {children}
    </View>
  );
}

export function ListRow({
  icon,
  label,
  value,
  onPress,
  danger,
  testID,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
}) {
  const color = danger ? Colors.danger : Colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: Colors.surfaceRaised }]}>
      <Icon name={icon} size={22} color={danger ? Colors.danger : Colors.textSecondary} />
      <Text style={[Type.body, { color, flex: 1 }]}>{label}</Text>
      {value ? <Text style={[Type.small, { color: Colors.textSecondary }]}>{value}</Text> : null}
      {danger ? null : <Icon name="chevron-right" size={18} color={Colors.textMuted} />}
    </Pressable>
  );
}

export function Banner({ kind, text }: { kind: 'error' | 'success' | 'info'; text: string }) {
  const color = kind === 'error' ? Colors.danger : kind === 'success' ? Colors.success : Colors.primary;
  return (
    <View style={[styles.banner, { borderColor: color }]} accessibilityLiveRegion="polite">
      <Text style={[Type.small, { color: Colors.text }]}>{text}</Text>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.segmentSelected]}>
            <Text style={[Type.small, { color: selected ? Colors.onPrimary : Colors.textSecondary, fontWeight: '700' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  padded: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  field: { gap: 6 },
  fieldLabel: { ...Type.caption, color: Colors.textSecondary, textTransform: 'uppercase' },
  input: {
    minHeight: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  error: { ...Type.small, color: Colors.danger },
  hint: { ...Type.small, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl, marginBottom: Spacing.md },
  statTile: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: 6,
    overflow: 'hidden',
  },
  statAccent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderRadius: 2 },
  statLabel: { ...Type.caption, color: Colors.textSecondary },
  statValue: { ...Type.stat, color: Colors.text },
  statUnit: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  empty: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(25, 211, 181, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
  },
  banner: { borderLeftWidth: 3, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.sm },
  segmented: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 4, gap: 4, borderWidth: 1, borderColor: Colors.border },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.sm },
  segmentSelected: { backgroundColor: Colors.primary },
});
