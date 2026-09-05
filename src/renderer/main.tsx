import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Field, FieldType, Form } from '../shared/types';
import './styles.css';

const palette: Array<{ type: FieldType; icon: string; name: string }> = [
  ['text', 'T', 'Text input'], ['textarea', '¶', 'Paragraph'], ['number', '#', 'Number'], ['select', '⌄', 'Dropdown'], ['checkbox', '☑', 'Checkbox'], ['radio', '◉', 'Radio group'], ['date', '□', 'Date'], ['file', '↥', 'File upload'], ['section', '§', 'Section'], ['button', '→', 'Button'],
].map(([type, icon, name]) => ({ type: type as FieldType, icon, name }));

const createForm = (): Form => ({ id: crypto.randomUUID(), name: 'Untitled form', fields: [], updatedAt: new Date().toISOString() });
const createField = (type: FieldType): Field => ({ id: crypto.randomUUID(), type, label: type === 'section' ? 'Section heading' : type === 'button' ? 'Submit' : `New ${type === 'textarea' ? 'paragraph' : type}`, placeholder: '', required: false, options: ['Option 1', 'Option 2'] });

function PaletteItem({ item, onAdd }: { item: typeof palette[number]; onAdd(): void }) {
  const draggable = useDraggable({ id: `palette:${item.type}` });
  return <div ref={draggable.setNodeRef} className="palette-item" {...draggable.listeners} {...draggable.attributes}>
    <b>{item.icon}</b><span>{item.name}</span><button aria-label={`Add ${item.name}`} onPointerDown={event => event.stopPropagation()} onClick={onAdd}>＋</button>
  </div>;
}

function FormField({ field, selected, onSelect, onDelete, onDuplicate }: { field: Field; selected: boolean; onSelect(): void; onDelete(): void; onDuplicate(): void }) {
  const sortable = useSortable({ id: field.id });
  return <article ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }} className={`card ${selected ? 'selected' : ''}`} onClick={onSelect} {...sortable.attributes}>
    <button className="drag" aria-label="Drag to reorder" {...sortable.listeners}>⠿</button>
    <div className="preview"><FieldPreview field={field} /></div>
    <div className="actions"><button title="Duplicate field" onClick={event => { event.stopPropagation(); onDuplicate(); }}>⧉</button><button title="Delete field" onClick={event => { event.stopPropagation(); onDelete(); }}>×</button></div>
  </article>;
}

function FieldPreview({ field }: { field: Field }) {
  if (field.type === 'section') return <h2>{field.label}</h2>;
  if (field.type === 'button') return <button type="button">{field.label}</button>;
  return <><label>{field.label}{field.required && <b> *</b>}</label>{field.type === 'textarea' ? <textarea placeholder={field.placeholder} disabled /> : field.type === 'select' ? <select disabled><option>{field.options?.[0] || 'Option'}</option></select> : field.type === 'radio' ? <div className="radio-preview"><input type="radio" disabled /> {field.options?.[0] || 'Option'}</div> : field.type === 'checkbox' ? <input type="checkbox" disabled /> : <input type={field.type === 'number' || field.type === 'date' ? field.type : 'text'} placeholder={field.placeholder} disabled />}{field.helpText && <small>{field.helpText}</small>}</>;
}

function Canvas({ children, empty }: { children: ReactNode; empty: boolean }) {
  const droppable = useDroppable({ id: 'canvas' });
  return <div ref={droppable.setNodeRef} className={`drop-zone ${droppable.isOver ? 'drop-active' : ''}`}>{empty ? <div className="empty">Drop a field here to start building<br/><span>Or use the + button beside a field type</span></div> : children}</div>;
}

function Editor({ field, update, remove }: { field?: Field; update(patch: Partial<Field>): void; remove(): void }) {
  if (!field) return <div className="no-selection"><span>☝</span><h2>Select a field</h2><p>Click any field on the canvas to edit its settings.</p></div>;
  return <><div className="eyebrow">FIELD SETTINGS</div><h2>{palette.find(item => item.type === field.type)?.name}</h2><Edit label="Label" value={field.label} onChange={label => update({ label })} /><Edit label="Help text" value={field.helpText || ''} onChange={helpText => update({ helpText })} />{!['section', 'button', 'checkbox'].includes(field.type) && <Edit label="Placeholder" value={field.placeholder || ''} onChange={placeholder => update({ placeholder })} />}<label className="toggle"><input type="checkbox" checked={Boolean(field.required)} onChange={event => update({ required: event.target.checked })} />Required field</label>{['select', 'radio'].includes(field.type) && <Edit label="Choices (one per line)" value={(field.options || []).join('\n')} onChange={value => update({ options: value.split('\n').filter(Boolean) })} area />}<button className="danger" onClick={remove}>Delete field</button></>;
}

function Edit({ label, value, onChange, area }: { label: string; value: string; onChange(value: string): void; area?: boolean }) { return <label className="edit"><span>{label}</span>{area ? <textarea value={value} onChange={event => onChange(event.target.value)} /> : <input value={value} onChange={event => onChange(event.target.value)} />}</label>; }

function App() {
  const [forms, setForms] = useState<Form[]>([]); const [form, setForm] = useState<Form>(createForm); const [selected, setSelected] = useState<string>(); const [activeLabel, setActiveLabel] = useState(''); const [status, setStatus] = useState('Saved'); const [deploy, setDeploy] = useState(false); const [message, setMessage] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  useEffect(() => { window.formforge.forms.list().then(saved => { setForms(saved); if (saved[0]) setForm(saved[0]); }); }, []);
  useEffect(() => { setStatus('Saving…'); const timer = window.setTimeout(async () => { const updated = { ...form, updatedAt: new Date().toISOString() }; await window.formforge.forms.save(updated); setForms(current => [updated, ...current.filter(item => item.id !== updated.id)]); setStatus('Saved'); }, 550); return () => window.clearTimeout(timer); }, [form]);
  const field = useMemo(() => form.fields.find(item => item.id === selected), [form.fields, selected]);
  const change = (transform: (current: Form) => Form) => setForm(transform);
  const add = (type: FieldType, index = form.fields.length) => { const next = createField(type); change(current => ({ ...current, fields: [...current.fields.slice(0, index), next, ...current.fields.slice(index)] })); setSelected(next.id); };
  const update = (patch: Partial<Field>) => change(current => ({ ...current, fields: current.fields.map(item => item.id === selected ? { ...item, ...patch } : item) }));
  const remove = (id: string) => { change(current => ({ ...current, fields: current.fields.filter(item => item.id !== id) })); if (selected === id) setSelected(undefined); };
  const duplicate = (id: string) => change(current => { const index = current.fields.findIndex(item => item.id === id); const copy = { ...current.fields[index], id: crypto.randomUUID(), label: `${current.fields[index].label} copy` }; return { ...current, fields: [...current.fields.slice(0, index + 1), copy, ...current.fields.slice(index + 1)] }; });
  function dragEnd(event: DragEndEvent) { setActiveLabel(''); const { active, over } = event; if (!over) return; const source = String(active.id); if (source.startsWith('palette:')) { const type = source.slice('palette:'.length) as FieldType; const target = String(over.id); add(type, target === 'canvas' ? form.fields.length : Math.max(0, form.fields.findIndex(item => item.id === target))); return; } if (active.id !== over.id && String(over.id) !== 'canvas') change(current => ({ ...current, fields: arrayMove(current.fields, current.fields.findIndex(item => item.id === active.id), current.fields.findIndex(item => item.id === over.id)) })); }
  async function local() { try { const result = await window.formforge.deploy.local(form); setMessage(`Created a double-clickable local app: ${result.path}`); } catch (error) { setMessage(`Local deployment error: ${(error as Error).message}`); } }
  async function aws() { try { const bucket = (document.getElementById('bucket') as HTMLInputElement).value; const region = (document.getElementById('region') as HTMLSelectElement).value; const result = await window.formforge.deploy.aws(form, { bucket, region, storage: 's3', redeploy: Boolean(form.deployment) }); setMessage(`Published: ${result.url}`); } catch (error) { setMessage(`AWS deployment error: ${(error as Error).message}`); } }
  return <DndContext sensors={sensors} onDragStart={event => setActiveLabel(palette.find(item => `palette:${item.type}` === event.active.id)?.name || '')} onDragCancel={() => setActiveLabel('')} onDragEnd={dragEnd}><header><div className="brand">✦ FormForge</div><input className="form-name" value={form.name} aria-label="Form name" onChange={event => change(current => ({ ...current, name: event.target.value }))} /><span className="saved"><i /> {status}</span><button className="deploy" onClick={() => setDeploy(true)}>Deploy ↗</button></header><main><aside className="palette"><div className="eyebrow">BUILD</div><h3>Fields</h3><p>Drag a field onto the canvas, or add it with +.</p>{palette.map(item => <PaletteItem key={item.type} item={item} onAdd={() => add(item.type)} />)}<hr /><div className="eyebrow">YOUR FORMS</div>{forms.slice(0, 6).map(item => <button className="form-link" onClick={() => { setForm(item); setSelected(undefined); }} key={item.id}>{item.name}</button>)}<button className="new" onClick={() => { const next = createForm(); setForm(next); setSelected(undefined); }}>＋ New form</button></aside><section className="canvas"><div className="canvas-top"><div><div className="eyebrow">FORM BUILDER</div><h1>{form.name}</h1><p>{form.fields.length} fields · Changes save automatically</p></div></div><SortableContext items={form.fields.map(item => item.id)} strategy={verticalListSortingStrategy}><Canvas empty={!form.fields.length}>{form.fields.map(item => <FormField key={item.id} field={item} selected={selected === item.id} onSelect={() => setSelected(item.id)} onDelete={() => remove(item.id)} onDuplicate={() => duplicate(item.id)} />)}</Canvas></SortableContext></section><aside className="editor"><Editor field={field} update={update} remove={() => field && remove(field.id)} /></aside></main>{deploy && <div className="modal"><div><button className="close" onClick={() => setDeploy(false)}>×</button><div className="eyebrow">PUBLISH FORM</div><h2>Deploy {form.name}</h2><button className="deploy-option" onClick={local}><b>▣ Deploy locally</b><small>Creates a double-clickable macOS app with SQLite submissions.</small></button><div className="cloud"><b>☁ Deploy to AWS</b><input id="bucket" placeholder="Existing S3 bucket name" /><select id="region"><option>us-east-1</option><option>us-west-2</option><option>eu-west-1</option></select><button className="deploy" onClick={aws}>Publish to AWS</button></div>{message && <p className="message">{message}</p>}</div></div>}<DragOverlay dropAnimation={null}>{activeLabel && <div className="drag-overlay">{activeLabel}</div>}</DragOverlay></DndContext>;
}
createRoot(document.getElementById('root')!).render(<App />);
