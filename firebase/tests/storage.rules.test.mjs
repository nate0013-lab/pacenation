import { after, before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, uploadBytes } from 'firebase/storage';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pacenation',
    storage: { rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8') },
  });
});
after(async () => env?.cleanup());

const img = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

test('users upload their own avatar image', async () => {
  const s = env.authenticatedContext('alice').storage();
  await assertSucceeds(uploadBytes(ref(s, 'avatars/alice/avatar.jpg'), img, { contentType: 'image/jpeg' }));
});

test('cannot upload to another user, or a non-image', async () => {
  const s = env.authenticatedContext('bob').storage();
  await assertFails(uploadBytes(ref(s, 'avatars/alice/avatar.jpg'), img, { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(ref(s, 'avatars/bob/avatar.jpg'), img, { contentType: 'application/x-sh' }));
});

test('oversized avatars are rejected', async () => {
  const s = env.authenticatedContext('alice').storage();
  const big = new Uint8Array(5 * 1024 * 1024 + 1);
  await assertFails(uploadBytes(ref(s, 'avatars/alice/avatar.jpg'), big, { contentType: 'image/jpeg' }));
});
