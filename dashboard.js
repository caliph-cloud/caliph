/* Formlee — dashboard.js (runs on index.html) */
(function () {
  "use strict";

  document.getElementById("themeSlot").appendChild(buildThemeControl());

  let projects = [];
  let viewMode = "grid";
  let filter = "all";
  let searchQuery = "";

  const listingWrap = document.getElementById("listingWrap");
  const dashTitle = document.getElementById("dashTitle");

  function visibleProjects() {
    let list = projects;
    if (filter === "trash") list = list.filter(p => p.trashed);
    else if (filter === "starred") list = list.filter(p => p.starred && !p.trashed);
    else list = list.filter(p => !p.trashed);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }

  function updateCounts() {
    document.getElementById("countAll").textContent = projects.filter(p => !p.trashed).length;
    document.getElementById("countStar").textContent = projects.filter(p => p.starred && !p.trashed).length;
    document.getElementById("countTrash").textContent = projects.filter(p => p.trashed).length;
  }

  function renderDashboard() {
    updateCounts();
    dashTitle.textContent = filter === "trash" ? "Trash" : filter === "starred" ? "Starred" : "All designs";
    const items = visibleProjects();
    if (items.length === 0) {
      listingWrap.innerHTML = `<div class="empty"><h3>Nothing here yet</h3><div>${
        searchQuery.trim() ? "No designs match your search." :
        filter === "trash" ? "Deleted designs will show up here." : "Start a new design to see it in this view."
      }</div></div>`;
      return;
    }
    if (viewMode === "grid") {
      listingWrap.innerHTML = `<div class="grid"></div>`;
      const grid = listingWrap.querySelector(".grid");
      items.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="thumb">${thumbSvg(p)}</div>
          <div class="card-body">
            <p class="card-name"></p>
            <p class="card-meta">Edited ${fmtDate(p.updatedAt)}</p>
          </div>
          <button class="star-btn ${p.starred ? 'on' : ''}" title="Star">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${p.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg>
          </button>
          <button class="card-menu" title="More">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>
          </button>`;
        card.querySelector(".card-name").textContent = p.name;
        card.addEventListener("click", (e) => { if (e.target.closest(".star-btn") || e.target.closest(".card-menu")) return; openProject(p.id); });
        card.querySelector(".star-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleStar(p.id); });
        card.querySelector(".card-menu").addEventListener("click", (e) => { e.stopPropagation(); showCtx(e, p); });
        grid.appendChild(card);
      });
    } else {
      listingWrap.innerHTML = `<div class="list"></div>`;
      const list = listingWrap.querySelector(".list");
      items.forEach(p => {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `
          <div class="rthumb">${thumbSvg(p)}</div>
          <div class="rname"></div>
          <div class="rmeta">${fmtDate(p.updatedAt)}</div>
          <div class="ractions">
            <button class="star-btn ${p.starred ? 'on' : ''}" style="position:static; opacity:1;" title="Star">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="${p.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg>
            </button>
            <button class="card-menu" style="position:static; opacity:1;" title="More">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>
            </button>
          </div>`;
        row.querySelector(".rname").textContent = p.name;
        row.addEventListener("click", (e) => { if (e.target.closest("button")) return; openProject(p.id); });
        row.querySelector(".star-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleStar(p.id); });
        row.querySelector(".card-menu").addEventListener("click", (e) => { e.stopPropagation(); showCtx(e, p); });
        list.appendChild(row);
      });
    }
  }

  function openProject(id) {
    window.location.href = "editor.html?id=" + encodeURIComponent(id);
  }

  async function toggleStar(id) {
    const p = projects.find(x => x.id === id); if (!p) return;
    p.starred = !p.starred;
    renderDashboard();
    await saveProject(p);
  }

  let ctxEl = null;
  function closeCtx() { if (ctxEl) { ctxEl.remove(); ctxEl = null; } }
  function showCtx(e, p) {
    closeCtx();
    const menu = document.createElement("div");
    menu.className = "ctx-menu";
    menu.style.left = Math.min(e.clientX, window.innerWidth - 170) + "px";
    menu.style.top = e.clientY + "px";
    if (p.trashed) {
      menu.innerHTML = `<button data-a="restore">Restore</button><button data-a="delete" class="danger">Delete forever</button>`;
    } else {
      menu.innerHTML = `<button data-a="rename">Rename</button><button data-a="duplicate">Duplicate</button><button data-a="trash" class="danger">Move to trash</button>`;
    }
    document.body.appendChild(menu);
    ctxEl = menu;
    menu.addEventListener("click", async (ev) => {
      const a = ev.target.dataset.a; if (!a) return;
      closeCtx();
      if (a === "rename") {
        const name = prompt("Rename design", p.name);
        if (name) { p.name = name; renderDashboard(); await saveProject(p); }
      } else if (a === "duplicate") {
        const copy = JSON.parse(JSON.stringify(p));
        copy.id = uid8(); copy.name = p.name + " (copy)"; copy.updatedAt = Date.now();
        projects.unshift(copy); renderDashboard(); await saveProject(copy);
      } else if (a === "trash") {
        p.trashed = true; renderDashboard(); await saveProject(p);
      } else if (a === "restore") {
        p.trashed = false; renderDashboard(); await saveProject(p);
      } else if (a === "delete") {
        if (confirm("Delete this design forever?")) {
          projects = projects.filter(x => x.id !== p.id);
          renderDashboard();
          await deleteProjectPermanent(p.id);
        }
      }
    });
    setTimeout(() => document.addEventListener("click", closeCtx, { once: true }), 0);
  }

  document.querySelectorAll(".nav-item").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("sel"));
      el.classList.add("sel");
      filter = el.dataset.filter;
      renderDashboard();
    });
  });
  document.getElementById("gridBtn").addEventListener("click", () => {
    viewMode = "grid";
    document.getElementById("gridBtn").classList.add("active");
    document.getElementById("listBtn").classList.remove("active");
    renderDashboard();
  });
  document.getElementById("listBtn").addEventListener("click", () => {
    viewMode = "list";
    document.getElementById("listBtn").classList.add("active");
    document.getElementById("gridBtn").classList.remove("active");
    renderDashboard();
  });
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderDashboard();
  });

  /* ---------------- drag & drop new design from image ---------------- */
  const dropzone = document.getElementById("dropzone");
  ["dragenter", "dragover"].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove("drag"); }));
  dropzone.addEventListener("drop", async (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) { toast("Drop an image file to start a design with it."); return; }
    const dataUrl = await compressImage(file);
    const p = newProject(file.name.replace(/\.[a-z0-9]+$/i, "") || "Untitled design");
    p.elements.push({ id: uid8(), type: "image", x: 70, y: 70, w: 500, h: 340, src: dataUrl, z: 1 });
    await saveProject(p);
    openProject(p.id);
  });

  document.getElementById("newDesignBtn").addEventListener("click", async () => {
    const p = newProject();
    await saveProject(p);
    openProject(p.id);
  });

  async function boot() {
    await initCloud();
    projects = await loadProjects();
    renderDashboard();
  }
  boot();
})();
