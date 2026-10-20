import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPETENCIES, QUESTIONS, checklistFor, pickQuestion, storiesFor, storyCompleteness } from '../src/lib/prep.js';

test('every question belongs to a known competency', () => {
  for (const q of QUESTIONS) assert.ok(COMPETENCIES.includes(q.competency), q.competency);
});

test('every competency has at least one question', () => {
  for (const c of COMPETENCIES) assert.ok(QUESTIONS.some((q) => q.competency === c), c);
});

test('pickQuestion is deterministic with an injected rng and respects the filter', () => {
  assert.equal(pickQuestion('Teamwork', () => 0).competency, 'Teamwork');
  assert.equal(pickQuestion('', () => 0).id, QUESTIONS[0].id);
  assert.equal(pickQuestion('', () => 0.9999).id, QUESTIONS.at(-1).id);
});

test('pickQuestion avoids repeating the previous question when it can', () => {
  const first = pickQuestion('Teamwork', () => 0);
  assert.notEqual(pickQuestion('Teamwork', () => 0, first.id).id, first.id);
});

test('story helpers', () => {
  const stories = [{ competency: 'Teamwork', situation: 'a', task: 'b', action: '', result: ' ' }, { competency: 'Conflict' }];
  assert.equal(storiesFor(stories, 'Teamwork').length, 1);
  assert.equal(storyCompleteness(stories[0]), 0.5);
  assert.equal(storyCompleteness(stories[1]), 0);
});

test('checklists exist for each status and unknown ones are empty', () => {
  for (const s of ['wishlist', 'applied', 'interview', 'offer', 'rejected']) assert.ok(checklistFor(s).length > 0, s);
  assert.deepEqual(checklistFor('nope'), []);
});
