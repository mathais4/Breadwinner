// Interview prep: behavioural questions grouped by competency, and the checklist per stage.
export const COMPETENCIES = ['Teamwork', 'Problem solving', 'Leadership', 'Conflict', 'Failure and learning', 'Pressure and time', 'Initiative', 'Customer focus'];

export const QUESTIONS = [
  ['Teamwork', 'Tell me about a time you worked in a team to deliver something. What was your part?'],
  ['Teamwork', 'Describe a group project where not everyone pulled their weight. What did you do?'],
  ['Problem solving', 'Walk me through the hardest bug or technical problem you have solved.'],
  ['Problem solving', 'Tell me about a time you had to learn something new quickly to get a task done.'],
  ['Leadership', 'Give an example of when you took the lead without being asked.'],
  ['Conflict', 'Tell me about a disagreement with a teammate or customer and how you handled it.'],
  ['Failure and learning', 'Describe a time something you built or did went wrong. What did you change afterwards?'],
  ['Failure and learning', 'Tell me about feedback that was hard to hear. What did you do with it?'],
  ['Pressure and time', 'Tell me about a time you had several deadlines at once. How did you prioritise?'],
  ['Pressure and time', 'Describe working under pressure when things were going badly.'],
  ['Initiative', 'Tell me about something you improved that nobody asked you to.'],
  ['Customer focus', 'Describe a time you went out of your way to help a customer or user.'],
].map(([competency, text], i) => ({ id: i, competency, text }));

// rng is injectable so tests are deterministic.
export function pickQuestion(competency = '', rng = Math.random, excludeId = null) {
  let pool = QUESTIONS.filter((q) => (!competency || q.competency === competency) && q.id !== excludeId);
  if (pool.length === 0) pool = QUESTIONS;
  return pool[Math.floor(rng() * pool.length)];
}

export const storiesFor = (stories, competency) => stories.filter((s) => s.competency === competency);

export function storyCompleteness(story) {
  const parts = ['situation', 'task', 'action', 'result'];
  return parts.filter((p) => (story[p] || '').trim().length > 0).length / parts.length;
}

export const CHECKLISTS = {
  wishlist: ['Read the full job description', 'Tailor your CV using the match scorer', 'Check the closing date', 'Submit the application'],
  applied: ['Save a copy of the job description', 'Research the company and its products', 'Set a follow-up date', 'Prepare an online assessment practice slot'],
  interview: ['Re-read the job description', 'Prepare 3 STAR stories', 'Prepare questions to ask them', 'Test your camera, mic and link', 'Send a thank-you email afterwards'],
  offer: ['Check the full terms in writing', 'Ask about start date and onboarding', 'Reply by the deadline'],
  rejected: ['Ask for feedback', 'Note what to improve', 'Keep in touch for future roles'],
};
export const checklistFor = (status) => CHECKLISTS[status] || [];
