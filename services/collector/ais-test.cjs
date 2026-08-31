// Connect to aisstream.io and report whether frames actually arrive.
// Key comes from the environment; never printed.
const WebSocket = require("ws");

const key = process.env.AISSTREAM_API_KEY;
if (!key) { console.log("NO KEY IN ENV"); process.exit(0); }

const bbox = JSON.parse(process.env.AIS_BBOX || '[[[25,-20],[48,15]]]');
const label = process.env.AIS_LABEL || "test";
const WINDOW_MS = Number(process.env.AIS_WINDOW_MS || 30000);

const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
let frames = 0, firstAt = null, opened = null, errText = null;
const t0 = Date.now();

const done = (why) => {
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(JSON.stringify({
    label, why, seconds: Number(secs), frames,
    time_to_open_ms: opened ? opened - t0 : null,
    time_to_first_frame_ms: firstAt ? firstAt - t0 : null,
    key_len: key.length,
    error: errText,
  }));
  try { ws.terminate(); } catch {}
  process.exit(0);
};

const timer = setTimeout(() => done(frames > 0 ? "window elapsed, DATA FLOWING" : "window elapsed, SILENT"), WINDOW_MS);

ws.on("open", () => {
  opened = Date.now();
  ws.send(JSON.stringify({
    APIKey: key,
    BoundingBoxes: bbox,
    FilterMessageTypes: ["PositionReport", "ShipStaticData"],
  }));
});
ws.on("message", (d) => {
  frames++;
  if (frames === 1) {
    firstAt = Date.now();
    const s = d.toString();
    // An error frame is JSON with an "error"/"Error" key rather than AIS data.
    if (s.length < 400 && /error/i.test(s)) errText = s.slice(0, 200);
  }
});
ws.on("error", (e) => { errText = String(e.message).slice(0, 200); clearTimeout(timer); done("socket error"); });
ws.on("close", (c, r) => { errText = errText || `close ${c} ${r.toString().slice(0, 120)}`; clearTimeout(timer); done("closed by server"); });
