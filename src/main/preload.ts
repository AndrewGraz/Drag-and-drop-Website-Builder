import { contextBridge, ipcRenderer } from 'electron';
import type { Form } from '../shared/types';
contextBridge.exposeInMainWorld('formforge', {
  forms: { list: (): Promise<Form[]> => ipcRenderer.invoke('forms:list'), save: (form: Form) => ipcRenderer.invoke('forms:save', form), remove: (id: string) => ipcRenderer.invoke('forms:remove', id) },
  deploy: { local: (form: Form) => ipcRenderer.invoke('deploy:local', form), aws: (form: Form, options: { bucket: string; region: string; storage: 's3' | 'dynamodb'; redeploy: boolean }) => ipcRenderer.invoke('deploy:aws', form, options) }
});
