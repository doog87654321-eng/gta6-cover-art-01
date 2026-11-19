// Vice City Cover Maker — editor wiring.
// Loads photos (uploads stay on this machine, read with FileReader), lets the
// user pick a panel, drag to pan, zoom, switch layout / grade / size, edit the
// caption, and export the preview canvas as a PNG. Live preview redraws on
// every change. Exposed as window.ViceCover so screenshots can drive it.

import { drawCover, panelRects, LAYOUTS, GRADES, SIZES } from './cover.js';

const SAMPLES = [
  { name: 'Neon street', src: './samples/neon-street.jpg' },
  { name: 'Palm sunset', src: './samples/palm-sunset.jpg' },
  { name: 'Sports car', src: './samples/sports-car.jpg' },
];

export const state = {
  layout: 'triple',
  grade: 'sunset',
  size: 'wide',
  title: 'Sunset Heist',
  subtitle: 'Neon Nights',
  selected: 0,
  panels: [0, 1, 2, 3].map(() => ({ img: null, name: '', panX: 0, panY: 0, zoom: 1 })),
};

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const zoomInput = document.getElementById('zoom');
const zoomValue = document.getElementById('zoomValue');
const panelLabel = document.getElementById('panelLabel');

function setStatus(text) {
  statusEl.textContent = text;
}

function applySize() {
  const s = SIZES[state.size];
  canvas.width = s.w;
  canvas.height = s.h;
}

export function redraw() {
  applySize();
  drawCover(canvas, state);
  const panel = state.panels[state.selected];
  panelLabel.textContent = `Panel ${state.selected + 1} — ${panel.name || 'no photo yet'}`;
  zoomInput.value = String(panel.zoom);
  zoomValue.textContent = `${panel.zoom.toFixed(1)}x`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

export async function loadSampleIntoPanel(sampleIndex, panelIndex) {
  const sample = SAMPLES[sampleIndex % SAMPLES.length];
  try {
    const img = await loadImage(sample.src);
    const panel = state.panels[panelIndex];
    panel.img = img;
    panel.name = sample.name;
    panel.panX = 0;
    panel.panY = 0;
    panel.zoom = 1;
    redraw();
    setStatus(`${sample.name} loaded into panel ${panelIndex + 1}.`);
  } catch (err) {
    setStatus(err.message);
  }
}

async function loadDefaults() {
  // One different sample per panel so the first preview is already a poster.
  await Promise.all([0, 1, 2].map((i) => loadSampleIntoPanel(i, i)));
  await loadSampleIntoPanel(0, 3);
  setStatus('Ready — drag the preview to pan, pick a panel, then export.');
}

function buildButtons(containerId, entries, current, onPick) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  Object.entries(entries).forEach(([key, value]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = value.label;
    button.title = value.hint || value.label;
    button.setAttribute('aria-pressed', String(key === current));
    button.addEventListener('click', () => {
      onPick(key);
      container.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      redraw();
    });
    container.appendChild(button);
  });
}

function buildSampleButtons() {
  const container = document.getElementById('samples');
  container.innerHTML = '';
  SAMPLES.forEach((sample, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = sample.name;
    button.addEventListener('click', () => loadSampleIntoPanel(i, state.selected));
    container.appendChild(button);
  });
}

function pickPanelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const hit = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  return hit === -1 ? null : { index: hit, x, y };
}

// Drag on the preview pans the selected panel; click selects a panel.
let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const hit = pickPanelAt(event.clientX, event.clientY);
  if (!hit) return;
  state.selected = hit.index;
  canvas.setPointerCapture(event.pointerId);
  drag = { startX: event.clientX, startY: event.clientY, panX: state.panels[hit.index].panX, panY: state.panels[hit.index].panY };
  redraw();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[state.selected];
  panel.panX = Math.max(-0.5, Math.min(0.5, drag.panX + (event.clientX - drag.startX) / rect.width));
  panel.panY = Math.max(-0.5, Math.min(0.5, drag.panY + (event.clientY - drag.startY) / rect.height));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const panel = state.panels[state.selected];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom + (event.deltaY < 0 ? 0.1 : -0.1)));
  redraw();
}, { passive: false });

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
zoomInput.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomInput.value);
  redraw();
});

document.getElementById('upload').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const img = await loadImage(reader.result);
      const panel = state.panels[state.selected];
      panel.img = img;
      panel.name = file.name;
      panel.panX = 0;
      panel.panY = 0;
      panel.zoom = 1;
      redraw();
      setStatus(`${file.name} loaded into panel ${state.selected + 1}. Your photo never leaves this machine.`);
    } catch {
      setStatus('That file could not be read as an image.');
    }
  };
  reader.readAsDataURL(file);
});

export function exportPNG(sizeKey) {
  if (sizeKey) state.size = sizeKey;
  redraw();
  const s = SIZES[state.size];
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { setStatus('Export failed in this browser.'); resolve(null); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-city-cover-${s.w}x${s.h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Exported ${s.w} x ${s.h} PNG.`);
      resolve({ w: s.w, h: s.h, bytes: blob.size });
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', () => exportPNG());
document.getElementById('exportSquare').addEventListener('click', () => exportPNG('square'));
document.getElementById('exportPortrait').addEventListener('click', () => exportPNG('portrait'));
document.getElementById('exportWide').addEventListener('click', () => exportPNG('wide'));
document.getElementById('resetPan').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  panel.panX = 0;
  panel.panY = 0;
  panel.zoom = 1;
  redraw();
});

buildButtons('layouts', LAYOUTS, state.layout, (key) => { state.layout = key; });
buildButtons('grades', GRADES, state.grade, (key) => { state.grade = key; });
buildButtons('sizes', SIZES, state.size, (key) => { state.size = key; });
buildSampleButtons();
redraw();
loadDefaults();

// Automation hook for the maker's own screenshots: same app, same canvas.
window.ViceCover = { state, redraw, loadSampleIntoPanel, exportPNG, SIZES };
