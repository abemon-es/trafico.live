// Probe aisstream.io subscription variants to find which one actually streams.
// Key from env; never printed. Each variant gets its own short window.
const WebSocket = require("ws");
const key = process.env.AISSTREAM_API_KEY;
if (!key) { console.log("NO KEY"); process.exit(1); }

const WINDOW = Number(process.env.WINDOW_MS || 12000);

const variants = [
  ["current-code (spanish bbox + 4 filters)", {
    APIKey: key,
    BoundingBoxes: [[[25, -20], [48, 15]]],
    FilterMessageTypes: ["PositionReport", "ShipStaticData", "StandardClassBPositionReport", "ExtendedClassBPositionReport"],
  }],
  ["no FilterMessageTypes", {
    APIKey: key,
    BoundingBoxes: [[[25, -20], [48, 15]]],
  }],
  ["global bbox, no filters", {
    APIKey: key,
    BoundingBoxes: [[[-90, -180], [90, 180]]],
  }],
  ["lowercase Apikey", {
    Apikey: key,
    BoundingBoxes: [[[-90, -180], [90, 180]]],
  }],
  ["APIKey + FiltersShipMMSI empty", {
    APIKey: key,
    BoundingBoxes: [[[-90, -180], [90, 180]]],
    FiltersShipMMSI: [],
  }],
];

function probe(name, payload) {
  return new Promise((resolve) => {
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    let frames = 0, first = null, note = null, opened = false;
    const t0 = Date.now();
    const fin = (why) => {
      try { ws.terminate(); } catch {}
      resolve({ name, why, frames, ms_to_first: first ? first - t0 : null, note });
    };
    const timer = setTimeout(() => fin(frames > 0 ? "STREAMING" : "silent"), WINDOW);
    ws.on("open", () => { opened = true; ws.send(JSON.stringify(payload)); });
    ws.on("message", (d) => {
      frames++;
      if (frames === 1) {
        first = Date.now();
        const s = d.toString();
        if (s.length < 500 && /error/i.test(s)) note = s.slice(0, 180);
      }
    });
    ws.on("error", (e) => { note = String(e.message).slice(0, 120); clearTimeout(timer); fin("socket error"); });
    ws.on("close", (c, r) => {
      note = note || `close=${c} ${r.toString().slice(0, 120)}`.trim();
      clearTimeout(timer); fin(opened ? "closed after open" : "closed before open");
    });
  });
}

(async () => {
  for (const [name, payload] of variants) {
    const r = await probe(name, payload);
    console.log(
      `${r.frames > 0 ? "✅" : "❌"} ${r.name.padEnd(42)} frames=${String(r.frames).padStart(5)} ${r.why}` +
      (r.note ? `  | ${r.note}` : "")
    );
  }
})();
