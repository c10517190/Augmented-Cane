// Convert labels from earlier browser logs without discarding recorded events.
const LEGACY_LOG_LABELS = {
  "\u8ddd\u79bb\u6062\u590d\uff0c\u5f53\u524d\u4e3a": "Distance data restored: ",
  "\u6d4b\u8ddd\u6062\u590d\uff0c\u5f53\u524d\u4e3a": "Ranging restored: ",
  " cm \u6539\u4e3a ": " cm to ",
  "\u4f20\u611f\u5668\u5f02\u5e38": "Sensor fault",
  "\u521d\u59cb\u72b6\u6001\uff1a": "Initial state: ",
  "\u7528\u6237\u64cd\u4f5c": "User action",
  "\u72b6\u6001\u53d8\u5316": "State change",
  "\u5c1a\u65e0\u4e8b\u4ef6": "No events yet",
  "\u5c1a\u672a\u6062\u590d": "Not yet recovered",
  "\u8ddd\u79bb\u8d85\u65f6": "Distance timeout",
  "\u8d85\u51fa\u63a2\u6d4b": "Out of range",
  "\u9608\u503c\u4ece ": "Threshold changed from ",
  "\u8dcc\u5012": "Fall",
  "\u8d85\u65f6": "Timeout",
  "\u65e0\u6548": "Invalid",
  "\u6ce8\u610f": "Caution",
  "\u5371\u9669": "Danger",
  "\u5b89\u5168": "Safe",
  "\u8f83\u8fd1": "Near",
  "\u5f88\u8fd1": "Very close",
  "\u7545\u901a": "Clear",
  "\uff0c": ", ",
  "\uff08": " (",
  "\uff09": ")"
};

function englishLogText(value) {
  if (typeof value !== "string") return value;
  for (const [oldLabel, newLabel] of Object.entries(LEGACY_LOG_LABELS)) {
    value = value.split(oldLabel).join(newLabel);
  }
  return value;
}

// Event log: falls, distance bands, distance errors and threshold changes. Timestamps use this computer's reception time.
class EventLog {
  constructor({ list, exportButton, getReading }) {
    this.list = list;
    this.getReading = getReading;
    this.events = [];
    this.fallOpen = false;
    this.loggedEval = "";
    this.loggedBand = "";
    this.thresholdAnnounced = false;
    this.load();
    this.render();
    exportButton.addEventListener("click", () => this.exportCsv());
  }

  load() {
    try {
      const raw = localStorage.getItem("cane-event-log") || localStorage.getItem("cane-fall-log") || "[]";
      const saved = JSON.parse(raw);
      if (Array.isArray(saved)) this.events = saved.map(item => this.normalize(item)).filter(Boolean).slice(0, 200);
    } catch (error) {
      this.events = [];
    }
    this.fallOpen = this.events.some(item => item.type === "Fall" && item.end == null);
  }

  save() {
    try {
      localStorage.setItem("cane-event-log", JSON.stringify(this.events));
    } catch (error) {}
  }

  normalize(item) {
    if (!item || typeof item !== "object") return null;
    if (item.type && Number.isFinite(item.t)) {
      return {
        ...item,
        type: englishLogText(item.type),
        detail: englishLogText(item.detail),
        judge: englishLogText(item.judge)
      };
    }
    if (Number.isFinite(item.start)) {
      return { t: item.start, type: "Fall", detail: "Fall", judge: "Fall", end: item.end ?? null, distance: null, threshold: null };
    }
    return null;
  }

  formatTime(ms) {
    const date = new Date(ms);
    const pad = value => String(value).padStart(2, "0");
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
  }

  kindClass(type) {
    if (type === "Fall") return "fall";
    if (type === "Sensor fault") return "fault";
    if (type === "User action") return "user";
    return "";
  }

  render() {
    this.list.replaceChildren();
    if (this.events.length === 0) {
      const empty = document.createElement("li");
      empty.className = "fall-empty";
      empty.textContent = "No events yet";
      this.list.append(empty);
      return;
    }
    for (const event of this.events) {
      const item = document.createElement("li");
      const start = document.createElement("time");
      start.dateTime = new Date(event.t).toISOString();
      start.textContent = this.formatTime(event.t);
      const kind = document.createElement("span");
      kind.className = "event-kind " + this.kindClass(event.type);
      kind.textContent = event.type;
      item.append(start, kind, document.createTextNode(event.detail));
      if (event.type === "Fall" && event.end == null) {
        const ongoing = document.createElement("span");
        ongoing.className = "event-open";
        ongoing.textContent = "Not yet recovered";
        item.append(ongoing);
      } else if (event.type === "Fall" && event.end != null) {
        const end = document.createElement("time");
        end.dateTime = new Date(event.end).toISOString();
        end.textContent = this.formatTime(event.end);
        item.append(document.createTextNode(", "), end, document.createTextNode(" recovered"));
      }
      this.list.append(item);
    }
  }

  record(type, detail, judge) {
    const reading = this.getReading();
    this.events.unshift({
      t: Date.now(),
      type,
      detail,
      judge,
      end: null,
      distance: reading.distance,
      threshold: reading.threshold
    });
    if (this.events.length > 200) this.events.length = 200;
    this.save();
    this.render();
  }

  noteFall(next) {
    if (next === "FALL" && !this.fallOpen) {
      this.fallOpen = true;
      this.record("Fall", "Fall", "Fall");
      return;
    }
    if (next === "OK" && this.fallOpen) {
      this.fallOpen = false;
      const open = this.events.find(item => item.type === "Fall" && item.end == null);
      if (open) open.end = Date.now();
      this.save();
      this.render();
    }
  }

  noteThreshold(previous, value) {
    const changed = this.thresholdAnnounced && value !== previous;
    this.thresholdAnnounced = true;
    if (changed) this.record("User action", "Threshold changed from " + previous + " cm to " + value + " cm", "");
  }

  reset() {
    this.loggedEval = "";
    this.loggedBand = "";
    this.thresholdAnnounced = false;
  }

  bandRaw(name) {
    if (name === "Caution") return "Near";
    if (name === "Danger") return "Very close";
    return "Clear";
  }

  distanceFact() {
    const reading = this.getReading();
    if (!reading.connected || !reading.seen) return null;
    if (reading.stale) return { kind: "timeout" };
    if (reading.outOfRange || reading.distance == null) return { kind: "invalid" };
    const band = reading.band();
    if (band === "close") return { kind: "band", name: "Danger" };
    if (band === "near") return { kind: "band", name: "Caution" };
    if (band === "" && reading.near()) return { kind: "pending" };
    return { kind: "band", name: "Safe" };
  }

  observe() {
    const reading = this.getReading();
    if (!reading.connected || !reading.seen) {
      if (!reading.connected) this.loggedEval = "";
      return;
    }
    const fact = this.distanceFact();
    if (!fact || fact.kind === "pending") return;
    const token = fact.kind === "band" ? fact.name : fact.kind;
    if (token === this.loggedEval) return;
    const prevEval = this.loggedEval;
    this.loggedEval = token;
    if (fact.kind === "timeout") {
      this.record("Sensor fault", "Distance timeout", "Timeout");
      return;
    }
    if (fact.kind === "invalid") {
      this.record("Sensor fault", "Out of range", "Invalid");
      return;
    }
    const label = fact.name + " (" + this.bandRaw(fact.name) + ")";
    if (prevEval === "timeout") this.record("Sensor fault", "Distance data restored: " + label, fact.name);
    else if (prevEval === "invalid") this.record("Sensor fault", "Ranging restored: " + label, fact.name);
    if (!this.loggedBand) {
      this.record("State change", "Initial state: " + label, fact.name);
      this.loggedBand = fact.name;
      return;
    }
    if (this.loggedBand !== fact.name) {
      this.record("State change", this.loggedBand + "→" + fact.name + " (" + this.bandRaw(this.loggedBand) + "→" + this.bandRaw(fact.name) + ")", fact.name);
      this.loggedBand = fact.name;
    }
  }

  csvCell(value) {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return '"' + text.replaceAll('"', '""') + '"';
    return text;
  }

  csv() {
    const header = ["Start time", "End time", "Type", "Event", "System assessment", "Distance (cm)", "Threshold (cm)", "Observed outcome"];
    const lines = [header.join(",")];
    for (const event of this.events.slice().reverse()) {
      lines.push([
        this.formatTime(event.t),
        event.end == null ? "" : this.formatTime(event.end),
        event.type,
        event.detail,
        event.judge || "",
        event.distance == null ? "" : event.distance,
        event.threshold == null ? "" : event.threshold,
        ""
      ].map(value => this.csvCell(value)).join(","));
    }
    return lines.join("\n");
  }

  exportCsv() {
    const stamp = this.formatTime(Date.now()).replaceAll("-", "").replaceAll(":", "").replace(" ", "-");
    const file = new Blob(["\uFEFF" + this.csv()], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "event-log-" + stamp + ".csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
