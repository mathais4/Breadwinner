import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmail, suggestedKind } from '../src/lib/emails.js';

const app = { company: 'Stripe', role: 'Graduate Software Engineer', applied_date: '2026-10-02', contact_name: 'Aoife Murphy' };

test('follow up mentions role, company, applied date and addresses the contact', () => {
  const e = buildEmail('follow_up', app, 'Stephen');
  assert.equal(e.subject, 'Following up: Graduate Software Engineer application');
  assert.match(e.body, /^Hi Aoife,/);
  assert.match(e.body, /Graduate Software Engineer role at Stripe on 2 Oct/);
  assert.match(e.body.trim(), /Kind regards,\nStephen$/);
});

test('works without a contact, applied date or name', () => {
  const e = buildEmail('follow_up', { company: 'Acme', role: 'Dev' }, '');
  assert.match(e.body, /^Hi there,/);
  assert.doesNotMatch(e.body, / on \d/);
  assert.match(e.body, /\[Your name\]/);
});

test('thank you and feedback templates', () => {
  assert.match(buildEmail('thank_you', app, 'S').subject, /Thank you/);
  assert.match(buildEmail('feedback', app, 'S').body, /feedback/);
  assert.throws(() => buildEmail('nope', app, 'S'), /Unknown email kind/);
});

test('suggestedKind follows the status', () => {
  assert.deepEqual(['applied', 'interview', 'offer', 'rejected', 'wishlist'].map(suggestedKind), ['follow_up', 'thank_you', 'thank_you', 'feedback', 'follow_up']);
});
