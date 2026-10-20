// Email templates filled from an application. Plain text, short, and easy to edit before sending.
import { formatDay } from './dates.js';

const greeting = (app) => (app.contact_name ? `Hi ${app.contact_name.split(' ')[0]},` : 'Hi there,');
const sign = (name) => `Kind regards,\n${name || '[Your name]'}`;
const roleAt = (app) => `${app.role} role at ${app.company}`;

export const EMAIL_KINDS = [
  { value: 'follow_up', label: 'Follow up on my application' },
  { value: 'thank_you', label: 'Thank you after an interview' },
  { value: 'feedback', label: 'Ask for feedback after a rejection' },
];

export function buildEmail(kind, app, name) {
  switch (kind) {
    case 'follow_up': {
      const when = app.applied_date ? ` on ${formatDay(app.applied_date)}` : '';
      return {
        subject: `Following up: ${app.role} application`,
        body: `${greeting(app)}\n\nI applied for the ${roleAt(app)}${when} and wanted to check in on the status of my application. I'm still very interested in the opportunity and happy to provide anything else you need.\n\nThank you for your time.\n\n${sign(name)}`,
      };
    }
    case 'thank_you':
      return {
        subject: `Thank you: ${app.role} interview`,
        body: `${greeting(app)}\n\nThank you for taking the time to speak with me about the ${roleAt(app)}. I enjoyed learning more about the team and the work, and it reinforced how keen I am to contribute.\n\nPlease let me know if I can share anything further.\n\n${sign(name)}`,
      };
    case 'feedback':
      return {
        subject: `Feedback request: ${app.role} application`,
        body: `${greeting(app)}\n\nThank you for letting me know about the ${roleAt(app)}. I appreciate the time you spent on my application.\n\nIf you have a moment, I'd be grateful for any feedback that could help me improve for future applications. I'd also welcome being considered for other roles that open up.\n\n${sign(name)}`,
      };
    default:
      throw new Error(`Unknown email kind: ${kind}`);
  }
}

// Suggest the most useful template for where the application currently stands.
export const suggestedKind = (status) => (status === 'interview' || status === 'offer' ? 'thank_you' : status === 'rejected' ? 'feedback' : 'follow_up');
