const box = document.querySelector("#dc");
const ua = navigator.userAgent;
const isIos = /iPhone|iPad/.test(ua);
const isAndroid = /Android/.test(ua);

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// short hash so edited screenshots stand out
function code(s) {
  let h = 2166136261;
  for (const ch of s) {
    h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  }
  const t = h.toString(36).toUpperCase().padStart(7, "0");
  return `${t.slice(0, 4)}-${t.slice(4)}`;
}

// ios dynamic type size, 17 is the default
function iosBodySize() {
  const p = document.createElement("span");
  p.className = "probe";
  p.textContent = "Aa";
  document.body.append(p);
  const size = parseFloat(getComputedStyle(p).fontSize);
  p.remove();
  return size;
}

async function facts() {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const out = {
    platform: isIos ? "iOS" : isAndroid ? "Android" : "Other",
    osVersion: "",
    device: "",
    appearance: dark ? "Dark" : "Light",
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    orientation: innerWidth < innerHeight ? "Portrait" : "Landscape",
    viewport: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`,
  };
  if (isIos) {
    const v = ua.match(/Version\/(\d+(?:\.\d+)*)/);
    out.osVersion = v ? v[1] : "";
    out.device = "iPhone";
    out.textSize = `${iosBodySize()} pt body text`;
  }
  else if (isAndroid && navigator.userAgentData) {
    try {
      const h = await navigator.userAgentData.getHighEntropyValues(["platformVersion", "model"]);
      out.osVersion = h.platformVersion;
      out.device = h.model;
    }
    catch {
      out.osVersion = "";
    }
  }
  return out;
}

function checks(f) {
  const major = parseInt(f.osVersion, 10) || 0;
  if (f.platform === "iOS") {
    return [
      ["iOS 26 or later", major >= 26],
      ["Dark appearance", f.appearance === "Dark"],
      ["Text size larger than default", parseFloat(f.textSize) > 17],
      ["Language English (UK)", f.language === "en-GB"],
      ["Portrait", f.orientation === "Portrait"],
    ];
  }
  else if (f.platform === "Android") {
    return [
      ["Android 15 or later", major >= 15],
      ["Running on the emulator", /sdk_gphone|emulator/i.test(f.device)],
      ["Dark theme", f.appearance === "Dark"],
      ["Language English (UK)", f.language === "en-GB"],
      ["Time zone Singapore", f.timeZone === "Asia/Singapore"],
    ];
  }
  else {
    return [["An iOS Simulator or Android emulator", false]];
  }
}

async function render() {
  const f = await facts();
  const rows = Object.entries(f).filter(([, v]) => v !== "").map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
  const list = checks(f).map(([label, pass]) => `<tr><td>${esc(label)}</td><td class="${pass ? "ok" : "no"}">${pass ? "✓ Yes" : "✗ No"}</td></tr>`).join("");
  box.innerHTML = `<h2>What this device reports</h2><table>${rows}</table>
    <h2 style="margin-top:18px">Set-up checks</h2><table>${list}</table>
    <p class="code">${code(JSON.stringify(f))}</p>`;
}

render();
