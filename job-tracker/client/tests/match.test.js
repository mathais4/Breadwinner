import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countMentions, extractSkills, matchJob, scoreLabel } from '../src/lib/match.js';

const names = (text) => [...extractSkills(text).keys()].sort();

test('finds skills case-insensitively with aliases', () => {
  assert.deepEqual(names('Built apps with REACT, nodejs and Postgres; deployed on K8s.'), ['Kubernetes', 'Node.js', 'PostgreSQL', 'React']);
});

test('handles symbols in skill names: C#, C++, .NET, Node.js, CI/CD', () => {
  assert.deepEqual(names('Experience in C# and .NET Core, some C++.'), ['.NET', 'C#', 'C++']);
  assert.deepEqual(names('We use Node.js and CI/CD pipelines.'), ['CI/CD', 'Node.js']);
});

test('does not match skills inside other words', () => {
  // "java" in JavaScript, "go" in "good", "c" in "cat", "sql" in "mysql", "rest" in "interest"
  assert.deepEqual(names('JavaScript is a good language and I have an interest in it'), ['JavaScript']);
  assert.deepEqual(names('cat, music, crest'), []);
  assert.deepEqual(names('MySQL'), ['MySQL']);
});

test('single letter C only matches as a standalone token', () => {
  assert.deepEqual(names('Strong C programming skills'), ['C']);
  assert.deepEqual(names('Vitamin C is good'), ['C']); // known limitation: standalone "C" is ambiguous
});

test('punctuation after a skill is fine, but a trailing dot does not eat the match', () => {
  assert.deepEqual(names('Requirements: Python, SQL. Nice to have: Docker.'), ['Docker', 'Python', 'SQL']);
});

test('countMentions counts every alias', () => {
  assert.equal(countMentions('React, react.js and ReactJS', 'React'), 3);
  assert.equal(countMentions('nothing here', 'React'), 0);
});

test('score is weighted by how often the job mentions a skill (capped at 3)', () => {
  const job = 'Python Python Python Python Python. Also Docker.'; // Python weight 3, Docker weight 1
  assert.equal(matchJob('I know Python', job).score, 75); // 3 / 4
  assert.equal(matchJob('I know Docker', job).score, 25); // 1 / 4
  assert.equal(matchJob('Python and Docker', job).score, 100);
  assert.equal(matchJob('Knitting', job).score, 0);
});

test('lists matched and missing skills, most-mentioned first', () => {
  const r = matchJob('React TypeScript', 'React, TypeScript, AWS AWS, Docker');
  assert.deepEqual(r.matched.map((s) => s.name), ['React', 'TypeScript']);
  assert.deepEqual(r.missing.map((s) => s.name), ['AWS', 'Docker']);
  assert.equal(r.jobSkills, 4);
});

test('no recognised skills in the job gives a null score', () => {
  const r = matchJob('Python', 'We are a friendly team who love biscuits.');
  assert.equal(r.score, null);
  assert.equal(scoreLabel(null), 'No recognised skills');
  assert.equal(scoreLabel(80), 'Strong match');
  assert.equal(scoreLabel(60), 'Decent match');
  assert.equal(scoreLabel(10), 'Stretch: tailor your CV');
});

test('empty inputs do not throw', () => {
  assert.equal(matchJob('', '').score, null);
  assert.equal(matchJob('', 'Python').score, 0);
});

test('an alias that contains another alias counts once', () => {
  assert.equal(countMentions('Node.js', 'Node.js'), 1);
  assert.equal(countMentions('node.js and node and NodeJS', 'Node.js'), 3);
  assert.equal(countMentions('Spring Boot', 'Spring'), 1);
  assert.equal(countMentions('t-sql and SQL', 'SQL'), 2);
});
