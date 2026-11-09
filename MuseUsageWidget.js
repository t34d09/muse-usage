// Muse Usage Widget for Scriptable
// 使い方:
// 1. Scriptable にこのスクリプトを貼る (DATA_URL は設定済み)
// 2. ホーム画面で Scriptable ウィジェット (Small) を置き、このスクリプトを選ぶ
//
// JSON の想定形式:
// {
//   "weekly_left_percent": 27,
//   "weekly_used_percent": 73,
//   "resets_at": "2026-11-10T11:28:00+09:00",
//   "updated_at": "2026-11-09T18:45:00+09:00",
//   "plan": "Power"
// }

const DATA_URL = "https://raw.githubusercontent.com/t34d09/muse-usage/main/muse-usage.json";

function daysUntil(date) {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}
function hoursUntil(date) {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.round(ms / 3600000));
}
function fmtUpdated(d) {
  const f = new DateFormatter();
  f.dateFormat = "M/d HH:mm";
  return f.string(d);
}

async function loadData() {
  const req = new Request(DATA_URL);
  req.timeoutInterval = 10;
  return await req.loadJSON();
}

async function createWidget() {
  const w = new ListWidget();
  w.backgroundColor = new Color("#1c1c22");
  w.setPadding(14, 14, 12, 14);

  let data = null;
  try { data = await loadData(); } catch (e) {}

  const title = w.addText("✦ Muse");
  title.textColor = Color.white();
  title.font = Font.semiboldSystemFont(14);
  w.addSpacer(6);

  const label = w.addText("Weekly");
  label.textColor = new Color("#9a9aa3");
  label.font = Font.systemFont(11);
  w.addSpacer(2);

  if (!data || typeof data.weekly_left_percent !== "number") {
    const err = w.addText("取得失敗");
    err.textColor = Color.white();
    err.font = Font.boldSystemFont(22);
    const sub = w.addText("URLを確認してね");
    sub.textColor = new Color("#9a9aa3");
    sub.font = Font.systemFont(11);
    return w;
  }

  const left = Math.max(0, Math.min(100, Math.round(data.weekly_left_percent)));
  const big = w.addText(`${left}% left`);
  big.textColor = Color.white();
  big.font = Font.boldSystemFont(26);
  w.addSpacer(8);

  // プログレスバー (描画)
  const width = 220, height = 6;
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const bg = new Path();
  bg.addRoundedRect(new Rect(0, 0, width, height), 3, 3);
  ctx.addPath(bg);
  ctx.setFillColor(new Color("#3a3a44"));
  ctx.fillPath();
  const fgWidth = Math.max(height, width * left / 100);
  const fg = new Path();
  fg.addRoundedRect(new Rect(0, 0, fgWidth, height), 3, 3);
  ctx.addPath(fg);
  ctx.setFillColor(new Color("#8b7cf6")); // Muse の紫
  ctx.fillPath();
  const img = w.addImage(ctx.getImage());
  img.imageSize = new Size(140, height);
  w.addSpacer(6);

  if (data.resets_at) {
    const reset = new Date(data.resets_at);
    const days = daysUntil(reset);
    const hours = hoursUntil(reset);
    const txt = days >= 1 ? `Resets in ${days}日` : `Resets in ${hours}時間`;
    const r = w.addText(txt);
    r.textColor = new Color("#9a9aa3");
    r.font = Font.systemFont(11);
  }
  w.addSpacer();

  if (data.updated_at) {
    const u = w.addText(`Updated ${fmtUpdated(new Date(data.updated_at))}`);
    u.textColor = new Color("#6e6e78");
    u.font = Font.systemFont(9);
  }
  // iOS に次の更新を任せる (最短目安)
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return w;
}

const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}
Script.complete();
