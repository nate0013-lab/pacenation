/** Web has no background location; tracking runs while the page is open. */
export async function startBackgroundUpdates(): Promise<boolean> {
  return false;
}
export async function stopBackgroundUpdates(): Promise<void> {}
export function registerBackgroundTask(_onFixes: (fixes: import('./session').RawFix[]) => void): void {}
