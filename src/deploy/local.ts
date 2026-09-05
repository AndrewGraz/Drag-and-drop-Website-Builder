import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Form } from '../shared/types';

const runnerName = 'FormForge Form Runner.app';

function runnerTemplate(): string {
  const packagedTemplate = path.join(process.resourcesPath, 'runner', runnerName);
  const developmentTemplate = path.resolve(__dirname, '../../runner/dist/mac', runnerName);
  const template = app.isPackaged ? packagedTemplate : developmentTemplate;
  if (!fs.existsSync(template)) {
    throw new Error(`The local runner template is missing. Build it first with \"npm --prefix runner run build\". Expected: ${template}`);
  }
  return template;
}

/** Creates a self-contained, double-clickable macOS form application. */
export function deployLocal(form: Form, downloads: string) {
  if (process.platform !== 'darwin') {
    throw new Error('Local app deployment currently produces a macOS .app. Build the runner on macOS before deploying.');
  }
  const safeName = form.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'FormForge-Form';
  const destination = path.join(downloads, `${safeName}.app`);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(runnerTemplate(), destination, { recursive: true });

  const resources = path.join(destination, 'Contents', 'Resources');
  fs.writeFileSync(path.join(resources, 'form.json'), JSON.stringify(form, null, 2));
  fs.writeFileSync(path.join(destination, 'Contents', 'Info.plist'), fs.readFileSync(path.join(destination, 'Contents', 'Info.plist'), 'utf8').replace(/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, `<key>CFBundleDisplayName</key><string>${safeName}</string>`));

  try {
    execFileSync('codesign', ['--deep', '--force', '--sign', '-', destination], { stdio: 'pipe' });
  } catch (error) {
    fs.rmSync(destination, { recursive: true, force: true });
    throw new Error(`Could not ad-hoc sign the generated app: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { path: destination };
}
