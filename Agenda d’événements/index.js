// ================================================================================================================================================================
//                                                                          Agenda d'Événements : 
//                                                                  ILIAS BENAZZOUZA & LAHCEN SAHRAOUI
// ==================================================================================================================================================================

// ── État global ──
var events = JSON.parse(localStorage.getItem("agenda_events") || "[]");
var currentFilter = "all";
var currentView = "grid";
var deleteTargetId = "";

// ── Utilitaires ──
var $ = function(id) {
    return document.getElementById(id); 
};
var genId = function() {
    return Date.now() + "" + Math.floor(Math.random() * 1000); 
};
var getToday = function() {
    return new Date().toISOString().slice(0, 10); 
};
var formatDate = function(s) {
    return s ? s.split("-").reverse().join("/") : ""; 
};

// ── Catégories ──
var CAT = {
    travail: { cls: "work",   label: "💼 Travail"   },
    perso:   { cls: "perso",  label: "🏠 Personnel" },
    sante:   { cls: "sante",  label: "❤️ Santé"     },
    social:  { cls: "social", label: "🎉 Social"    }
};

var getCat = function(cat, key) {
    if (CAT[cat]) {
        return CAT[cat][key]; 
    }
    if (key === "cls")   {
        return "autre"; 
    }
    if (key === "label") {
        return "📌 Autre"; 
    }
};


var saveEvents = function() {
    localStorage.setItem("agenda_events", JSON.stringify(events));
};

// ── Formulaire ──
var getForm = function() {
    return {
        title:  $("inp-title").value,
        date:   $("inp-date").value,
        time:   $("inp-time").value,
        cat:    $("inp-cat").value,
        desc:   $("inp-desc").value,
        editId: $("edit-id").value
    };
};

var clearForm = function() {
    $("inp-title").value = "";
    $("inp-time").value  = "";
    $("inp-desc").value  = "";
    $("inp-date").value  = getToday();
    $("inp-cat").value   = "travail";
};

// ── CRUD ──
function saveEvent() {
    var f = getForm();

    if (!f.title) {
        showToast("Le titre est obligatoire.", "danger"); return; 
    }
    if (!f.date)  {
        showToast("La date est obligatoire.", "danger");  return; 
    }

    if (f.editId) {
        for (var i = 0; i < events.length; i++) {
            if (events[i].id === f.editId) {
                events[i].title = f.title;
                events[i].date  = f.date;
                events[i].time  = f.time;
                events[i].cat   = f.cat;
                events[i].desc  = f.desc;
            }
        }
        cancelEdit();
        showToast("Événement modifié avec succès.", "success");
    } else {
        var newEvent = {
            id: genId(),
            title: f.title,
            date: f.date,
            time: f.time,
            cat: f.cat,
            desc: f.desc 
        };
        events.unshift(newEvent);
        clearForm();
        showToast("Événement ajouté avec succès.", "success");
    }

    saveEvents();
    renderEvents();
    updateStats();
}

function startEdit(id) {
    var ev = null;
    for (var i = 0; i < events.length; i++) {
        if (events[i].id === id) {
            ev = events[i]; 
        }
    }
    if (!ev) {
        return; 
    }

    $("inp-title").value = ev.title;
    $("inp-date").value  = ev.date;
    $("inp-time").value  = ev.time;
    $("inp-cat").value   = ev.cat;
    $("inp-desc").value  = ev.desc;
    $("edit-id").value   = ev.id;

    $("form-title").innerHTML     = '<i class="bi bi-pencil"></i> Modifier l\'événement';
    $("btn-label").textContent    = "Enregistrer les modifications";
    $("cancel-btn").style.display = "block";
    document.querySelector(".sidebar").scrollTop = 0;
}

function cancelEdit() {
    clearForm();
    $("edit-id").value            = "";
    $("form-title").innerHTML     = '<i class="bi bi-plus-circle"></i> Ajouter un événement';
    $("btn-label").textContent    = "Ajouter l'événement";
    $("cancel-btn").style.display = "none";
}

function confirmDelete(id) {
    deleteTargetId = id;
    $("deleteModal").style.display = "flex";
}

function closeModal() {
    $("deleteModal").style.display = "none";
    deleteTargetId = "";
}

function closeModalOnOverlay(event) {
    if (event.target === $("deleteModal")) {
        closeModal(); 
    }
}

$("confirm-delete-btn").addEventListener("click", function() {
    if (!deleteTargetId) { return; }
    var newEvents = [];
    for (var i = 0; i < events.length; i++) {
        if (events[i].id !== deleteTargetId) {
            newEvents.push(events[i]); 
        }
    }
    events = newEvents;
    saveEvents();
    renderEvents();
    updateStats();
    showToast("Événement supprimé.", "danger");
    closeModal();
});

// ── Affichage ──
function buildCard(ev) {
    var cls   = getCat(ev.cat, "cls");
    var label = getCat(ev.cat, "label");
    var time  = ev.time ? '<div class="event-time"><i class="bi bi-clock"></i> ' + ev.time + '</div>' : "";
    var desc  = ev.desc ? '<div class="event-desc">' + ev.desc + '</div>' : "";

    return '<div class="event-card" id="card-' + ev.id + '">'
         +   '<div class="card-stripe stripe-' + cls + '"></div>'
         +   '<div class="card-body-inner">'
         +     '<div class="event-meta">'
         +       '<span class="cat-badge cat-' + cls + '">' + label + '</span>'
         +       '<span class="date-chip"><i class="bi bi-calendar3"></i> ' + formatDate(ev.date) + '</span>'
         +     '</div>'
         +     '<div class="event-title">' + ev.title + '</div>'
         +     time
         +     desc
         +     '<div class="card-actions">'
         +       '<button class="btn-icon edit" onclick="startEdit(\'' + ev.id + '\')"><i class="bi bi-pencil"></i> Modifier</button>'
         +       '<button class="btn-icon del"  onclick="confirmDelete(\'' + ev.id + '\')"><i class="bi bi-trash"></i></button>'
         +     '</div>'
         +   '</div>'
         + '</div>';
}

function renderEvents() {
    var search   = $("search-input").value.toLowerCase();
    var filtered = [];

    for (var i = 0; i < events.length; i++) {
        var e = events[i];
        var matchFilter = (currentFilter === "all" || e.cat === currentFilter);
        var matchSearch = (!search || e.title.toLowerCase().indexOf(search) !== -1 || e.desc.toLowerCase().indexOf(search) !== -1);
        if (matchFilter && matchSearch) { filtered.push(e); }
    }

    filtered.sort(function(a, b) {
        if (a.date < b.date) {
            return -1; 
        }
        if (a.date > b.date) {
            return  1; 
        }
        return 0;
    });

    $("results-label").textContent = filtered.length + " événement" + (filtered.length > 1 ? "s" : "");

    if (filtered.length === 0) {
        $("events-container").innerHTML = '<div class="empty-state"><i class="bi bi-calendar-x"></i><p>Aucun événement trouvé.<br>Ajoutez-en un depuis le formulaire.</p></div>';
    } else {
        var html = "";
        for (var j = 0; j < filtered.length; j++) {
            html += buildCard(filtered[j]); 
        }
        $("events-container").innerHTML = html;
    }
}

// ── Stats ──
function updateStats() {
    var today = getToday();
    var now   = new Date();
    var mon   = new Date(now);
    mon.setDate(now.getDate() - now.getDay() + 1);
    var sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    var monS = mon.toISOString().slice(0, 10);
    var sunS = sun.toISOString().slice(0, 10);

    var total      = events.length;
    var countToday = 0;
    var countWeek  = 0;
    var countWork  = 0;
    var countPerso = 0;

    for (var i = 0; i < events.length; i++) {
        var e = events[i];
        if (e.date === today)                 { countToday++; }
        if (e.date >= monS && e.date <= sunS) { countWeek++;  }
        if (e.cat === "travail")              { countWork++;  }
        if (e.cat === "perso")                { countPerso++; }
    }

    $("stat-total").textContent = total;
    $("stat-today").textContent = countToday;
    $("stat-week").textContent  = countWeek;
    $("stat-work").textContent  = countWork;
    $("stat-perso").textContent = countPerso;
}

// ── Filtres & Vue ──
function setFilter(btn) {
    var btns = document.querySelectorAll(".filter-btn");
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove("active"); 
    }
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderEvents();
}

function setView(v) {
    currentView = v;
    $("events-container").className = v + "-view";
    if (v === "grid") {
        $("view-grid").classList.add("active");
        $("view-list").classList.remove("active");
    } else {
        $("view-list").classList.add("active");
        $("view-grid").classList.remove("active");
    }
    renderEvents();
}

// ── Toast ──
function showToast(msg, type) {
    var icon = (type === "danger") ? "x-circle" : "check-circle";
    var el   = document.createElement("div");
    el.className = "toast-msg " + type;
    el.innerHTML = '<i class="bi bi-' + icon + '"></i> ' + msg;
    $("toast-wrap").appendChild(el);
    setTimeout(function() {
        el.remove(); 
    }, 2800);
}

// ── Démarrage ──
$("today-date").textContent = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
});
$("inp-date").value = getToday();

if (events.length === 0) {
    var tom  = new Date();
    tom.setDate(tom.getDate() + 1);
    var tomS = tom.toISOString().slice(0, 10);
    events = [
        {
            id: genId(),
            title: "Réunion hebdomadaire",
            date: getToday(),
            time: "09:00",
            cat: "travail
            desc: "Revue du sprint avec l'équipe." 
        },
        {
           id: genId(),
           title: "Rendez-vous médecin",
           date: tomS,       
           time: "14:30",
           cat: "sante", 
           desc: "Consultation annuelle."         
        },
        {
            id: genId(),
            title: "Anniversaire de Sara",
            date: tomS,
            time: "19:00",
            cat: "social",
            desc: "Fête surprise chez les parents." 
        },
        {
            id: genId(),
            title: "Sport — salle de gym",
            date: getToday(),
            time: "18:00",
            cat: "perso",
            desc: "Séance cardio + musculation."    
        }
    ];
    saveEvents();
}

renderEvents();
updateStats();
