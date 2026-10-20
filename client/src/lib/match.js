// CV <-> job description matcher. Fully deterministic (no AI, no network): it looks for known
// technical skills in both texts, weights each by how often the job description mentions it,
// and reports what you cover and what's missing.

// [canonical name, category, ...aliases]. Matching is case-insensitive and whole-word.
const SKILLS = [
  ['JavaScript', 'Languages', 'js', 'ecmascript', 'es6'], ['TypeScript', 'Languages', 'ts'], ['Python', 'Languages'],
  ['Java', 'Languages'], ['C#', 'Languages', 'c sharp'], ['C++', 'Languages', 'cpp'], ['C', 'Languages', 'c programming'],
  ['Go', 'Languages', 'golang'], ['Rust', 'Languages'], ['Kotlin', 'Languages'], ['Swift', 'Languages'], ['PHP', 'Languages'],
  ['Ruby', 'Languages'], ['Scala', 'Languages'], ['Bash', 'Languages', 'shell scripting', 'shell'], ['SQL', 'Data', 't-sql', 'pl/sql'],
  ['HTML', 'Frontend', 'html5'], ['CSS', 'Frontend', 'css3', 'sass', 'scss'], ['React', 'Frontend', 'react.js', 'reactjs'],
  ['Angular', 'Frontend', 'angularjs'], ['Vue', 'Frontend', 'vue.js', 'vuejs'], ['Next.js', 'Frontend', 'nextjs'],
  ['Redux', 'Frontend'], ['Tailwind', 'Frontend', 'tailwindcss'], ['Node.js', 'Backend', 'node', 'nodejs'],
  ['Express', 'Backend', 'express.js', 'expressjs'], ['Django', 'Backend'], ['Flask', 'Backend'], ['FastAPI', 'Backend'],
  ['Spring', 'Backend', 'spring boot', 'springboot'], ['.NET', 'Backend', 'dotnet', 'asp.net', '.net core'],
  ['REST', 'Backend', 'rest api', 'restful', 'restful apis'], ['GraphQL', 'Backend'], ['gRPC', 'Backend'],
  ['Microservices', 'Backend', 'microservice'], ['PostgreSQL', 'Data', 'postgres'], ['MySQL', 'Data'], ['MongoDB', 'Data', 'mongo'],
  ['Redis', 'Data'], ['SQLite', 'Data'], ['NoSQL', 'Data'], ['Kafka', 'Data'], ['Elasticsearch', 'Data'],
  ['Pandas', 'Data'], ['NumPy', 'Data'], ['Machine Learning', 'Data', 'ml'], ['Deep Learning', 'Data'], ['TensorFlow', 'Data'],
  ['PyTorch', 'Data'], ['Data Analysis', 'Data', 'data analytics'], ['Power BI', 'Data', 'powerbi'], ['Tableau', 'Data'],
  ['AWS', 'Cloud & DevOps', 'amazon web services'], ['Azure', 'Cloud & DevOps'], ['GCP', 'Cloud & DevOps', 'google cloud'],
  ['Docker', 'Cloud & DevOps'], ['Kubernetes', 'Cloud & DevOps', 'k8s'], ['Terraform', 'Cloud & DevOps'], ['Ansible', 'Cloud & DevOps'],
  ['CI/CD', 'Cloud & DevOps', 'ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment'],
  ['GitHub Actions', 'Cloud & DevOps'], ['Jenkins', 'Cloud & DevOps'], ['Linux', 'Cloud & DevOps', 'unix'], ['DevOps', 'Cloud & DevOps'],
  ['Git', 'Practice', 'github', 'gitlab', 'version control'], ['Agile', 'Practice'], ['Scrum', 'Practice'], ['Jira', 'Practice'],
  ['Unit Testing', 'Practice', 'unit tests', 'jest', 'vitest', 'junit', 'pytest', 'test-driven development', 'tdd'],
  ['Data Structures', 'Practice', 'data structures and algorithms', 'dsa'], ['Algorithms', 'Practice', 'algorithm'],
  ['OOP', 'Practice', 'object-oriented', 'object oriented'], ['System Design', 'Practice'], ['Code Review', 'Practice', 'code reviews'],
  ['API Design', 'Practice', 'api development'], ['Security', 'Practice', 'cybersecurity', 'secure coding', 'owasp'],
  ['Networking', 'Practice', 'tcp/ip'], ['Figma', 'Practice'], ['Accessibility', 'Practice', 'wcag', 'a11y'],
  ['Communication', 'Soft skills', 'communication skills', 'communicate'], ['Teamwork', 'Soft skills', 'team player', 'collaborate', 'collaboration'],
  ['Problem Solving', 'Soft skills', 'problem-solving', 'analytical'], ['Leadership', 'Soft skills'],
];

const SKILL_LIST = SKILLS.map(([name, category, ...aliases]) => ({ name, category, terms: [name, ...aliases] }));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
// "C", "C#", "C++", ".NET" and "Node.js" break plain \b word boundaries, so use explicit edges.
const termRegex = (term) => new RegExp(`(?:^|[^a-z0-9+#.])${escapeRegex(term.toLowerCase())}(?=$|[^a-z0-9+#])`, 'g');
const PATTERNS = new Map(SKILL_LIST.map((s) => [s.name, s.terms.map((term) => ({ length: term.length, re: termRegex(term) }))]));

// How many times the text mentions the skill (any alias). Overlapping hits count once, so "react.js"
// is one mention of React, not two (the "react" alias and the "react.js" alias).
export function countMentions(text, skillName) {
  const t = ` ${String(text).toLowerCase()} `;
  const hits = [];
  for (const { length, re } of PATTERNS.get(skillName) || []) {
    for (const m of t.matchAll(re)) {
      const start = m.index + m[0].length - length; // the match may include one leading boundary character
      hits.push({ start, end: start + length });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end); // earliest first, longest first on ties
  let count = 0;
  let lastEnd = -1;
  for (const h of hits) {
    if (h.start >= lastEnd) {
      count += 1;
      lastEnd = h.end;
    }
  }
  return count;
}

export function extractSkills(text) {
  const found = new Map();
  for (const s of SKILL_LIST) {
    const n = countMentions(text, s.name);
    if (n > 0) found.set(s.name, { name: s.name, category: s.category, mentions: n });
  }
  return found;
}

// Skills the job asks for repeatedly matter more, but capped so one buzzword can't dominate.
const weight = (mentions) => Math.min(3, mentions);

export function matchJob(cvText, jobText) {
  const cv = extractSkills(cvText);
  const job = [...extractSkills(jobText).values()];
  if (job.length === 0) return { score: null, matched: [], missing: [], jobSkills: 0 };

  const matched = job.filter((s) => cv.has(s.name)).sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name));
  const missing = job.filter((s) => !cv.has(s.name)).sort((a, b) => b.mentions - a.mentions || a.name.localeCompare(b.name));
  const total = job.reduce((sum, s) => sum + weight(s.mentions), 0);
  const have = matched.reduce((sum, s) => sum + weight(s.mentions), 0);
  return { score: Math.round((have / total) * 100), matched, missing, jobSkills: job.length };
}

export const scoreLabel = (score) => (score === null ? 'No recognised skills' : score >= 75 ? 'Strong match' : score >= 50 ? 'Decent match' : 'Stretch: tailor your CV');
