/// <reference types="vite/client" />
import type { Form } from '../shared/types';
declare global { interface Window { formforge: { forms: { list(): Promise<Form[]>; save(form: Form): Promise<void>; remove(id: string): Promise<void> }; deploy: { local(form: Form): Promise<{ path: string }>; aws(form: Form, options: { bucket: string; region: string; storage: 's3' | 'dynamodb'; redeploy: boolean }): Promise<{ url: string }> } } } }
export {};
