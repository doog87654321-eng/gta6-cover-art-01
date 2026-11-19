// Vice City Cover Maker — cover drawing module.
// Draws the multi-panel poster onto any canvas: photos per panel, a colour
// grade, and bold gradient caption lettering. No external assets, no fonts
// shipped: lettering uses a bold system stack plus canvas effects.

export const LAYOUTS = {
  single: { label: 'Single panel', panels: 1 },
  triple: { label: '3-panel poster', panels: 3 },
  grid: { label: '2 x 2 grid', panels: 4 },
};

export const GRADES = {
  sunset: { label: 'Vice City sunset', hint: 'Warm pink-orange dusk' },
  neon: { label: 'Neon night', hint: 'Magenta and cyan glow' },
  noir: { label: 'Noir', hint: 'High-contrast black and white' },
};

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

// Panel rectangles for a layout, with thin gutters between panels.
export function panelRects(layout, w, h) {
  const gap = Math.max(6, Math.round(Math.min(w, h) * 0.008));
  if (layout === 'single') return [{ x: 0, y: 0, w, h }];
  if (layout === 'triple') {
    const pw = (w - gap * 2) / 3;
    return [0, 1, 2].map((i) => ({ x: i * (pw + gap), y: 0, w: pw, h }));
  }
  const pw = (w - gap) / 2;
  const ph = (h - gap) / 2;
  return [
    { x: 0, y: 0, w: pw, h: ph },
    { x: pw + gap, y: 0, w: pw, h: ph },
    { x: 0, y: ph + gap, w: pw, h: ph },
    { x: pw + gap, y: ph + gap, w: pw, h: ph },
  ];
}

// Draw one photo into a rectangle, cover-fit, with pan (-0.5..0.5) and zoom.
export function drawPhoto(ctx, img, rect, panel) {
  if (!img) return false;
  const zoom = panel?.zoom ?? 1;
  const panX = panel?.panX ?? 0;
  const panY = panel?.panY ?? 0;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panX * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + panY * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

// Paint the colour grade over one panel rectangle.
export function applyGrade(ctx, grade, rect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (grade === 'sunset') {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, 'rgba(255, 94, 0, 0.16)');
    g.addColorStop(0.55, 'rgba(255, 0, 110, 0.10)');
    g.addColorStop(1, 'rgba(255, 190, 60, 0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (grade === 'neon') {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
    g.addColorStop(0, 'rgba(0, 229, 255, 0.20)');
    g.addColorStop(0.5, 'rgba(255, 0, 170, 0.10)');
    g.addColorStop(1, 'rgba(120, 0, 255, 0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255, 0, 170, 0.06)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h * 0.5);
  } else if (grade === 'noir') {
    ctx.fillStyle = 'rgba(10, 10, 14, 0.35)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  // Vignette: darkens the panel edges so the caption pops.
  const v = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
  ctx.fillStyle = v;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// Fill a panel with a sunset gradient when it has no photo yet.
export function drawEmptyPanel(ctx, rect, i) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  const stops = [
    ['#2b1055', '#ff2e88', '#ff7a18'],
    ['#0f2027', '#203a43', '#2c5364'],
    ['#42275a', '#734b6d', '#42275a'],
  ][i % 3];
  g.addColorStop(0, stops[0]);
  g.addColorStop(0.55, stops[1]);
  g.addColorStop(1, stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `700 ${Math.round(rect.w * 0.055)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${i + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

// Bold caption lettering: thick dark stroke, sunset gradient fill, shadow,
// slight skew. System font stack only — no font file is shipped.
export function drawCaption(ctx, state, w, h) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;
  const bandH = h * 0.34;
  const band = ctx.createLinearGradient(0, h - bandH, 0, h);
  band.addColorStop(0, 'rgba(10, 0, 24, 0)');
  band.addColorStop(1, 'rgba(10, 0, 24, 0.82)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h - bandH, w, h);

  const pad = w * 0.045;
  let y = h - pad;
  if (title) {
    // Shrink the title until it fits inside the cover with padding to spare.
    let fontSize = Math.max(48, Math.round(w * 0.115));
    const stack = `'Arial Black', 'Helvetica Neue', Arial, sans-serif`;
    ctx.font = `900 ${fontSize}px ${stack}`;
    while (fontSize > 40 && ctx.measureText(title).width > w - pad * 2.4) {
      fontSize -= 4;
      ctx.font = `900 ${fontSize}px ${stack}`;
    }
    ctx.save();
    ctx.translate(pad, y);
    ctx.transform(1, 0, -0.07, 1, 0, 0);
    ctx.font = `900 ${fontSize}px 'Arial Black', 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(255, 0, 120, 0.55)';
    ctx.shadowBlur = fontSize * 0.22;
    ctx.shadowOffsetY = fontSize * 0.05;
    const grad = ctx.createLinearGradient(0, -fontSize, 0, 0);
    grad.addColorStop(0, '#ffe259');
    grad.addColorStop(0.45, '#ffa751');
    grad.addColorStop(1, '#ff2e88');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#16001f';
    ctx.lineWidth = Math.max(6, fontSize * 0.14);
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillText(title, 0, 0);
    ctx.restore();
    y -= fontSize * 1.05;
  }
  if (subtitle) {
    const subSize = Math.max(22, Math.round(w * 0.032));
    ctx.save();
    ctx.font = `800 ${subSize}px 'Arial Black', 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = subSize * 0.3;
    const spaced = subtitle.split('').join(' ');
    ctx.fillText(spaced, pad, y);
    // Pink rule under the subtitle.
    const ruleW = Math.min(w * 0.32, ctx.measureText(spaced).width);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(pad, y + subSize * 0.45, ruleW, Math.max(4, subSize * 0.16));
    ctx.restore();
  }
}

// The main draw: panels + grade + caption onto the given canvas.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const rects = panelRects(state.layout, w, h);
  ctx.fillStyle = '#0b0014';
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    const img = panel?.img;
    if (state.grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.15) brightness(1.05)';
    else if (state.grade === 'neon') ctx.filter = 'saturate(1.35) contrast(1.12)';
    else ctx.filter = 'saturate(1.25) contrast(1.08)';
    const drew = img ? drawPhoto(ctx, img, rect, panel) : false;
    ctx.filter = 'none';
    if (!drew) drawEmptyPanel(ctx, rect, i);
    applyGrade(ctx, state.grade, rect);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.004));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  drawCaption(ctx, state, w, h);
}
