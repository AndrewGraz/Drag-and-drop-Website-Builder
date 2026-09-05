import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import type { Form } from '../shared/types';
export async function deployAws(form: Form, options: { bucket: string; region: string; storage: 's3' | 'dynamodb'; redeploy: boolean }) {
  if (!options.bucket) throw new Error('Select an S3 bucket before deploying.');
  const client = new S3Client({ region: options.region, credentials: fromIni() }); const key = `${form.id}/index.html`;
  const fields = form.fields.map(f => `<label>${escape(f.label)}${f.required ? ' *' : ''}</label>${input(f)}<small>${escape(f.helpText || '')}</small>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><title>${escape(form.name)}</title><style>body{font:16px system-ui;max-width:680px;margin:4rem auto}label,small,input,textarea,select{display:block;width:100%;margin:.35rem 0}label{font-weight:650}small{color:#667}</style><h1>${escape(form.name)}</h1><form>${fields}<button>Submit</button></form>`;
  await client.send(new PutObjectCommand({ Bucket: options.bucket, Key: key, Body: html, ContentType: 'text/html' })); return { url: `https://${options.bucket}.s3.${options.region}.amazonaws.com/${key}` };
}
function escape(v: string) { return v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]!)); }
function input(f: Form['fields'][number]) { if (f.type === 'section') return ''; if (f.type === 'textarea') return `<textarea ${f.required ? 'required' : ''} placeholder="${escape(f.placeholder || '')}"></textarea>`; if (f.type === 'select' || f.type === 'radio') return `<select>${(f.options || []).map(o => `<option>${escape(o)}</option>`).join('')}</select>`; return `<input type="${f.type === 'number' || f.type === 'date' || f.type === 'file' ? f.type : 'text'}" ${f.required ? 'required' : ''} placeholder="${escape(f.placeholder || '')}">`; }
