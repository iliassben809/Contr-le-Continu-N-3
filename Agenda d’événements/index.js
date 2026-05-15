// ========================================================================================================================
//                                          Agenda d'Événements 
//                                 ILIAS BENAZZOUZA & LAHCEN SAHRAOUI  
// ========================================================================================================================

// ── État global ──
var events = JSON.parse(localStorage.getItem("agenda_events") || "[]");
var currentFilter = "all", currentView = "grid", deleteTargetId = "";

// ── Utilitaires ──
var genId = () => Date.now() + "" + Math.floor(Math.random() * 1000);
var getToday = () => new Date().toISOString().slice(0, 10);
var formatDate = s => s ? s.split("-").reverse().join("/") : "";
var pad = n => n < 10 ? "0" + n : n;

var CAT = {
    travail: { cls: "work", label: "💼 Travail" },
    perso: { cls: "perso", label: "🏠 Personnel" },
    sante: { cls: "sante", label: "❤️ Santé" },
    social: { cls: "social", label: "🎉 Social" },
    
};
var getCat = (cat, key) => (CAT[cat] || { cls: "autre", label: "📌 Autre" })[key];

// ── Persistance ──
var saveEvents = () => localStorage.setItem("agenda_events", JSON.stringify(events));

// ── Formulaire ──
var $ = id => document.getElementById(id);
var getForm = () => ({
    title: $("inp-title").value.trim(),
    date: $("inp-date").value,
    time: $("inp-time").value,
    cat: $("inp-cat").value,
    desc: $("inp-desc").value.trim(),
    editId: $("edit-id").value,
});
var clearForm = () => {
    ["inp-title", "inp-time", "inp-desc"].forEach(id => $(id).value = "");
    $("inp-date").value = getToday();
    $("inp-cat").value = "travail";
};

// ── CRUD ──
function saveEvent() {
    var f = getForm();
    if (!f.title) return showToast("Le titre est obligatoire.", "danger");
    if (!f.date) return showToast("La date est obligatoire.", "danger");

    if (f.editId) {
        events = events.map(e => e.id === f.editId ? { ...e, ...f, id: e.id } : e);
        cancelEdit();
        showToast("Événement modifié avec succès.", "success");
    } else {
        events.unshift({ id: genId(), title: f.title, date: f.date, time: f.time, cat: f.cat, desc: f.desc });
        clearForm();
        showToast("Événement ajouté avec succès.", "success");
    }
    saveEvents(); renderEvents(); updateStats();
}

function startEdit(id) {
    var ev = events.find(e => e.id === id);
    if (!ev) return;
    ["title", "date", "time", "cat", "desc"].forEach(k => $("inp-" + k).value = ev[k]);
    $("edit-id").value = ev.id;
    $("form-title").innerHTML = '<i class="bi bi-pencil me-2"></i>Modifier l\'événement';
    $("btn-label").textContent = "Enregistrer les modifications";
    $("cancel-btn").style.display = "block";
    document.querySelector(".sidebar").scrollTop = 0;
}

function cancelEdit() {
    clearForm();
    $("edit-id").value = "";
    $("form-title").innerHTML = '<i class="bi bi-plus-circle me-2"></i>Ajouter un événement';
    $("btn-label").textContent = "Ajouter l'événement";
    $("cancel-btn").style.display = "none";
}

function confirmDelete(id) {
    deleteTargetId = id;
    openModal();
}

$("confirm-delete-btn").addEventListener("click", () => {
    if (!deleteTargetId) return;
    events = events.filter(e => e.id !== deleteTargetId);
    saveEvents(); renderEvents(); updateStats();
    showToast("Événement supprimé.", "danger");
    deleteTargetId = "";
    closeModal();
});

// ── Affichage ──
function buildCard(ev) {
    var cls = getCat(ev.cat, "cls");
    return `
    <div class="event-card" id="card-${ev.id}">
      <div class="card-stripe stripe-${cls}"></div>
      <div class="card-body-inner">
        <div class="event-meta">
          <span class="cat-badge cat-${cls}">${getCat(ev.cat, "label")}</span>
          <span class="date-chip"><i class="bi bi-calendar3 me-1"></i>${formatDate(ev.date)}</span>
        </div>
        <div class="event-title">${ev.title}</div>
        ${ev.time ? `<div class="event-time"><i class="bi bi-clock"></i> ${ev.time}</div>` : ""}
        ${ev.desc ? `<div class="event-desc">${ev.desc}</div>` : ""}
        <div class="card-actions">
          <button class="btn-icon edit" onclick="startEdit('${ev.id}')"><i class="bi bi-pencil"></i> Modifier</button>
          <button class="btn-icon del"  onclick="confirmDelete('${ev.id}')"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>`;
}

function renderEvents() {
    var search = $("search-input").value.toLowerCase();
    var filtered = events
        .filter(e => (currentFilter === "all" || e.cat === currentFilter) &&
            (!search || e.title.toLowerCase().includes(search) || e.desc.toLowerCase().includes(search)))
        .sort((a, b) => a.date.localeCompare(b.date));

    $("results-label").textContent = filtered.length + " événement" + (filtered.length > 1 ? "s" : "");
    $("events-container").innerHTML = filtered.length
        ? filtered.map(buildCard).join("")
        : '<div class="empty-state"><i class="bi bi-calendar-x"></i><p>Aucun événement trouvé.<br>Ajoutez-en un depuis le formulaire.</p></div>';
}

// ── Stats ──
function updateStats() {
    var today = getToday();
    var now = new Date();
    var mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
    var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    var monS = mon.toISOString().slice(0, 10), sunS = sun.toISOString().slice(0, 10);

    var s = { total: events.length, today: 0, week: 0, work: 0, perso: 0 };
    events.forEach(e => {
        if (e.date === today) s.today++;
        if (e.date >= monS && e.date <= sunS) s.week++;
        if (e.cat === "travail") s.work++;
        if (e.cat === "perso") s.perso++;
    });
    ["total", "today", "week", "work", "perso"].forEach(k => $("stat-" + k).textContent = s[k]);
}

// ── Filtres & Vue ──
function setFilter(btn) {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderEvents();
}

function setView(v) {
    currentView = v;
    $("events-container").className = v + "-view";
    $("view-grid").classList.toggle("active", v === "grid");
    $("view-list").classList.toggle("active", v === "list");
    renderEvents();
}

// ── Toast ──
function showToast(msg, type = "success") {
    var icons = { success: "check-circle", danger: "x-circle" };
    var el = document.createElement("div");
    el.className = "toast-msg " + type;
    el.innerHTML = `<i class="bi bi-${icons[type] || "info-circle"} me-2"></i>${msg}`;
    $("toast-wrap").appendChild(el);
    setTimeout(() => el.remove(), 2800);
}

// ── Démarrage ──
$("today-date").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
$("inp-date").value = getToday();

if (!events.length) {
    var tom = new Date(); tom.setDate(tom.getDate() + 1);
    var tomS = tom.toISOString().slice(0, 10);
    events = [
        { id: genId(), title: "Réunion hebdomadaire", date: getToday(), time: "09:00", cat: "travail", desc: "Revue du sprint avec l'équipe." },
        { id: genId(), title: "Rendez-vous médecin", date: tomS, time: "14:30", cat: "sante", desc: "Consultation annuelle." },
        { id: genId(), title: "Anniversaire de Sara", date: tomS, time: "19:00", cat: "social", desc: "Fête surprise chez les parents." },
        { id: genId(), title: "Sport — salle de gym", date: getToday(), time: "18:00", cat: "perso", desc: "Séance cardio + musculation." },
    ];
    saveEvents();
}

renderEvents();
updateStats();
// ── Modale sans Bootstrap ──
// openModal : يظهر الموديل بتغيير display من none إلى flex
function openModal() {
    $("deleteModal").style.display = "flex";
}

// closeModal : يخفي الموديل ويرجع deleteTargetId للفراغ
function closeModal() {
    $("deleteModal").style.display = "none";
    deleteTargetId = "";
}

// closeModalOnOverlay : يغلق الموديل إذا المستخدم ضغط على الخلفية الداكنة
function closeModalOnOverlay(event) {
    if (event.target === $("deleteModal")) closeModal();
}