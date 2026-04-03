import type { FieldMeta } from '../../types/schema';

export function isHighConfidenceDeterministic(
  meta: Pick<FieldMeta, 'source' | 'confidence'> | undefined,
): boolean {
  return meta?.source === 'deterministic' && meta.confidence === 'high';
}
