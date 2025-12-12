document.getElementById('date').textContent = new Date().toLocaleDateString();

const ICS_URL = "./calendar.ics"; // your local ICS file

let in_school_now = false
let current_day = "No School"

// Unfold lines per RFC5545
function unfoldICS(raw) {
  raw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return raw.replace(/\n[ \t]/g, '');
}

function parseICSTime(value, params) {
  if (!value) return null;

  if ((params && /VALUE=DATE/i.test(params)) || /^\d{8}$/.test(value)) {
    const y = value.slice(0,4), m = value.slice(4,6), d = value.slice(6,8);
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }

  if (value.endsWith('Z')) {
    const y = value.slice(0,4), mo = value.slice(4,6), da = value.slice(6,8);
    const hh = value.slice(9,11), mm = value.slice(11,13), ss = value.slice(13,15) || '00';
    return new Date(`${y}-${mo}-${da}T${hh}:${mm}:${ss}Z`);
  }

  if (/^\d{8}T\d{4,6}$/.test(value)) {
    const y = value.slice(0,4), mo = value.slice(4,6), da = value.slice(6,8);
    const hh = value.slice(9,11), mm = value.slice(11,13), ss = value.slice(13,15) || '00';
    return new Date(`${y}-${mo}-${da}T${hh}:${mm}:${ss}`);
  }

  const tryIso = value.replace(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/, (m,y,mo,da,hh,mm,ss)=>{
    hh = hh||'00'; mm=mm||'00'; ss=ss||'00';
    return `${y}-${mo}-${da}T${hh}:${mm}:${ss}`;
  });
  const dt = new Date(tryIso);
  return isNaN(dt) ? null : dt;
}

function parseICS(raw) {
  const unfolded = unfoldICS(raw);
  const lines = unfolded.split(/\n/);
  const events = [];
  let inEvent = false;
  let current = null;

  for (const line of lines) {
    if (!line) continue;
    if (line === 'BEGIN:VEVENT') { inEvent=true; current={props:{}}; continue; }
    if (line === 'END:VEVENT') {
      if(current){
        const dtstartRaw = current.props['DTSTART']?.value || current.props['DTSTART;VALUE=DATE']?.value;
        const dtstartParams = current.props['DTSTART']?.params || current.props['DTSTART;VALUE=DATE']?.params;
        const dtendRaw = current.props['DTEND']?.value;
        const dtendParams = current.props['DTEND']?.params;

        const startDate = parseICSTime(dtstartRaw, dtstartParams);
        const endDate = parseICSTime(dtendRaw, dtendParams);

        events.push({
          summary: current.props['SUMMARY']?.value || '(no title)',
          description: current.props['DESCRIPTION']?.value || '',
          location: current.props['LOCATION']?.value || '',
          uid: current.props['UID']?.value || '',
          startDate,
          endDate
        });
      }
      inEvent=false;
      current=null;
      continue;
    }

    if(inEvent && current){
      const m = line.match(/^([^:]+):([\s\S]*)$/);
      if(!m) continue;
      const left = m[1];
      const value = m[2];
      const [propName,...paramParts] = left.split(';');
      const propKey = propName.toUpperCase();
      const params = paramParts.join(';');
      current.props[left.toUpperCase()] = { value, params };
      if(!current.props[propKey]) current.props[propKey] = { value, params };
      else current.props[propKey].value = value;
    }
  }

  return events;
}

function renderEvents(events){
  const container = document.getElementById('events');
  container.innerHTML = '';

  if(!events.length){
    container.innerHTML = '<div class="error">No events parsed.</div>';
    return;
  }

  events.sort((a,b)=>{
    if(!a.startDate && !b.startDate) return 0;
    if(!a.startDate) return 1;
    if(!b.startDate) return -1;
    return a.startDate-b.startDate;
  });

  for(const e of events){
    if (e.summary == "B Day-Periods 5-8" || e.summary == "A Day-Periods 1-4") {
      current_day = e.summary;
      continue
    }

    const div = document.createElement('div');
    div.className='event';

    const summary = document.createElement('span');
    summary.className='summary';
    summary.textContent=e.summary;
    div.appendChild(summary);

    if(e.startDate) {
      const time = document.createElement("span");
      time.className = "time";
      const val = e.startDate.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
      time.textContent = val
      summary.appendChild(time);
    }

    const info = document.createElement("div");
    info.className="info";
    if(e.location) {
      const location = document.createElement('p');
      location.className="location";
      location.textContent = e.location
      info.appendChild(location)
    }
    if(e.description){
      const desc = document.createElement('div');
      desc.className="description";
      // Replace \n with <br> and insert as HTML
      desc.innerHTML = e.description.replace(/\\n/g,'');
      info.appendChild(desc);
  }
    div.appendChild(info);
    container.appendChild(div);
  }
  document.getElementById("schoolday").innerText = current_day
}

async function loadEvents(){
  try{
    const res = await fetch(ICS_URL);
    if(!res.ok) throw new Error('Network response not ok: '+res.status);
    const text = await res.text();
    const events = parseICS(text);
    // Filter only today's events
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todaysEvents = events.filter(e => {
      if(!e.startDate) return false;
      return e.startDate >= startOfToday && e.startDate < endOfToday;
      });
      console.log(todaysEvents)
      renderEvents(todaysEvents);
  }catch(err){
    console.error(err);
    document.getElementById('events').innerHTML=`<div class="error">Error loading events: ${err.message}</div>`;
  }
}

loadEvents();


// WLHS 2025-2026 Bell Schedule
const schedule = [
  { start: "08:30", end: "09:55", a: "Period 1", b: "Period 5" },
  { start: "09:55", end: "10:04", a: "Passing/Break", b: "Passing/Break" },
  { start: "10:04", end: "11:29", a: "Period 2", b: "Period 6 (Life Class)" },
  { start: "11:29", end: "12:09", a: "Lunch", b: "Lunch" },
  { start: "12:09", end: "13:34", a: "Period 3", b: "Period 7" },
  { start: "13:40", end: "15:05", a: "Period 4", b: "Period 8" }
];

// ---- CONFIG ----
// Set this to "A" or "B" depending on the day.
const dayType = "B";

function parseTime(t) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function updateTimeLeft() {
  const now = new Date();
  const timeLeftElement = document.getElementById("timeleft");

  for (const period of schedule) {
    const start = parseTime(period.start);
    const end = parseTime(period.end);

    if (now >= start && now <= end) {
      // Calculate remaining time
      const msLeft = end - now;
      const minutes = Math.floor(msLeft / 60000);
      const seconds = Math.floor((msLeft % 60000) / 1000);

      const label = dayType === "A" ? period.a : period.b;

      timeLeftElement.textContent =
        `${label}: ${minutes}m ${seconds}s left`;

      return;
    }
  }

  // If not in any period
  timeLeftElement.textContent = "No active period";
}

// Update every second
setInterval(updateTimeLeft, 100);
updateTimeLeft();