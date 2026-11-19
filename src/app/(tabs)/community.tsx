import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { Banner, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/lib/auth-context';
import type { UserProfile } from '@/lib/types';
import { searchUsers } from '@/lib/users-service';

export default function CommunityTab() {
  const { profile } = useProfile();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<UserProfile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = term.trim();
    if (q.replace(/^@/, '').length < 2) {
      setResults(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      searchUsers(q)
        .then((r) => !cancelled && (setResults(r), setError(null)))
        .catch(() => !cancelled && setError('Search is unavailable. Check your connection.'))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);

  return (
    <Screen>
      <Text style={styles.title}>Community</Text>
      <Text style={styles.sub}>Find athletes, follow their journeys and celebrate every kilometre together.</Text>

      <View style={styles.search}>
        <Icon name="community" size={20} color={Colors.textMuted} />
        <TextInput
          testID="community-search"
          value={term}
          onChangeText={setTerm}
          placeholder="Search by username"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
          accessibilityLabel="Search by username"
        />
        {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      </View>

      {error ? <Banner kind="error" text={error} /> : null}

      {results ? (
        <>
          <SectionHeader title="People" />
          {results.length === 0 ? (
            <EmptyState icon="community" title="No one found" body={`No usernames start with "${term.trim().replace(/^@/, '')}".`} />
          ) : (
            <Card style={{ padding: 0 }}>
              {results.map((u, i) => (
                <View key={u.uid} style={[styles.person, i > 0 && styles.divider]} testID={`search-result-${u.usernameLower}`}>
                  <Avatar uri={u.photoURL} name={u.displayName} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.bodyStrong, { color: Colors.text }]}>
                      {u.displayName}
                      {u.uid === profile.uid ? <Text style={{ color: Colors.textMuted }}> (you)</Text> : null}
                    </Text>
                    <Text style={[Type.small, { color: Colors.textSecondary }]}>@{u.username} · Level {u.level}</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      ) : (
        <>
          <SectionHeader title="Activity feed" />
          <EmptyState icon="activity" title="Nothing in your feed yet" body="Activities from people you follow will appear here." />
          <SectionHeader title="Leaderboards" />
          <EmptyState icon="trophy" title="Rankings start with your first kilometre" body="Weekly, monthly and all-time rankings for walking, running and cycling." />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.title, color: Colors.text, marginTop: Spacing.lg },
  sub: { ...Type.body, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xl },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingHorizontal: Spacing.lg,
    minHeight: 50,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 16, paddingVertical: 12, outlineWidth: 0 },
  person: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
});
