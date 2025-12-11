import ICAL from "./ical.js";

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function fetchIcsAsJson(url) {
  const res = await fetch(url);
  const ics = await res.text();

  const jcal = ICAL.parse(ics);
  const comp = new ICAL.Component(jcal);
  const events = comp.getAllSubcomponents("vevent");

  const today = new Date();

  return events
    .map((vevent) => {
      const e = new ICAL.Event(vevent);
      return {
        uid: e.uid,
        summary: e.summary,
        description: e.description,
        location: e.location,
        start: e.startDate.toJSDate(),
        end: e.endDate.toJSDate()
      };
    })
    .filter((ev) => isSameDay(ev.start, today));
}

const url =
  "https://westlinnhs.wlwv.k12.or.us/cf_calendar/feed.cfm?type=ical&feedID=98B140F3D0D74DF58007FA8B2A953405";

fetchIcsAsJson(url)
  .then((events) => {
    console.log(events)
    events.forEach((e) => {
      let el = document.createElement("div")
      el.classList.add("event")
      for (const [key, value] of Object.entries(e)) {
        let p = document.createElement("p")
        p.innerText = `${key}: ${value}`
        el.appendChild(p)
      }
      document.getElementById("events").appendChild(el)
    })
  }
)
  .catch(console.error);
