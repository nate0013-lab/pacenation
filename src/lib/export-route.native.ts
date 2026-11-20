import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Android and iOS: write the GPX to the cache and open the share sheet (save to Files, email, other apps). */
export async function exportGpx(fileName: string, gpx: string): Promise<'downloaded' | 'shared'> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await Promise.resolve(file.write(gpx));
  if (!(await Sharing.isAvailableAsync())) throw new Error('PN:Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/gpx+xml', UTI: 'com.topografix.gpx', dialogTitle: 'Save or send your route' });
  return 'shared';
}
