import { copyFile, mkdir } from 'node:fs/promises';
const source = new URL('../apps/minfolder/', import.meta.url);
const destination = new URL('../dist/apps/minfolder/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'core.js', 'icon.png', 'favicon.png']) {
  await copyFile(new URL(file, source), new URL(file, destination));
}
console.log('MinFolder published under dist/apps/minfolder/');
