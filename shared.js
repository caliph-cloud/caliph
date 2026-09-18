/* Formlee — shared.js
   Theme switching, Material ripple effect, toast notifications, and the
   cloud-save layer (falls back to localStorage automatically when this
   page isn't running inside a Claude artifact). Loaded on every page. */

/* ---------------- theme ---------------- */
const THEME_KEY = "formlee_theme_pref";

function applyTheme(pref) {
  if (pref === "light" || pref === "dark") document.documentElement.dataset.theme = pref;
  else delete document.documentElement.dataset.theme;
}
function currentThemePref() {
  return localStorage.getItem(THEME_KEY) || "system";
}
applyTheme(currentThemePref());

function buildThemeControl() {
  const wrap = document.createElement("div");
  wrap.className = "theme-menu";
  wrap.innerHTML = `
    <button class="icon-btn" title="Theme">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    </button>
    <div class="theme-pop">
      <button data-t="system">System</button>
      <button data-t="light">Light</button>
      <button data-t="dark">Dark</button>
    </div>`;
  const btn = wrap.querySelector(".icon-btn");
  const pop = wrap.querySelector(".theme-pop");
  function refresh() {
    const pref = currentThemePref();
    pop.querySelectorAll("button").forEach(b => b.classList.toggle("sel", b.dataset.t === pref));
  }
  btn.addEventListener("click", (e) => { e.stopPropagation(); pop.classList.toggle("open"); refresh(); });
  pop.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      localStorage.setItem(THEME_KEY, b.dataset.t);
      applyTheme(b.dataset.t);
      pop.classList.remove("open");
    });
  });
  document.addEventListener("click", () => pop.classList.remove("open"));
  refresh();
  return wrap;
}

/* ---------------- material ripple (event delegation) ---------------- */
const RIPPLE_SELECTOR = ".icon-btn, .new-btn, .tool-btn, .back-btn, .panel-btn, .view-toggle button, .ctx-menu button, .card-menu, .star-btn, .nav-item";
document.addEventListener("pointerdown", (e) => {
  const host = e.target.closest(RIPPLE_SELECTOR);
  if (!host) return;
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement("span");
  span.className = "ripple";
  span.style.width = span.style.height = size + "px";
  span.style.left = (e.clientX - rect.left - size / 2) + "px";
  span.style.top = (e.clientY - rect.top - size / 2) + "px";
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.style.overflow = "hidden";
  host.appendChild(span);
  span.addEventListener("animationend", () => span.remove());
});

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg) {
  let toastEl = document.getElementById("toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "toast";
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

/* ---------------- cloud (db) setup, with localStorage fallback ---------------- */
let db = null, userNS = null, uid = null, cloudReady = false;
const LOCAL_KEY = "formlee_local_projects";

function localList() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); } catch (e) { return []; }
}
function localSaveAll(list) { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); }

async function initCloud() {
  try {
    if (window.claude && typeof window.claude.use === "function") {
      db = await window.claude.use("db");
      userNS = await window.claude.use("user");
    }
  } catch (e) { db = null; userNS = null; }
  if (db && userNS) {
    try { uid = await userNS.id(); } catch (e) { uid = null; }
  }
  cloudReady = !!(db && uid);
  if (!cloudReady) toast("Cloud save isn't available here — saving in this browser only.");
}

function projectsPath() { return `data/users/${uid}/projects`; }

async function loadProjects() {
  if (cloudReady) {
    try {
      const snap = await db.collection(projectsPath()).orderBy("updatedAt", "desc").get();
      return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    } catch (e) { toast("Couldn't load your cloud designs — showing local ones."); return localList(); }
  }
  return localList().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function getProjectById(id) {
  if (cloudReady) {
    try {
      const doc = await db.collection(projectsPath()).doc(id).get();
      return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
    } catch (e) { /* fall through to local */ }
  }
  return localList().find(p => p.id === id) || null;
}

async function saveProject(p) {
  p.updatedAt = Date.now();
  if (cloudReady) {
    try { await db.collection(projectsPath()).doc(p.id).set(p); return true; }
    catch (e) { toast("Cloud save failed — kept locally."); }
  }
  const list = localList();
  const idx = list.findIndex(x => x.id === p.id);
  if (idx >= 0) list[idx] = p; else list.push(p);
  localSaveAll(list);
  return true;
}

async function deleteProjectPermanent(id) {
  if (cloudReady) {
    try { await db.collection(projectsPath()).doc(id).delete(); return; } catch (e) { /* fall through */ }
  }
  localSaveAll(localList().filter(x => x.id !== id));
}

function uid8() { return Math.random().toString(36).slice(2, 10); }

function newProject(name) {
  return { id: uid8(), name: name || "Untitled design", elements: [], starred: false, trashed: false, updatedAt: Date.now() };
}

function compressImage(file, maxW) {
  maxW = maxW || 480;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function thumbSvg(p) {
  const w = 190, h = 120;
  let inner = `<rect width="${w}" height="${h}" fill="var(--surface-2)"/>`;
  (p.elements || []).forEach(el => {
    const sx = w / 640, sy = h / 480;
    const x = el.x * sx, y = el.y * sy, ew = el.w * sx, eh = el.h * sy;
    if (el.type === "rect") inner += `<rect x="${x}" y="${y}" width="${ew}" height="${eh}" fill="${el.fill}"/>`;
    else if (el.type === "ellipse") inner += `<ellipse cx="${x + ew / 2}" cy="${y + eh / 2}" rx="${ew / 2}" ry="${eh / 2}" fill="${el.fill}"/>`;
    else if (el.type === "text") inner += `<text x="${x + 2}" y="${y + eh / 2 + 3}" font-size="${Math.max(5, (el.fontSize || 24) * sy)}" fill="${el.color || '#333'}">${(el.text || "").slice(0, 18).replace(/</g, "")}</text>`;
    else if (el.type === "image") inner += `<image href="${el.src}" x="${x}" y="${y}" width="${ew}" height="${eh}" preserveAspectRatio="xMidYMid slice"/>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
