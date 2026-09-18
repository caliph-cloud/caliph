/* Formlee — editor.js (runs on editor.html) */
(function () {
  "use strict";

  document.getElementById("themeSlot").appendChild(buildThemeControl());

  const artboard = document.getElementById("artboard");
  const panel = document.getElementById("panel");
  const projNameInput = document.getElementById("projName");
  const saveStatus = document.getElementById("saveStatus");

  let current = null;
  let selectedElId = null;
  let saveTimer = null;

  function queueSave() {
    saveStatus.textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await saveProject(current);
      saveStatus.textContent = "All changes saved";
    }, 700);
  }

  function renderArtboard() {
    artboard.innerHTML = "";
    (current.elements || []).slice().sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(el => artboard.appendChild(buildElNode(el)));
  }

  function buildElNode(el) {
    const node = document.createElement("div");
    node.className = "el" + (el.type === "text" ? " text-el" : "");
    node.dataset.id = el.id;
    node.style.left = el.x + "px"; node.style.top = el.y + "px";
    node.style.width = el.w + "px"; node.style.height = el.h + "px";
    node.style.zIndex = el.z || 1;
    if (el.type === "rect") { node.style.background = el.fill; node.style.borderRadius = "4px"; }
    else if (el.type === "ellipse") { node.style.background = el.fill; node.style.borderRadius = "50%"; }
    else if (el.type === "image") { node.style.backgroundImage = `url(${el.src})`; node.style.backgroundSize = "cover"; node.style.backgroundPosition = "center"; node.style.borderRadius = "4px"; }
    else if (el.type === "text") {
      node.textContent = el.text || "Text";
      node.style.fontSize = (el.fontSize || 24) + "px";
      node.style.color = el.color || "#1c1c1f";
      node.style.fontWeight = "600";
    }
    if (el.id === selectedElId) {
      node.classList.add("selected");
      const handle = document.createElement("div");
      handle.className = "handle";
      node.appendChild(handle);
      handle.addEventListener("mousedown", (e) => startResize(e, el));
    }
    node.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("handle")) return;
      selectedElId = el.id;
      renderArtboard(); renderPanel();
      if (el.type !== "text" || !node.isContentEditable) startDrag(e, el);
    });
    if (el.type === "text") {
      node.addEventListener("dblclick", () => { node.contentEditable = "true"; node.focus(); });
      node.addEventListener("blur", () => {
        if (node.isContentEditable) {
          node.contentEditable = "false";
          el.text = node.textContent;
          queueSave();
        }
      });
    }
    return node;
  }

  function startDrag(e, el) {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY, ox = el.x, oy = el.y;
    function move(ev) {
      el.x = Math.max(0, ox + (ev.clientX - startX));
      el.y = Math.max(0, oy + (ev.clientY - startY));
      renderArtboard();
    }
    function up() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      renderArtboard(); renderPanel(); queueSave();
    }
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }
  function startResize(e, el) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, ow = el.w, oh = el.h;
    function move(ev) {
      el.w = Math.max(20, ow + (ev.clientX - startX));
      el.h = Math.max(20, oh + (ev.clientY - startY));
      renderArtboard();
    }
    function up() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      renderPanel(); queueSave();
    }
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  artboard.addEventListener("mousedown", (e) => {
    if (e.target === artboard) { selectedElId = null; renderArtboard(); renderPanel(); }
  });

  document.addEventListener("keydown", (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.isContentEditable)) return;
    if ((e.key === "Delete" || e.key === "Backspace") && selectedElId) {
      current.elements = current.elements.filter(x => x.id !== selectedElId);
      selectedElId = null;
      renderArtboard(); renderPanel(); queueSave();
    }
  });

  function addElement(type) {
    const el = { id: uid8(), type, x: 220, y: 190, w: 160, h: type === "text" ? 40 : 120, z: (current.elements.length + 1) };
    if (type === "rect" || type === "ellipse") el.fill = "#1A73E8";
    if (type === "text") { el.text = "Add a heading"; el.fontSize = 24; el.color = "#202124"; el.w = 220; }
    current.elements.push(el);
    selectedElId = el.id;
    renderArtboard(); renderPanel(); queueSave();
  }
  document.getElementById("addRect").addEventListener("click", () => addElement("rect"));
  document.getElementById("addEllipse").addEventListener("click", () => addElement("ellipse"));
  document.getElementById("addText").addEventListener("click", () => addElement("text"));
  document.getElementById("addImage").addEventListener("click", () => document.getElementById("imgInput").click());
  document.getElementById("imgInput").addEventListener("change", async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const dataUrl = await compressImage(file);
    const el = { id: uid8(), type: "image", x: 220, y: 190, w: 220, h: 160, src: dataUrl, z: (current.elements.length + 1) };
    current.elements.push(el);
    selectedElId = el.id;
    renderArtboard(); renderPanel(); queueSave();
    e.target.value = "";
  });

  function renderPanel() {
    const el = current.elements.find(x => x.id === selectedElId);
    if (!el) { panel.innerHTML = `<div class="panel-empty">Select an element to edit it, or add something from the toolbar.</div>`; return; }
    let fieldsHtml = "";
    if (el.type === "rect" || el.type === "ellipse") {
      fieldsHtml += `<div class="field"><label>Fill color</label><input type="color" id="fFill" value="${el.fill}"></div>`;
    }
    if (el.type === "text") {
      fieldsHtml += `<div class="field"><label>Text color</label><input type="color" id="fColor" value="${el.color}"></div>`;
      fieldsHtml += `<div class="field"><label>Font size</label><input type="range" id="fSize" min="10" max="72" value="${el.fontSize}"></div>`;
    }
    fieldsHtml += `<div class="field"><label>Position &amp; size</label>
      <div class="row2" style="margin-bottom:6px;">
        <input type="number" id="fX" value="${Math.round(el.x)}" title="X">
        <input type="number" id="fY" value="${Math.round(el.y)}" title="Y">
      </div>
      <div class="row2">
        <input type="number" id="fW" value="${Math.round(el.w)}" title="Width">
        <input type="number" id="fH" value="${Math.round(el.h)}" title="Height">
      </div>
    </div>`;
    panel.innerHTML = `
      <h4>Selected element</h4>
      ${fieldsHtml}
      <button class="panel-btn" id="bFront">Bring to front</button>
      <button class="panel-btn" id="bBack">Send to back</button>
      <button class="panel-btn danger" id="bDel">Delete</button>
    `;
    const bind = (id, fn) => { const n = panel.querySelector("#" + id); if (n) n.addEventListener("input", fn); };
    bind("fFill", (e) => { el.fill = e.target.value; renderArtboard(); queueSave(); });
    bind("fColor", (e) => { el.color = e.target.value; renderArtboard(); queueSave(); });
    bind("fSize", (e) => { el.fontSize = +e.target.value; renderArtboard(); queueSave(); });
    bind("fX", (e) => { el.x = +e.target.value; renderArtboard(); queueSave(); });
    bind("fY", (e) => { el.y = +e.target.value; renderArtboard(); queueSave(); });
    bind("fW", (e) => { el.w = +e.target.value; renderArtboard(); queueSave(); });
    bind("fH", (e) => { el.h = +e.target.value; renderArtboard(); queueSave(); });
    panel.querySelector("#bFront").addEventListener("click", () => { el.z = Math.max(0, ...current.elements.map(x => x.z || 0)) + 1; renderArtboard(); queueSave(); });
    panel.querySelector("#bBack").addEventListener("click", () => { el.z = Math.min(0, ...current.elements.map(x => x.z || 0)) - 1; renderArtboard(); queueSave(); });
    panel.querySelector("#bDel").addEventListener("click", () => {
      current.elements = current.elements.filter(x => x.id !== el.id);
      selectedElId = null; renderArtboard(); renderPanel(); queueSave();
    });
  }

  document.getElementById("backBtn").addEventListener("click", () => { window.location.href = "index.html"; });
  projNameInput.addEventListener("input", () => { current.name = projNameInput.value || "Untitled design"; queueSave(); });

  async function boot() {
    await initCloud();
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    current = id ? await getProjectById(id) : null;
    if (!current) {
      toast("Couldn't find that design — starting a new one.");
      current = newProject();
      await saveProject(current);
      history.replaceState(null, "", "editor.html?id=" + encodeURIComponent(current.id));
    }
    projNameInput.value = current.name;
    renderArtboard();
    renderPanel();
  }
  boot();
})();
