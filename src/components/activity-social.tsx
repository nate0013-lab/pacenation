import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { LikeButton } from '@/components/social';
import { Banner, Button, Card, SectionHeader } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import {
  MAX_COMMENT,
  addComment,
  deleteComment,
  getReactions,
  getUserCards,
  listLikers,
  watchComments,
  type Comment,
  type Reactions,
} from '@/lib/social-service';
import type { UserProfile } from '@/lib/types';

function timeAgo(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Likes and comments under an activity. */
export function ActivitySocial({ activityId, ownerId, me }: { activityId: string; ownerId: string; me: string }) {
  const router = useRouter();
  const [r, setR] = useState<Reactions | null>(null);
  const [likers, setLikers] = useState<UserProfile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Map<string, UserProfile>>(new Map());
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    getReactions(activityId, me).then(setR).catch(() => undefined);
    return watchComments(activityId, setComments);
  }, [activityId, me]);

  const likeKey = r ? `${r.likes}-${r.likedByMe}` : '';
  useEffect(() => {
    if (!likeKey) return;
    listLikers(activityId, 20)
      .then((ids) => getUserCards(ids).then((m) => setLikers(ids.map((i) => m.get(i)).filter((u): u is UserProfile => !!u))))
      .catch(() => undefined);
  }, [activityId, likeKey]);

  useEffect(() => {
    const missing = comments.map((c) => c.authorId).filter((a) => !authors.has(a));
    if (missing.length) getUserCards(missing).then((m) => setAuthors((old) => new Map([...old, ...m])));
  }, [comments, authors]);

  async function send() {
    setError(null);
    setSending(true);
    try {
      await addComment(activityId, me, draft, ownerId);
      setDraft('');
      setR((x) => (x ? { ...x, comments: x.comments + 1 } : x));
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith('PN:') ? e.message.slice(3) : 'Could not post your comment. Check your connection.');
    } finally {
      setSending(false);
    }
  }

  async function remove(c: Comment) {
    if (confirm !== c.id) {
      setConfirm(c.id);
      return;
    }
    setConfirm(null);
    await deleteComment(activityId, c.id).catch(() => setError('Could not delete that comment.'));
  }

  const likedBy = likers.map((u) => (u.uid === me ? 'You' : u.displayName.split(' ')[0]));

  return (
    <View>
      <SectionHeader title="Cheers and comments" />
      <Card style={{ gap: Spacing.md }}>
        <View style={styles.likeRow}>
          <LikeButton activityId={activityId} me={me} value={r} onChange={setR} ownerId={ownerId} />
          <Text style={[Type.small, { color: Colors.textSecondary, flex: 1 }]} numberOfLines={2} testID="activity-likers">
            {likedBy.length === 0 ? 'Be the first to cheer them on.' : `Cheers from ${likedBy.slice(0, 3).join(', ')}${r && r.likes > 3 ? ` and ${r.likes - 3} more` : ''}`}
          </Text>
        </View>

        {comments.map((c) => {
          const a = authors.get(c.authorId);
          const canDelete = c.authorId === me || ownerId === me;
          return (
            <View key={c.id} style={styles.comment} testID={`comment-${c.id}`}>
              <Pressable onPress={() => a && a.uid !== me && router.push({ pathname: '/user/[uid]', params: { uid: a.uid } })} accessibilityRole="button" accessibilityLabel={a ? `Open ${a.displayName}'s profile` : 'Profile'}>
                <Avatar uri={a?.photoURL} name={a?.displayName ?? '?'} size={32} />
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[Type.small, { color: Colors.textSecondary }]}>
                  <Text style={{ color: Colors.text, fontWeight: '700' }}>{a ? (a.uid === me ? 'You' : a.displayName) : 'Someone'}</Text> · {timeAgo(c.createdAt)}
                </Text>
                <Text style={[Type.body, { color: Colors.text }]}>{c.text}</Text>
              </View>
              {canDelete ? (
                <Pressable onPress={() => remove(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel={confirm === c.id ? 'Tap again to delete comment' : 'Delete comment'} testID={`comment-delete-${c.id}`}>
                  {confirm === c.id ? <Text style={[Type.small, { color: Colors.danger }]}>Delete?</Text> : <Icon name="close" size={16} color={Colors.textMuted} />}
                </Pressable>
              ) : null}
            </View>
          );
        })}

        {error ? <Banner kind="error" text={error} /> : null}
        <View style={styles.inputRow}>
          <TextInput
            testID="comment-input"
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment"
            placeholderTextColor={Colors.textMuted}
            maxLength={MAX_COMMENT}
            multiline
            style={styles.input}
            accessibilityLabel="Add a comment"
          />
          <Button testID="comment-send" title="Post" onPress={send} loading={sending} disabled={!draft.trim()} style={{ minHeight: 44, paddingHorizontal: Spacing.lg }} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  comment: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, color: Colors.text, fontSize: 15, backgroundColor: Colors.surfaceRaised, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, outlineWidth: 0 },
});
