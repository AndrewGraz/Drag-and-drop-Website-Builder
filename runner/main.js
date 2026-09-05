const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { startServer } = require('./server');

app.whenReady().then(async () => {
  const formPath = path.join(process.resourcesPath, 'form.json');
  const dbPath = path.join(app.getPath('userData'), 'submissions.db');
  const port = await startServer(formPath, dbPath);
  const window = new BrowserWindow({ width: 900, height: 700, title: 'FormForge' });
  await window.loadURL(`http://localhost:${port}`);
});
app.on('window-all-closed', () => app.quit());
