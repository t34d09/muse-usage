// Mac mini Status Widget for Scriptable — Liquid Glass style
// Scriptable には本物の屈折・ぼかし効果がないため、
// 背景の光だまり＋半透明パネル＋明るい縁取り＋上部のツヤで近似している。
// データ: mini-status.json (1時間おきに Muse が更新)

const DATA_URL = "https://raw.githubusercontent.com/t34d09/muse-usage/main/mini-status.json";

const WHITE = Color.white();
const WHITE_65 = new Color("#ffffff", 0.65);
const WHITE_55 = new Color("#ffffff", 0.55);
const GLASS_BG = new Color("#ffffff", 0.10);
const GLASS_EDGE = new Color("#ffffff", 0.30);
const GREEN = new Color("#30d158");
const SKY = new Color("#64d2ff");
const AMBER = new Color("#ffd60a");
const RED = new Color("#ff453a");
const TEAL = new Color("#5eead4");
const PURPLE = new Color("#bf5af2");

function fmtSize(gb) {
  if (gb >= 1024) return (gb / 1024).toFixed(1) + "TB";
  return Math.round(gb) + "GB";
}
function fmtUpdated(d) {
  const f = new DateFormatter();
  f.dateFormat = "M/d HH:mm";
  return f.string(d);
}
function softCircle(ctx, cx, cy, r, color, alpha) {
  // 同心円を重ねて柔らかい光だまりを作る (ぼかしの代用)
  const steps = 14;
  for (let i = steps; i >= 1; i--) {
    const rr = (r * i) / steps;
    const p = new Path();
    p.addEllipse(new Rect(cx - rr, cy - rr, rr * 2, rr * 2));
    ctx.addPath(p);
    ctx.setFillColor(new Color(color, alpha / steps));
    ctx.fillPath();
  }
}
function makeBackdrop() {
  const S = 480;
  const ctx = new DrawContext();
  ctx.size = new Size(S, S);
  ctx.opaque = true;
  ctx.respectScreenScale = true;
  // 深い藍色のベース
  const base = new Path();
  base.addRect(new Rect(0, 0, S, S));
  ctx.addPath(base);
  ctx.setFillColor(new Color("#0d1330"));
  ctx.fillPath();
  // 背景の色が「透けて屈折する」感じの光だまり
  softCircle(ctx, 70, 60, 300, "#5e5ce6", 0.85);
  softCircle(ctx, 430, 130, 260, "#0a84ff", 0.75);
  softCircle(ctx, 120, 430, 280, "#30b0c7", 0.55);
  softCircle(ctx, 450, 460, 240, "#bf5af2", 0.45);
  // 上部のツヤ (鏡面ハイライト)
  const sheen = new Path();
  sheen.addRoundedRect(new Rect(28, 14, S - 56, 44), 22, 22);
  ctx.addPath(sheen);
  ctx.setFillColor(new Color("#ffffff", 0.10));
  ctx.fillPath();
  const sheen2 = new Path();
  sheen2.addRoundedRect(new Rect(60, 20, S - 180, 16), 8, 8);
  ctx.addPath(sheen2);
  ctx.setFillColor(new Color("#ffffff", 0.13));
  ctx.fillPath();
  return ctx.getImage();
}
function glassPanel(parent, radius) {
  const s = parent.addStack();
  s.backgroundColor = GLASS_BG;
  s.cornerRadius = radius || 14;
  s.borderWidth = 1;
  s.borderColor = GLASS_EDGE;
  s.setPadding(8, 10, 8, 10);
  return s;
}
function barImage(usedPercent, colorHex) {
  const width = 220, height = 6;
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const bg = new Path();
  bg.addRoundedRect(new Rect(0, 0, width, height), 3, 3);
  ctx.addPath(bg);
  ctx.setFillColor(new Color("#ffffff", 0.22));
  ctx.fillPath();
  const ratio = Math.max(0, Math.min(100, usedPercent)) / 100;
  const fgW = Math.max(height, width * ratio);
  const fg = new Path();
  fg.addRoundedRect(new Rect(0, 0, fgW, height), 3, 3);
  ctx.addPath(fg);
  ctx.setFillColor(new Color(colorHex, 0.95));
  ctx.fillPath();
  // バー上端の小さなハイライト
  const hl = new Path();
  hl.addRoundedRect(new Rect(2, 1, Math.max(0, fgW - 4), 2), 1, 1);
  ctx.addPath(hl);
  ctx.setFillColor(new Color("#ffffff", 0.35));
  ctx.fillPath();
  return ctx.getImage();
}
function barColor(used) {
  if (used >= 90) return "#ff453a";
  if (used >= 80) return "#ffd60a";
  return "#64d2ff";
}
async function loadData() {
  const req = new Request(DATA_URL);
  req.timeoutInterval = 10;
  return await req.loadJSON();
}

async function createWidget() {
  const w = new ListWidget();
  w.backgroundImage = makeBackdrop();
  w.setPadding(12, 12, 10, 12);

  let data = null;
  try { data = await loadData(); } catch (e) {}

  // ヘッダー: 緑ドット + Mac mini + 更新時刻
  const head = w.addStack();
  head.centerAlignContent();
  const dot = head.addText("●");
  dot.textColor = GREEN;
  dot.font = Font.systemFont(9);
  head.addSpacer(5);
  const title = head.addText("Mac mini");
  title.textColor = WHITE;
  title.font = Font.semiboldSystemFont(13);
  head.addSpacer();
  if (data && data.updated_at) {
    const u = head.addText(fmtUpdated(new Date(data.updated_at)));
    u.textColor = WHITE_55;
    u.font = Font.systemFont(9);
  }
  w.addSpacer(7);

  if (!data || typeof data.cpu_used_percent !== "number") {
    const err = w.addText("取得失敗");
    err.textColor = WHITE;
    err.font = Font.boldSystemFont(20);
    const sub = w.addText("mini-status.json を確認してね");
    sub.textColor = WHITE_65;
    sub.font = Font.systemFont(10);
    return w;
  }

  // CPU / GPU のガラスパネル
  const panel = glassPanel(w, 14);
  panel.centerAlignContent();
  const cpuBox = panel.addStack();
  cpuBox.layoutVertically();
  const cpuLabel = cpuBox.addText("CPU");
  cpuLabel.textColor = WHITE_65;
  cpuLabel.font = Font.systemFont(9);
  const cpuVal = cpuBox.addText(`${Math.round(data.cpu_used_percent)}%`);
  cpuVal.textColor = WHITE;
  cpuVal.font = Font.boldSystemFont(21);
  panel.addSpacer();
  const gpuBox = panel.addStack();
  gpuBox.layoutVertically();
  const gpuLabel = gpuBox.addText("GPU");
  gpuLabel.textColor = WHITE_65;
  gpuLabel.font = Font.systemFont(9);
  const gpuVal = gpuBox.addText(`${Math.round(data.gpu_used_percent || 0)}%`);
  gpuVal.textColor = WHITE;
  gpuVal.font = Font.boldSystemFont(21);
  panel.addSpacer();
  const memBox = panel.addStack();
  memBox.layoutVertically();
  const memLabel = memBox.addText("メモリ");
  memLabel.textColor = WHITE_65;
  memLabel.font = Font.systemFont(9);
  const memVal = memBox.addText(`${Math.round(data.memory_used_percent || 0)}%`);
  memVal.textColor = WHITE;
  memVal.font = Font.boldSystemFont(21);
  w.addSpacer(7);

  // ディスク行
  const disks = Array.isArray(data.disks) ? data.disks : [];
  for (const d of disks) {
    const row = w.addStack();
    row.centerAlignContent();
    const name = row.addText(d.name);
    name.textColor = WHITE;
    name.font = Font.systemFont(10);
    name.lineLimit = 1;
    row.addSpacer(6);
    const img = row.addImage(barImage(d.used_percent || 0, barColor(d.used_percent || 0)));
    img.imageSize = new Size(64, 6);
    row.addSpacer(6);
    const free = row.addText("あと" + fmtSize(d.free_gb || 0));
    free.textColor = WHITE_65;
    free.font = Font.systemFont(9);
    free.lineLimit = 1;
    w.addSpacer(4);
  }

  w.addSpacer();
  const foot = w.addStack();
  if (Array.isArray(data.load_avg)) {
    const l = foot.addText("Load " + data.load_avg.map(v => Number(v).toFixed(1)).join(" "));
    l.textColor = WHITE_55;
    l.font = Font.systemFont(9);
  }
  foot.addSpacer();
  if (data.uptime_text) {
    const up = foot.addText("Up " + data.uptime_text);
    up.textColor = WHITE_55;
    up.font = Font.systemFont(9);
  }

  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  return w;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}
Script.complete();
