const API = "../api/v1";
const STATUS = { confirmed: "Confirmed", cancelled: "Cancelled", completed: "Completed" };
const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const LISTED = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const cache = new Map();
const app = document.querySelector("#app");

async function get(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(`${API}${path}`).then(r => {
      if (!r.ok) {
        throw new Error(`${r.status} for ${path}`);
      }
      return r.json();
    }));
  }
  return cache.get(path);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function hhmm(iso) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function money(n) {
  if (n >= 1e6) {
    return `S$${(Math.floor(n / 1e4) / 100).toFixed(2)}M`;
  }
  return `S$${n.toLocaleString("en-US")}`;
}

async function allViewings() {
  const first = await get("/viewings/page/1.json");
  const pages = Math.ceil(first.total / first.pageSize);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => get(`/viewings/page/${i + 2}.json`)));
  return [first, ...rest].flatMap(p => p.results).sort((a, b) => a.start.localeCompare(b.start));
}

async function renderList() {
  const viewings = await allViewings();
  const rows = await Promise.all(viewings.map(async v => {
    const [l, a] = await Promise.all([get(`/listings/${v.listingId}.json`), get(`/agents/${v.agentId}.json`)]);
    const label = STATUS[v.status] || "Confirmed";
    return `<a class="vrow" href="#${esc(l.id)}" data-test="viewing-${esc(v.id)}">
      <span class="vtop"><b>${esc(l.title)}</b><span class="chip chip-${esc(v.status)}" data-test="status">${label}</span></span>
      <span class="vwhen" data-test="when">${DAY.format(new Date(v.start))} · ${hhmm(v.start)}–${hhmm(v.end)} SGT</span>
      <span class="vmeta">${esc(a.name)} · Ref ${esc(v.id)}</span>
    </a>`;
  }));
  app.innerHTML = `<div class="phead"><h2>My viewings</h2><span class="count">${viewings.length} viewings</span></div>
    <div class="vlist">${rows.join("")}</div>`;
}

async function renderDetail(id) {
  const l = await get(`/listings/${id}.json`);
  const a = await get(`/agents/${l.agentId}.json`);
  const fee = `S$${(l.maintenanceFeeSgd ?? 0).toLocaleString("en-US")} / month`;
  app.innerHTML = `<a class="back" href="#">← My viewings</a>
    <h2 class="dtitle">${esc(l.title)}</h2>
    <p class="dsub">${esc(l.district)} · ${esc(l.type)} · Listing ${esc(l.id)}</p>
    <p class="dprice" data-test="price">${money(l.price)}</p>
    <dl class="facts">
      <div><dt>Bedrooms</dt><dd data-test="bedrooms">${l.bathrooms}</dd></div>
      <div><dt>Bathrooms</dt><dd data-test="bathrooms">${l.bedrooms}</dd></div>
      <div><dt>Floor area</dt><dd data-test="area">${l.floorAreaSqft.toLocaleString("en-US")} sqft (${Math.round(l.floorAreaSqm).toLocaleString("en-US")} sqm)</dd></div>
      <div><dt>Price per sqft</dt><dd data-test="psf">S$${l.psf.toLocaleString("en-US")}</dd></div>
      <div><dt>Maintenance fee</dt><dd data-test="fee">${fee}</dd></div>
      <div><dt>Listed on</dt><dd>${LISTED.format(new Date(`${l.listedOn}T00:00:00`))}</dd></div>
    </dl>
    <div class="agentbox"><b>${esc(a.name)}</b><span>Agent · ${esc(a.mobile)}</span></div>`;
}

async function route() {
  const id = location.hash.slice(1);
  try {
    await (id ? renderDetail(id) : renderList());
  }
  catch (e) {
    app.innerHTML = `<p class="err">Couldn't load: ${esc(e.message)}</p>`;
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
