import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DEMO_COURSE } from '../lib/lms/demo-course.ts';
import { validateLesson } from '../lib/lms/validation.ts';

test('demo contains three publishable lessons and all six assessment types', () => {
  assert.equal(DEMO_COURSE.title, 'Jak działa Internet? — kurs demonstracyjny');
  assert.equal(DEMO_COURSE.lessons.length, 3);
  assert.deepEqual(DEMO_COURSE.lessons.flatMap(lesson => validateLesson(lesson, true)), []);
  assert.deepEqual(new Set(DEMO_COURSE.lessons.flatMap(lesson => lesson.questions.map(question => question.type))), new Set(['single', 'multiple', 'boolean', 'short', 'matching', 'ordering']));
  for (const lesson of DEMO_COURSE.lessons) {
    assert.equal(lesson.published, true);
    assert.equal(lesson.threshold, 70);
    assert.equal(lesson.questions.length, 2);
    assert.deepEqual(lesson.content.map(variant => variant.styles), [['visual'], ['auditory'], ['kinesthetic']]);
    assert.equal(new Set(lesson.content.map(variant => JSON.stringify(variant.blocks))).size, 3);
    assert.ok(lesson.content[0].blocks.some(block => block.type === 'list'));
    assert.ok(lesson.content[1].blocks.some(block => block.text.includes('do czytania na głos')));
    assert.ok(lesson.content[1].blocks.every(block => String(block.type) !== 'audio'));
    assert.ok(lesson.content[2].blocks.some(block => block.type === 'practice' && block.activity));
  }
});

test('checked-in migration contains the exact TypeScript seed', () => {
  const sql = readFileSync(new URL('../supabase/migrations/202610250006_demo_subject.sql', import.meta.url), 'utf8');
  const seed = sql.match(/\$demo_seed\$([\s\S]*?)\$demo_seed\$/)?.[1];
  assert.ok(seed);
  assert.deepEqual(JSON.parse(seed), DEMO_COURSE);
});
