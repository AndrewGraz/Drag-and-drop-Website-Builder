import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { Form } from '../shared/types';
import { deployLocal } from '../deploy/local';
import { deployAws } from '../deploy/aws';

const dataFile = () => path.join(app.getPath('userData'), 'forms.json');
function readForms(): Form[] { try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); } catch { return []; } }
function saveForms(forms: Form[]) { const file = dataFile(); fs.mkdirSync(path.dirname(file), { recursive: true }); const temp = `${file}.tmp`; fs.writeFileSync(temp, JSON.stringify(forms, null, 2)); fs.renameSync(temp, file); }
function createWindow() { const win = new BrowserWindow({ width: 1440, height: 900, minWidth: 1050, minHeight: 700, webPreferences: { preload: path.join(__dirname, 'preload.js') } }); const dev = !app.isPackaged ? 'http://localhost:5173' : undefined; if (dev) win.loadURL(dev); else win.loadFile(path.join(__dirname, '../renderer/index.html')); }
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
ipcMain.handle('forms:list', () => readForms());
ipcMain.handle('forms:save', (_e, form: Form) => { const forms = readForms(); const index = forms.findIndex(f => f.id === form.id); if (index < 0) forms.unshift(form); else forms[index] = form; saveForms(forms); });
ipcMain.handle('forms:remove', (_e, id: string) => saveForms(readForms().filter(f => f.id !== id)));
ipcMain.handle('deploy:local', (_e, form: Form) => deployLocal(form, app.getPath('downloads')));
ipcMain.handle('deploy:aws', async (_e, form: Form, options) => deployAws(form, options));
