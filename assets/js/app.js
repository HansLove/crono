// === Config ===
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQxNrV687aUqrPHpPxy8oVNjUvilP2Nt76FI6CByIOmShtve6BnsB_JUb317Mb86faVkB0ulWPNof-J/pub?gid=0&single=true&output=csv";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";
const REFRESH_SEC = 120;
const TIMEZONE = "America/Tijuana";
const DISCOUNT_PERCENT = 5;

// Fallback data
const FALLBACK_DATA = [
  {
    key: "LHR-70",
    type: "Epic",
    sum: "Automatic change of device. Leads generation",
    state: "Por Hacer",
    assg: "",
    start: new Date("2025-09-06"),
    due: new Date("2025-09-30"),
    color: "#00d4aa",
    gas: 3232
  },
  {
    key: "LHR-71",
    type: "Epic", 
    sum: "250 people Broadcast test",
    state: "Por Hacer",
    assg: "",
    start: new Date("2025-09-28"),
    due: new Date("2025-10-06"),
    color: "#4a9eff",
    gas: 4324
  },
  {
    key: "LHR-72",
    type: "Epic",
    sum: "Affill new payment channel integration",
    state: "Por Hacer",
    assg: "",
    start: new Date("2025-09-19"),
    due: new Date("2025-10-02"),
    color: "#a78bfa",
    gas: 5454
  },
  {
    key: "LHR-73",
    type: "Epic",
    sum: "Lich Coding new version for Fintech and budgets",
    state: "Por Hacer",
    assg: "",
    start: new Date("2025-10-01"),
    due: new Date("2025-10-14"),
    color: "#a78bfa",
    gas: 354
  }
];

const COLORS = {
  purple:"#a78bfa", green:"#00d4aa", orange:"#ff8c42", yellow:"#ffd166",
  dark_orange:"#ff8c42", dark_teal:"#00d4aa", blue:"#4a9eff",
  default:"#888888"
};

// === State ===
let DATA = [];
let FILTERED = [];
let TIMER = null;
let LAST_SYNC = null;
let currentInvoiceTask = null;

// === Helpers ===
const fmtDate = (d) => d ? d.toLocaleDateString("en-US", { month:'short', day:'numeric', year:'numeric', timeZone: TIMEZONE }) : "—";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const msToParts = (ms) => {
  const neg = ms < 0;
  let m = Math.abs(ms);
  const d = Math.floor(m / 86400000); m -= d*86400000;
  const h = Math.floor(m / 3600000);  m -= h*3600000;
  const n = Math.floor(m / 60000);    m -= n*60000;
  const s = Math.floor(m / 1000);
  return {neg, d, h, n, s};
};

const partsToStr = (p) => {
  const sign = p.neg ? "-" : "";
  if(p.d > 0) return `${sign}${p.d}d ${String(p.h).padStart(2,"0")}h ${String(p.n).padStart(2,"0")}m`;
  if(p.h > 0) return `${sign}${p.h}h ${String(p.n).padStart(2,"0")}m ${String(p.s).padStart(2,"0")}s`;
  return `${sign}${p.n}m ${String(p.s).padStart(2,"0")}s`;
};

const safe = (v) => (v || "").trim();

const fixDate = (s) => {
  if (!s) return null;
  const d = new Date(s.trim());
  return isNaN(d) ? null : d;
};

function parseCSV(text){
  const rows=[]; let row=[], cur="", inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if (inQ){
      if (c === '"' && n === '"'){ cur+='"'; i++; }
      else if (c === '"'){ inQ=false; }
      else { cur+=c; }
    } else {
      if (c === '"'){ inQ=true; }
      else if (c === '\t' || c === ','){ row.push(cur); cur=""; }
      else if (c === '\n'){ row.push(cur); rows.push(row); row=[]; cur=""; }
      else if (c === '\r'){ /* skip */ }
      else { cur+=c; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function mapIssueColor(name){
  if (!name) return COLORS.default;
  const k = String(name).toLowerCase().trim();
  return COLORS[k] || COLORS.default;
}

function getStatusClass(state){
  const s = (state || "").toLowerCase();
  if(s.includes("progress")) return "status-progress";
  if(s.includes("complete") || s.includes("done")) return "status-done";
  return "status-todo";
}

// === Calendar Event Generation ===
function formatGoogleDate(date){
  if(!date) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function createCalendarEvent(task){
  if(!task.due){
    alert("This task doesn't have a due date set.");
    return;
  }
  
  const dueDate = new Date(task.due);
  
  // Set due date to end of day (23:59)
  dueDate.setHours(23, 59, 0, 0);
  
  // Create all-day event starting at the due date
  const startDate = new Date(dueDate);
  startDate.setHours(0, 0, 0, 0);
  
  const title = `[${task.key}] ${task.sum}`;
  const description = `Task: ${task.key}
Status: ${task.state}${task.assg ? `
Assigned to: ${task.assg}` : ''}
Cost: $${task.gas.toLocaleString()}

⏰ Project Timeline Deadline - Don't miss it!`;
  
  const location = "Project Timeline";
  
  // Build Google Calendar URL
  const googleCalendarUrl = new URL("https://calendar.google.com/calendar/render");
  googleCalendarUrl.searchParams.append("action", "TEMPLATE");
  googleCalendarUrl.searchParams.append("text", title);
  googleCalendarUrl.searchParams.append("dates", `${formatGoogleDate(startDate)}/${formatGoogleDate(dueDate)}`);
  googleCalendarUrl.searchParams.append("details", description);
  googleCalendarUrl.searchParams.append("location", location);
  googleCalendarUrl.searchParams.append("trp", "false");
  
  // Open Google Calendar in new tab
  window.open(googleCalendarUrl.toString(), "_blank");
}

// === Invoice Modal ===
function openInvoiceModal(task){
  currentInvoiceTask = task;
  const modal = document.getElementById("invoiceModal");
  const discount = task.gas * (DISCOUNT_PERCENT / 100);
  const final = task.gas - discount;
  
  document.getElementById("invoiceTask").textContent = `${task.key} - ${task.sum}`;
  document.getElementById("invoiceOriginal").textContent = `$${task.gas.toLocaleString()}`;
  document.getElementById("invoiceFinal").textContent = `$${final.toLocaleString()}`;
  document.getElementById("discountAmount").textContent = `$${discount.toLocaleString()}`;
  
  modal.classList.add("active");
}

function closeInvoiceModal(){
  document.getElementById("invoiceModal").classList.remove("active");
  currentInvoiceTask = null;
}

function confirmInvoice(){
  if(!currentInvoiceTask) return;
  
  const task = currentInvoiceTask;
  const discount = task.gas * (DISCOUNT_PERCENT / 100);
  const final = task.gas - discount;
  
  const subject = `Invoice Request: ${task.key}`;
  const body = `Hi,\n\nI would like to request an invoice for the following task:\n\nTask: ${task.key} - ${task.sum}\nOriginal Amount: $${task.gas.toLocaleString()}\nDiscount (${DISCOUNT_PERCENT}%): -$${discount.toLocaleString()}\nFinal Amount: $${final.toLocaleString()}\n\nThank you!`;
  
  window.location.href = `mailto:billing@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  closeInvoiceModal();
}

// === Load Data ===
async function loadCSV(){
  try {
    let res, txt;
    try {
      res = await fetch(CSV_URL, { cache:"no-store" });
      if (!res.ok) throw new Error(`Direct fetch failed: ${res.status}`);
      txt = await res.text();
    } catch (directError) {
      console.log("Direct fetch failed, trying CORS proxy...", directError.message);
      res = await fetch(CORS_PROXY + encodeURIComponent(CSV_URL), { cache:"no-store" });
      if (!res.ok) throw new Error(`CORS proxy fetch failed: ${res.status}`);
      txt = await res.text();
    }
    
    const rows = parseCSV(txt);
    if (!rows.length) {
      console.log("No data in CSV, using fallback data");
      return FALLBACK_DATA;
    }
    
    const header = rows[0].map(h => h.trim());
    const idx = (name) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const iKey   = idx("Clave");
    const iType  = idx("Tipo de Incidencia");
    const iSum   = idx("Resumen");
    const iState = idx("Estado");
    const iAssg  = idx("Persona asignada");
    const iStart = idx("Start date");
    const iStartD= idx("Fecha de inicio deducida");
    const iDue   = idx("Fecha de vencimiento");
    const iDueD  = idx("Fecha de vencimiento deducida");
    const iCol   = idx("Issue color");
    const iGas   = idx("Gas");

    const out = [];
    for (let r=1; r<rows.length; r++){
      const row = rows[r];
      if (!row || !row.length) continue;

      const key   = safe(row[iKey]);
      const type  = safe(row[iType]);
      const sum   = safe(row[iSum]);
      const state = safe(row[iState]);
      const assg  = safe(row[iAssg]);
      const startTxt = safe(row[iStartD] || row[iStart]);
      const dueTxt   = safe(row[iDueD]   || row[iDue]);
      const start = fixDate(startTxt);
      const due   = fixDate(dueTxt);
      const color = mapIssueColor(safe(row[iCol]));
      const gas   = parseFloat(safe(row[iGas])) || 0;

      if (!key && !sum) continue;
      out.push({ key, type, sum, state, assg, start, due, color, gas });
    }

    out.sort((a,b)=>{
      const ax = a.due ? a.due.getTime():Infinity;
      const bx = b.due ? b.due.getTime():Infinity;
      return ax - bx;
    });
    return out;
  } catch (error) {
    console.error("Error loading CSV:", error);
    console.log("Using fallback data due to error");
    return FALLBACK_DATA;
  }
}

// === Render ===
function updateSummary(){
  const now = Date.now();
  const threeDays = 3 * 86400000;
  
  const totalTasks = FILTERED.length;
  const totalCost = FILTERED.reduce((sum, task) => sum + (task.gas || 0), 0);
  const overdue = FILTERED.filter(task => {
    const dueMs = task.due ? task.due.getTime() : now + 1;
    return dueMs < now;
  }).length;
  const dueSoon = FILTERED.filter(task => {
    const dueMs = task.due ? task.due.getTime() : now + 1;
    return dueMs >= now && dueMs <= now + threeDays;
  }).length;
  
  document.getElementById("totalTasks").textContent = totalTasks;
  document.getElementById("totalCost").textContent = `$${totalCost.toLocaleString()}`;
  document.getElementById("overdueCount").textContent = overdue;
  document.getElementById("dueSoonCount").textContent = dueSoon;
}

function render(){
  const container = document.getElementById("tasks");
  const empty = document.getElementById("empty");
  container.innerHTML = "";

  const q = document.getElementById("q").value.trim().toLowerCase();
  const st = document.getElementById("status").value;

  FILTERED = DATA.filter(it=>{
    const matchQ = !q || [it.key, it.sum, it.state, it.assg].some(v => (v||"").toLowerCase().includes(q));
    const matchS = !st || (it.state||"") === st;
    return matchQ && matchS;
  });

  // Update summary with filtered data
  updateSummary();

  if (!FILTERED.length){
    empty.style.display = "block";
    return;
  } else empty.style.display = "none";

  const now = Date.now();

  FILTERED.forEach(it=>{
    const startMs = it.start ? it.start.getTime() : now;
    const dueMs   = it.due ? it.due.getTime() : now + 1;
    const span = Math.max(1, dueMs - startMs);
    const pct = Math.round(100 * clamp(now - startMs, 0, span) / span);
    const delta = dueMs - now;
    const parts = msToParts(delta);
    
    let timerClass = "normal";
    if(delta < 0) timerClass = "critical";
    else if(delta < 3*86400000) timerClass = "warning";

    const card = document.createElement("div");
    card.className = "task-card";
    card.style.borderTopColor = it.color;
    
    card.innerHTML = `
      <div class="compact-header">
        <div class="compact-left">
          <div class="compact-key">${it.key || "—"}</div>
          <div class="compact-title">${it.sum || "Untitled Task"}</div>
          <div class="compact-meta">
            ${it.state ? `<span class="status-badge ${getStatusClass(it.state)}">${it.state}</span>` : ""}
            ${it.assg ? `<span class="meta-item">👤 ${it.assg}</span>` : ""}
          </div>
        </div>
        <div class="compact-right">
          <div class="compact-timer">
            <div class="timer-display ${timerClass}" data-key="${it.key}">
              ${partsToStr(parts)}
            </div>
          </div>
          <div class="compact-cost">
            <div class="gas-amount">$${it.gas.toLocaleString()}</div>
            <div class="compact-actions">
              <button class="compact-calendar-btn" onclick='createCalendarEvent(${JSON.stringify(it)})' title="Add to Calendar">
                📅
              </button>
              <button class="compact-invoice-btn" onclick='openInvoiceModal(${JSON.stringify(it)})' title="Request Invoice">
                🧾
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="compact-footer">
        <div class="compact-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width:${isFinite(pct) ? pct : 0}%; background:linear-gradient(90deg, ${it.color} 0%, ${it.color}88 100%);"></div>
          </div>
          <span class="progress-text">${isFinite(pct) ? pct : 0}%</span>
        </div>
        <div class="compact-dates">
          <span class="date-item">📅 ${fmtDate(it.start)}</span>
          <span class="date-item">🎯 ${fmtDate(it.due)}</span>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });

  if (TIMER) clearInterval(TIMER);
  TIMER = setInterval(updateCountdowns, 1000);
  updateCountdowns();
}

function updateCountdowns(){
  const now = Date.now();
  FILTERED.forEach(it=>{
    const dueMs = it.due ? it.due.getTime() : now;
    const delta = dueMs - now;
    const parts = msToParts(delta);
    
    const mainTimer = document.querySelector(`.timer-display[data-key="${CSS.escape(it.key)}"]`);
    if(mainTimer){
      mainTimer.textContent = partsToStr(parts);
      mainTimer.className = "timer-display";
      if(delta < 0) mainTimer.classList.add("critical");
      else if(delta < 3*86400000) mainTimer.classList.add("warning");
      else mainTimer.classList.add("normal");
    }

    const dEl = document.querySelector(`.timer-part-value[data-key="${CSS.escape(it.key)}-d"]`);
    const hEl = document.querySelector(`.timer-part-value[data-key="${CSS.escape(it.key)}-h"]`);
    const mEl = document.querySelector(`.timer-part-value[data-key="${CSS.escape(it.key)}-m"]`);
    const sEl = document.querySelector(`.timer-part-value[data-key="${CSS.escape(it.key)}-s"]`);
    
    if(dEl) dEl.textContent = Math.abs(parts.d);
    if(hEl) hEl.textContent = String(Math.abs(parts.h)).padStart(2,"0");
    if(mEl) mEl.textContent = String(Math.abs(parts.n)).padStart(2,"0");
    if(sEl) sEl.textContent = String(Math.abs(parts.s)).padStart(2,"0");
  });

  const footer = document.getElementById("footer");
  if (LAST_SYNC) {
    footer.textContent = `last update: ${LAST_SYNC.toLocaleTimeString("en-US", { timeZone: TIMEZONE })}`;
  }
}

async function bootstrap(){
  try{
    DATA = await loadCSV();
    LAST_SYNC = new Date();
    render();
  }catch(e){
    console.error(e);
    const empty = document.getElementById("empty");
    empty.style.display = "block";
    empty.innerHTML = `<div style="font-size:48px;margin-bottom:16px">⚠️</div>Error: ${e.message}`;
  }finally{
    setTimeout(bootstrap, REFRESH_SEC*1000);
  }
}

// === Event Listeners ===
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("q").addEventListener("input", render);
  document.getElementById("status").addEventListener("change", render);

  // Close modal on escape
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeInvoiceModal();
  });

  // Close modal on background click
  document.getElementById("invoiceModal").addEventListener("click", (e) => {
    if(e.target.id === "invoiceModal") closeInvoiceModal();
  });

  bootstrap();
});
