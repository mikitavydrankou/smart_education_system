import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVariantGroups } from '../lib/lms/variant-groups.ts';

test('groups every selection and assignment without dropping selected styles', () => {
  const styles = ['visual', 'auditory', 'kinesthetic'] as const;
  for (let mask = 1; mask < 8; mask++) {
    const selected = styles.filter((_, index) => mask & (1 << index));
    for (const visual of [1, 2, 3]) for (const auditory of [1, 2, 3]) for (const kinesthetic of [1, 2, 3]) {
      const assignments = { visual, auditory, kinesthetic };
      const groups = buildVariantGroups(selected, assignments);
      assert.equal(groups.length, new Set(selected.map(style => assignments[style])).size);
      assert.deepEqual(groups.flatMap(group => group.styles).sort(), [...selected].sort());
      for (const group of groups) assert.equal(new Set(group.styles.map(style => assignments[style])).size, 1);
    }
  }
});

test('separate, shared, and mixed versions preserve selection order', () => {
  const styles = ['visual', 'auditory', 'kinesthetic'] as const;
  assert.deepEqual(buildVariantGroups(styles, { visual: 1, auditory: 2, kinesthetic: 3 }).map(group => group.styles), [['visual'], ['auditory'], ['kinesthetic']]);
  assert.deepEqual(buildVariantGroups(styles, { visual: 1, auditory: 1, kinesthetic: 1 }).map(group => group.styles), [[...styles]]);
  assert.deepEqual(buildVariantGroups(styles, { visual: 2, auditory: 1, kinesthetic: 2 }).map(group => group.styles), [['visual', 'kinesthetic'], ['auditory']]);
});

test('rejects missing styles, duplicate styles, and invalid assignments', () => {
  assert.throws(() => buildVariantGroups([], {}));
  assert.throws(() => buildVariantGroups(['visual', 'visual'], { visual: 1 }));
  for (const value of [undefined, 0, 4, 1.5, NaN]) assert.throws(() => buildVariantGroups(['visual'], { visual: value }));
});
