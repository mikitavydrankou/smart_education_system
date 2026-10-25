import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLesson } from '../lib/lms/validation.ts';

test('drafts allow incomplete content while publication requires content and questions', () => {
  const draft = { title: 'Lekcja', position: 1, content: [], questions: [], threshold: 70 };
  assert.deepEqual(validateLesson(draft, false), []);
  assert.ok(validateLesson(draft, true).length >= 2);
});

test('publication rejects overlapping styles and incorrect answer indexes', () => {
  const lesson = { title: 'Lekcja', position: 1, threshold: 70, content: [
    { id: 'a', styles: ['visual'], blocks: [{ id: 'b', type: 'text', text: 'Treść' }] },
    { id: 'c', styles: ['visual'], blocks: [{ id: 'd', type: 'text', text: 'Treść' }] },
  ], questions: [{ id: 'q', type: 'single', prompt: 'Pytanie', options: ['A', 'B'], answer: 3 }] };
  assert.ok(validateLesson(lesson, true).some(error => error.includes('styl')));
  assert.ok(validateLesson(lesson, true).some(error => error.includes('odpowied')));
});

test('all six valid question types can be published together', () => {
  const lesson = { title: 'Lekcja', position: 1, threshold: 70, content: [{ id: 'a', styles: ['visual', 'auditory', 'kinesthetic'], blocks: [{ id: 'b', type: 'text', text: 'Treść' }] }], questions: [
    { id: '1', type: 'single', prompt: 'P', options: ['A', 'B'], answer: 0 },
    { id: '2', type: 'multiple', prompt: 'P', options: ['A', 'B'], answer: [0, 1] },
    { id: '3', type: 'boolean', prompt: 'P', options: ['Prawda', 'Fałsz'], answer: false },
    { id: '4', type: 'short', prompt: 'P', options: [], answer: ['tak'] },
    { id: '5', type: 'matching', prompt: 'P', options: ['A|1', 'B|2'], answer: { A: '1', B: '2' } },
    { id: '6', type: 'ordering', prompt: 'P', options: ['B', 'A'], answer: ['A', 'B'] },
  ] };
  assert.deepEqual(validateLesson(lesson, true), []);
});

test('publication requires audio transcripts and rejects unsafe media schemes', () => {
  const lesson = { title: 'Audio', position: 1, threshold: 70, content: [{ id: 'a', styles: ['auditory'], blocks: [{ id: 'b', type: 'audio', text: '', url: 'javascript:alert(1)' }] }], questions: [{ id: 'q', type: 'boolean', prompt: 'Pytanie', options: ['Prawda', 'Fałsz'], answer: true }] };
  const errors = validateLesson(lesson, true);
  assert.ok(errors.some(error => error.includes('plik')));
  assert.ok(errors.some(error => error.includes('transkrypcji')));
});

test('malformed payloads and nonfinite thresholds are rejected', () => {
  assert.ok(validateLesson(null, false).length);
  assert.ok(validateLesson({ title: 'Lekcja', position: 1, threshold: Infinity, content: [], questions: [] }, false).length);
  assert.ok(validateLesson({ title: 'Lekcja', position: 1.5, threshold: 70, content: [], questions: [] }, false).length);
});

test('private media proxy URLs are allowed while protocol-relative URLs are rejected', () => {
  const makeLesson = (url: string) => ({ title: 'Obraz', position: 1, threshold: 70, content: [{ id: 'a', styles: ['visual'], blocks: [{ id: 'b', type: 'image', text: 'Opis', url }] }], questions: [{ id: 'q', type: 'boolean', prompt: 'Pytanie', options: ['Prawda', 'Fałsz'], answer: true }] });
  assert.deepEqual(validateLesson(makeLesson('/api/lms/files?path=course%2Fimage.png'), true), []);
  assert.ok(validateLesson(makeLesson('//example.com/image.png'), true).length);
  assert.ok(validateLesson(makeLesson('/other/path'), true).length);
});
