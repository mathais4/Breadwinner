import { useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks.js';
import { matchJob, extractSkills, scoreLabel } from '../lib/match.js';
import { COMPETENCIES, QUESTIONS, pickQuestion, storiesFor, storyCompleteness } from '../lib/prep.js';
import { ProgressRing } from '../components/Visuals.jsx';

export default function Prep() {
  const [tab, setTab] = useState('match');
  return (
    <>
      <div className="page-head"><h1>Prep</h1></div>
      <div className="tabs" role="tablist" aria-label="Prep tools">
        <button role="tab" aria-selected={tab === 'match'} onClick={() => setTab('match')}>CV match</button>
        <button role="tab" aria-selected={tab === 'stories'} onClick={() => setTab('stories')}>Interview stories</button>
      </div>
      {tab === 'match' ? <MatchTab /> : <StoriesTab />}
    </>
  );
}

function SkillChips({ skills, tone }) {
  return (
    <ul className="skill-chips">
      {skills.map((s) => <li key={s.name} className={`skill skill-${tone}`}>{s.name}{s.mentions > 1 && <small> ×{s.mentions}</small>}</li>)}
    </ul>
  );
}

function MatchTab() {
  const [cv, setCv] = useLocalStorage('lp.cv', '');
  const [job, setJob] = useState('');
  const result = useMemo(() => (job.trim() ? matchJob(cv, job) : null), [cv, job]);
  const cvSkills = useMemo(() => [...extractSkills(cv).values()], [cv]);

  return (
    <>
      <p className="muted">Paste your CV once, then paste any job description to see which skills it asks for that you already show, and which you don't. Everything runs in your browser.</p>
      <div className="grid-2 prep-grid">
        <label className="card">Your CV (saved in this browser)
          <textarea rows={12} value={cv} onChange={(e) => setCv(e.target.value)} placeholder="Paste the text of your CV…" />
          {cvSkills.length > 0 && <><span className="muted small">Skills detected in your CV ({cvSkills.length})</span><SkillChips skills={cvSkills} tone="have" /></>}
        </label>
        <label className="card">Job description
          <textarea rows={12} value={job} onChange={(e) => setJob(e.target.value)} placeholder="Paste the job description…" />
        </label>
      </div>

      {result && (
        <section className="card match-result" aria-live="polite">
          {result.score === null ? (
            <p className="muted">I couldn't recognise any technical skills in that job description. Try pasting the requirements section.</p>
          ) : (
            <>
              <div className="match-head">
                <ProgressRing value={result.score} max={100} size={112} label="percent match" />
                <div>
                  <h2>{scoreLabel(result.score)}</h2>
                  <p className="muted">{result.matched.length} of {result.jobSkills} skills in the posting appear on your CV. Skills the posting repeats count for more.</p>
                </div>
              </div>
              {result.missing.length > 0 && (
                <>
                  <h3>Missing from your CV</h3>
                  <SkillChips skills={result.missing} tone="missing" />
                  <p className="muted small">If you genuinely have a skill from this list, add it with a concrete example. Don't claim ones you don't.</p>
                </>
              )}
              {result.matched.length > 0 && <><h3>Already covered</h3><SkillChips skills={result.matched} tone="have" /></>}
            </>
          )}
        </section>
      )}
    </>
  );
}

const EMPTY = { title: '', competency: COMPETENCIES[0], situation: '', task: '', action: '', result: '' };

function StoriesTab() {
  const [stories, setStories] = useLocalStorage('lp.stories', []);
  const [draft, setDraft] = useState(null); // null = closed, else a story (with or without id)
  const [question, setQuestion] = useState(null);
  const [focus, setFocus] = useState('');

  const save = (e) => {
    e.preventDefault();
    const story = { ...draft, id: draft.id ?? crypto.randomUUID() };
    setStories((list) => (draft.id ? list.map((s) => (s.id === story.id ? story : s)) : [...list, story]));
    setDraft(null);
  };
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const matches = question ? storiesFor(stories, question.competency) : [];

  return (
    <>
      <p className="muted">Behavioural questions are answered best with a real story in the STAR shape: Situation, Task, Action, Result. Build a small bank now so you aren't improvising in the interview. These stay in this browser.</p>

      <section className="card">
        <h2>Practice</h2>
        <div className="row-actions">
          <select value={focus} onChange={(e) => setFocus(e.target.value)} aria-label="Competency to practise">
            <option value="">Any competency</option>
            {COMPETENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button className="btn primary" onClick={() => setQuestion(pickQuestion(focus, Math.random, question?.id))}>Ask me a question</button>
        </div>
        {question && (
          <div className="question" aria-live="polite">
            <p className="q-text">{question.text}</p>
            <p className="muted small">Competency: {question.competency}</p>
            {matches.length > 0
              ? <p>Stories you could use: {matches.map((s) => <strong key={s.id}>{s.title || 'Untitled'} </strong>)}</p>
              : <p className="muted">You have no {question.competency.toLowerCase()} story yet. <button className="link" onClick={() => setDraft({ ...EMPTY, competency: question.competency })}>Write one</button></p>}
          </div>
        )}
        <p className="muted small">{QUESTIONS.length} questions across {COMPETENCIES.length} competencies.</p>
      </section>

      <div className="page-head sub"><h2>Your stories</h2><button className="btn ghost" onClick={() => setDraft({ ...EMPTY })}>+ Add a story</button></div>

      {draft && (
        <form className="card" onSubmit={save}>
          <div className="row">
            <label>Title<input value={draft.title} onChange={set('title')} required maxLength={120} placeholder="e.g. Final-year project: shipping under deadline" autoFocus /></label>
            <label>Competency<select value={draft.competency} onChange={set('competency')}>{COMPETENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
          {[['situation', 'Situation: what was going on?'], ['task', 'Task: what was your responsibility?'], ['action', 'Action: what did YOU do?'], ['result', 'Result: what happened? Use numbers if you can.']].map(([k, label]) => (
            <label key={k}>{label}<textarea rows={2} value={draft[k]} onChange={set(k)} maxLength={1000} /></label>
          ))}
          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn primary">Save story</button>
          </div>
        </form>
      )}

      {stories.length === 0 && !draft && <div className="card center muted">No stories yet. Aim for one per competency.</div>}
      <ul className="story-list">
        {stories.map((s) => (
          <li key={s.id} className="card">
            <div className="story-head">
              <div><strong>{s.title || 'Untitled'}</strong> <span className="badge badge-wishlist">{s.competency}</span></div>
              <span className="muted small">{Math.round(storyCompleteness(s) * 100)}% complete</span>
            </div>
            <p className="muted">{[s.situation, s.action, s.result].filter(Boolean).join(' · ') || 'Add details to build this story out.'}</p>
            <div className="row-actions">
              <button className="btn ghost small" onClick={() => setDraft(s)}>Edit</button>
              <button className="btn ghost small danger" onClick={() => window.confirm('Delete this story?') && setStories((list) => list.filter((x) => x.id !== s.id))}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
