const express = require('express');
const Database = require('better-sqlite3');
const fs = require('node:fs');

function escape(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function renderField(field) {
  const required = field.required ? ' required' : '';
  const placeholder = escape(field.placeholder || '');
  if (field.type === 'section') return `<h2>${escape(field.label)}</h2>`;
  if (field.type === 'button') return '';
  if (field.type === 'textarea') return `<textarea name="${escape(field.id)}" placeholder="${placeholder}"${required}></textarea>`;
  if (field.type === 'select') return `<select name="${escape(field.id)}"${required}>${(field.options || []).map(option => `<option>${escape(option)}</option>`).join('')}</select>`;
  if (field.type === 'radio') return (field.options || []).map(option => `<label><input type="radio" name="${escape(field.id)}" value="${escape(option)}"${required}> ${escape(option)}</label>`).join('');
  if (field.type === 'checkbox') return `<input name="${escape(field.id)}" type="checkbox"${required}>`;
  const type = ['number', 'date', 'file'].includes(field.type) ? field.type : 'text';
  return `<input name="${escape(field.id)}" type="${type}" placeholder="${placeholder}"${required}>`;
}

function startServer(formPath, dbPath) {
  return new Promise(resolve => {
    const form = JSON.parse(fs.readFileSync(formPath, 'utf8'));
    const web = express();
    const db = new Database(dbPath);
    db.exec('CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY, created_at TEXT, data TEXT)');
    web.use(express.urlencoded({ extended: true }));
    web.get('/', (_request, response) => {
      const fields = form.fields.map(field => `<label>${escape(field.label)}${field.required ? ' *' : ''}</label>${renderField(field)}${field.helpText ? `<small>${escape(field.helpText)}</small>` : ''}<br>`).join('');
      response.send(`<!doctype html><title>${escape(form.name)}</title><style>body{font:16px system-ui;max-width:680px;margin:3rem auto}label,input,textarea,select,small{display:block;margin:.4rem 0}input,textarea,select{width:100%;padding:.5rem}small{color:#667}</style><h1>${escape(form.name)}</h1><form method="post">${fields}<button>Submit</button></form>`);
    });
    web.post('/', (request, response) => { db.prepare('INSERT INTO submissions(created_at, data) VALUES (?, ?)').run(new Date().toISOString(), JSON.stringify(request.body)); response.send('<h1>Thank you!</h1>'); });
    web.get('/export.csv', (_request, response) => { const rows = db.prepare('SELECT * FROM submissions').all(); response.type('text/csv').send(`id,created_at,data\n${rows.map(row => `${row.id},${row.created_at},"${String(row.data).replace(/"/g, '""')}"`).join('\n')}`); });
    const server = web.listen(0, () => resolve(server.address().port));
  });
}
module.exports = { startServer };
