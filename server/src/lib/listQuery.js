// Builds the WHERE / ORDER BY for the applications list. Pure: no database access.
// Every interpolated fragment comes from a whitelist below, never from user input.

// A user typing "50%" or "a_b" shouldn't get wildcard behaviour.
export const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const SORTS = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  company: 'lower(company)',
  interview_date: 'interview_date',
  applied_date: 'applied_date',
  deadline_date: 'deadline_date',
  follow_up_date: 'follow_up_date',
};
const NULLABLE = new Set(['interview_date', 'applied_date', 'deadline_date', 'follow_up_date']);
export const SORT_KEYS = Object.keys(SORTS);

export function buildListQuery({ userId, q, status, sort = 'created_at', order = 'desc', page = 1, limit = 10 }) {
  const where = ['user_id = $1'];
  const params = [userId];

  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (q) {
    params.push(`%${escapeLike(q)}%`);
    const p = `$${params.length}`;
    const cols = ['company', 'role', 'notes', 'location', 'source'];
    where.push(`(${cols.map((c) => `${c} ILIKE ${p}`).join(' OR ')})`);
  }

  const column = SORTS[sort];
  if (!column) throw new Error(`Unsupported sort: ${sort}`);
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  const nulls = NULLABLE.has(sort) ? ' NULLS LAST' : '';

  return {
    whereSql: where.join(' AND '),
    params,
    orderSql: `${column} ${dir}${nulls}, id DESC`,
    limit,
    offset: (page - 1) * limit,
  };
}
