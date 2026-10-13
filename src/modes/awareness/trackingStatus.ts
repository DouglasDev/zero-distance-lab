import type { TrackingStatus } from '../headless/trackingMessages.ts';
/** Report both trackers for the deity; switching variants cannot leave another tracker's status behind. */
export function combinedTrackingStatus(
  face: TrackingStatus,
  body: TrackingStatus,
  needsFace: boolean,
  needsBody: boolean,
): TrackingStatus {
  const statuses = [...(needsFace ? [face] : []), ...(needsBody ? [body] : [])];
  if (statuses.length === 0) return 'off';
  if (statuses.length === 1) return statuses[0];
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('loading')) return 'loading';
  return statuses.every((status) => status === 'tracking') ? 'tracking' : 'searching';
}
