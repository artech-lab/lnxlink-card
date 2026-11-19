/*
 * LNXlink Card for Home Assistant
 * https://github.com/artech-lab/lnxlink-card
 *
 * A dashboard card for Linux computers monitored with LNXlink: online status,
 * CPU and RAM charts, storage, temperature, network, logged-in user, pending
 * updates, alerts and power buttons (suspend, restart, shut down).
 *
 * Works out of the box: the card finds the LNXlink computer and all of its
 * entities by itself through the device registry (MQTT discovery). Every
 * entity can be overridden in the visual editor.
 *
 * Copyright (C) 2026 The lnxlink-card contributors
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version. This program is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
 * Public License for more details: <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The source is plain ASCII: non-ASCII characters are written as \u escapes.
 */

const LNC_VERSION = "1.0.0";
const LNC_TAG = "lnxlink-card";
const LNC_EDITOR_TAG = LNC_TAG + "-editor";
const LNC_REPO_URL = "https://github.com/artech-lab/lnxlink-card";
const LNC_MANUFACTURER = "LNXlink";
const LNC_DOT = "\u00b7";
const LNC_DEG = "\u00b0";
const LNC_DASH = "\u2014";
const LNC_ELL = "\u2026";
const LNC_HOUR = 3600000;
/* history of the charts is refreshed every minute */
const LNC_REFRESH_MS = 60000;
/* two taps within this time confirm restart and shut down */
const LNC_CONFIRM_MS = 4000;

const LNC_DEFAULTS = {
  icon: "mdi:laptop",
  hours_to_show: 3,
  show_charts: true,
  show_storage: true,
  show_details: true,
  show_actions: true,
  confirm_actions: true
};

/* Entities found on the LNXlink device. Each one can be overridden with the
   option "<key>_entity"; the disks with "disk_entities". */
const LNC_ENTITY_KEYS = [
  "status", "cpu", "memory", "temperature", "wifi", "download", "upload", "users", "ip", "uptime",
  "updates_count", "system_updates", "restart_required", "update", "suspend", "restart", "shutdown"
];

/* Matched against the object id, the registry name and the friendly name
   (without the device name) of each entity, as slugs. */
const LNC_MATCH = {
  status: { domain: "binary_sensor", re: /(^|_)lwt$/ },
  cpu: { domain: "sensor", re: /(^|_)cpu_usage$/ },
  memory: { domain: "sensor", re: /(^|_)memory_usage$/ },
  wifi: { domain: "sensor", re: /(^|_)wi_?fi$/ },
  download: { domain: "sensor", re: /(^|_)network_download$/ },
  upload: { domain: "sensor", re: /(^|_)network_upload$/ },
  users: { domain: "sensor", re: /(^|_)current_users?$/ },
  uptime: { domain: "sensor", re: /(^|_)boot_time$/ },
  updates_count: { domain: "sensor", re: /(^|_)system_updates_count$/ },
  system_updates: { domain: "binary_sensor", re: /(^|_)system_updates$/ },
  restart_required: { domain: "binary_sensor", re: /(^|_)required_restart$/ },
  update: { domain: "update", re: /(^|_)update$/ },
  suspend: { domain: "button", re: /(^|_)suspend$/ },
  restart: { domain: "button", re: /(^|_)restart$/ },
  shutdown: { domain: "button", re: /(^|_)shut_?down$/ }
};

/* Network interfaces that are not the main connection of the computer. */
const LNC_VIRTUAL_IF = /^(lo|docker|veth|br|virbr|tailscale|zt|wg|tun|tap|vmnet|vboxnet|lxc|lxd|podman|cni|flannel|nordlynx|proton)/;

const LNC_COLORS = {
  green: "var(--green-color, #4caf50)",
  grey: "var(--grey-color, #9e9e9e)",
  disabled: "var(--disabled-text-color, #9e9e9e)",
  red: "var(--red-color, #f44336)",
  orange: "var(--orange-color, #ff9800)",
  amber: "var(--amber-color, #ffc107)",
  blue: "var(--blue-color, #2196f3)",
  purple: "var(--purple-color, #9c27b0)",
  cyan: "var(--cyan-color, #00bcd4)",
  indigo: "var(--indigo-color, #3f51b5)",
  teal: "var(--teal-color, #009688)",
  blueGrey: "var(--blue-grey-color, #607d8b)",
  primary: "var(--primary-color, #03a9f4)"
};

const LNC_I18N = {
  en: {
    status_on: "Online",
    status_off: "Offline",
    status_unavailable: "Unavailable",
    cpu: "CPU",
    ram: "RAM",
    storage: "Storage",
    cpu_temp: "CPU temp",
    updates: "Updates",
    up_to_date: "Up to date",
    wifi: "Wi-Fi",
    download: "Download",
    upload: "Upload",
    user: "User",
    nobody: "Nobody",
    uptime: "Uptime",
    up_days: "{d} d {h} h",
    up_hours: "{h} h {m} min",
    up_minutes: "{m} min",
    alert_restart: "Restart required to complete the updates",
    alert_updates: "System updates available",
    alert_lnxlink: "LNXlink {version} available",
    act_suspend: "Suspend",
    act_restart: "Restart",
    act_shutdown: "Shut down",
    confirm: "Confirm?",
    no_device: "No LNXlink computer found",
    no_device_hint: "Install LNXlink on the computer with MQTT discovery enabled, or pick the entities in the card editor.",
    sec_display: "Display",
    sec_sensors: "Sensors",
    sec_alerts: "Alerts",
    sec_buttons: "Power buttons",
    ed_device: "Computer (LNXlink device)",
    ed_name: "Name",
    ed_subtitle: "Subtitle",
    ed_icon: "Icon",
    ed_hours_to_show: "Chart history (hours)",
    ed_show_charts: "CPU and RAM charts",
    ed_show_storage: "Storage",
    ed_show_details: "Details",
    ed_show_actions: "Power buttons",
    ed_confirm_actions: "Confirm restart and shut down with a second tap",
    ed_status_entity: "Online status (LWT)",
    ed_cpu_entity: "CPU usage",
    ed_memory_entity: "Memory usage",
    ed_temperature_entity: "CPU temperature",
    ed_disk_entities: "Disks",
    ed_wifi_entity: "Wi-Fi signal",
    ed_download_entity: "Download",
    ed_upload_entity: "Upload",
    ed_users_entity: "Current users",
    ed_ip_entity: "Network interface (IP address)",
    ed_uptime_entity: "Boot time",
    ed_updates_count_entity: "Number of system updates",
    ed_system_updates_entity: "System updates",
    ed_restart_required_entity: "Restart required",
    ed_update_entity: "LNXlink update",
    ed_suspend_entity: "Suspend button",
    ed_restart_entity: "Restart button",
    ed_shutdown_entity: "Shut down button"
  },
  it: {
    status_on: "Online",
    status_off: "Offline",
    status_unavailable: "Non disponibile",
    cpu: "CPU",
    ram: "RAM",
    storage: "Archiviazione",
    cpu_temp: "Temp. CPU",
    updates: "Update",
    up_to_date: "Aggiornato",
    wifi: "Wi-Fi",
    download: "Download",
    upload: "Upload",
    user: "Utente",
    nobody: "Nessuno",
    uptime: "Acceso da",
    up_days: "{d} g {h} h",
    up_hours: "{h} h {m} min",
    up_minutes: "{m} min",
    alert_restart: "Riavvio richiesto per completare gli aggiornamenti",
    alert_updates: "Aggiornamenti di sistema disponibili",
    alert_lnxlink: "LNXlink {version} disponibile",
    act_suspend: "Sospendi",
    act_restart: "Riavvia",
    act_shutdown: "Spegni",
    confirm: "Confermi?",
    no_device: "Nessun computer LNXlink trovato",
    no_device_hint: "Installa LNXlink sul computer con il discovery MQTT attivo, oppure scegli le entit\u00e0 nell'editor della card.",
    sec_display: "Visualizzazione",
    sec_sensors: "Sensori",
    sec_alerts: "Avvisi",
    sec_buttons: "Pulsanti di alimentazione",
    ed_device: "Computer (dispositivo LNXlink)",
    ed_name: "Nome",
    ed_subtitle: "Sottotitolo",
    ed_icon: "Icona",
    ed_hours_to_show: "Storico dei grafici (ore)",
    ed_show_charts: "Grafici CPU e RAM",
    ed_show_storage: "Archiviazione",
    ed_show_details: "Dettagli",
    ed_show_actions: "Pulsanti di alimentazione",
    ed_confirm_actions: "Conferma riavvio e spegnimento con un secondo tocco",
    ed_status_entity: "Stato online (LWT)",
    ed_cpu_entity: "Uso CPU",
    ed_memory_entity: "Uso memoria",
    ed_temperature_entity: "Temperatura CPU",
    ed_disk_entities: "Dischi",
    ed_wifi_entity: "Segnale Wi-Fi",
    ed_download_entity: "Download",
    ed_upload_entity: "Upload",
    ed_users_entity: "Utenti connessi",
    ed_ip_entity: "Interfaccia di rete (indirizzo IP)",
    ed_uptime_entity: "Ora di avvio",
    ed_updates_count_entity: "Numero di aggiornamenti di sistema",
    ed_system_updates_entity: "Aggiornamenti di sistema",
    ed_restart_required_entity: "Riavvio richiesto",
    ed_update_entity: "Aggiornamento LNXlink",
    ed_suspend_entity: "Pulsante sospensione",
    ed_restart_entity: "Pulsante riavvio",
    ed_shutdown_entity: "Pulsante spegnimento"
  }
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function lncLang(hass) {
  const l = (hass && ((hass.locale && hass.locale.language) || hass.language)) ||
    (typeof navigator !== "undefined" ? navigator.language : "en");
  const code = String(l || "en").toLowerCase().split(/[-_]/)[0];
  return LNC_I18N[code] ? code : "en";
}

function lncLocale(hass) {
  return String((hass && ((hass.locale && hass.locale.language) || hass.language)) || "en").replace("_", "-");
}

/* Locale for numbers, following the number format of the Home Assistant profile. */
function lncNumberLocale(hass) {
  const nf = hass && hass.locale && hass.locale.number_format;
  if (nf === "comma_decimal") return "en-US";
  if (nf === "decimal_comma") return "de-DE";
  if (nf === "space_comma") return "fr-FR";
  return lncLocale(hass);
}

function lncT(lang, key, vars) {
  const table = LNC_I18N[lang] || LNC_I18N.en;
  let s = table[key] != null ? table[key] : (LNC_I18N.en[key] != null ? LNC_I18N.en[key] : key);
  if (vars) for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
  return s;
}

function lncEsc(v) {
  return String(v == null ? "" : v).replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]);
}

function lncFmt(hass, value, digits) {
  const d = digits || 0;
  try {
    const grouping = !(hass && hass.locale && hass.locale.number_format === "none");
    return new Intl.NumberFormat(lncNumberLocale(hass), {
      minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: grouping
    }).format(value);
  } catch (e) {
    return Number(value).toFixed(d);
  }
}

function lncTrunc(text, max) {
  const s = String(text == null ? "" : text);
  return s.length > max ? s.slice(0, max - 1) + LNC_ELL : s;
}

function lncSlug(text) {
  return String(text == null ? "" : text).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function lncState(hass, id) {
  return id && hass && hass.states ? hass.states[id] || null : null;
}

/* Has a real value: not missing, unknown or unavailable. */
function lncAvail(st) {
  return !!st && st.state !== "unavailable" && st.state !== "unknown";
}

/* A button entity is "unknown" until it is pressed for the first time: that is
   not unavailability. */
function lncButtonOk(st) {
  return !!st && st.state !== "unavailable";
}

function lncNum(hass, id) {
  const st = lncState(hass, id);
  if (!lncAvail(st)) return null;
  const n = parseFloat(st.state);
  return isFinite(n) ? n : null;
}

function lncText(hass, id) {
  const st = lncState(hass, id);
  return lncAvail(st) ? String(st.state) : null;
}

function lncAttr(st, key) {
  return st && st.attributes && st.attributes[key] != null && st.attributes[key] !== "" ? st.attributes[key] : null;
}

/* Rates: fewer decimals for larger values. */
function lncRateDigits(v) {
  const a = Math.abs(v);
  return a >= 100 ? 0 : a >= 10 ? 1 : 2;
}

/* "3 h 12 min" from a boot timestamp. */
function lncUptime(lang, bootIso, now) {
  const t = Date.parse(bootIso);
  if (!isFinite(t)) return null;
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d > 0) return lncT(lang, "up_days", { d: d, h: h });
  if (h > 0) return lncT(lang, "up_hours", { h: h, m: m });
  return lncT(lang, "up_minutes", { m: m });
}

/* ------------------------------------------------------------------ */
/* Discovery                                                           */
/* ------------------------------------------------------------------ */

function lncDeviceName(dev) {
  return dev ? String(dev.name_by_user || dev.name || "") : "";
}

/* LNXlink computers in the device registry, sorted by name. */
function lncDevices(hass) {
  const devs = hass && hass.devices ? Object.values(hass.devices) : [];
  return devs.filter((d) => d && d.manufacturer === LNC_MANUFACTURER && !d.disabled_by)
    .sort((a, b) => lncDeviceName(a).localeCompare(lncDeviceName(b)) || String(a.id).localeCompare(String(b.id)));
}

/* The names an entity is known by, as slugs. */
function lncNames(hass, id, deviceName) {
  const out = [String(id).split(".").slice(1).join(".")];
  const reg = hass.entities && hass.entities[id];
  if (reg && reg.name) out.push(lncSlug(reg.name));
  const st = lncState(hass, id);
  const fn = lncAttr(st, "friendly_name");
  if (fn) {
    let n = String(fn).trim();
    if (deviceName && n.toLowerCase().indexOf(deviceName.toLowerCase()) === 0) n = n.slice(deviceName.length);
    out.push(lncSlug(n));
  }
  return out.filter(Boolean);
}

function lncIsTemperature(st) {
  const u = lncAttr(st, "unit_of_measurement");
  return lncAttr(st, "device_class") === "temperature" || u === LNC_DEG + "C" || u === LNC_DEG + "F";
}

/* Lower is better: the CPU package sensor first, single cores and other chips last. */
function lncTemperatureRank(names) {
  const s = names.join(" ");
  if (/package|tctl|tdie|cpu_temp/.test(s)) return 0;
  if (/k10temp|zenpower|coretemp|cpu/.test(s)) return /core_?\d/.test(s) ? 2 : 1;
  if (/acpitz|thermal_zone/.test(s)) return 3;
  return 4;
}

function lncInterface(names) {
  for (const n of names) {
    const m = n.match(/(^|_)interface_(.+)$/);
    if (m) return m[2];
  }
  return null;
}

/* Lower is better: wireless, then wired, then anything else; virtual last. */
function lncInterfaceRank(name) {
  if (LNC_VIRTUAL_IF.test(name)) return 9;
  if (/^wl/.test(name)) return 0;
  if (/^(en|eth)/.test(name)) return 1;
  return 2;
}

function lncIsIPv4(v) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(v || ""));
}

function lncIsDisk(names, st) {
  const unit = lncAttr(st, "unit_of_measurement");
  if (unit && unit !== "%") return false;
  return names.some((n) => /(^|_)disk_(?!io(_|$))/.test(n) || /^disk_(?!io(_|$))/.test(n));
}

/* Finds every entity of an LNXlink computer from the entity registry. */
function lncDiscover(hass, device) {
  const found = { entities: {}, disks: [] };
  if (!hass || !hass.entities || !device) return found;
  const devName = lncDeviceName(device);
  const temps = [], ifaces = [];
  const ids = Object.keys(hass.entities).filter((id) => {
    const e = hass.entities[id];
    return e && e.device_id === device.id && !e.hidden;
  }).sort();
  for (const id of ids) {
    const domain = id.split(".")[0];
    const st = lncState(hass, id);
    const names = lncNames(hass, id, devName);
    for (const key of Object.keys(LNC_MATCH)) {
      const m = LNC_MATCH[key];
      if (found.entities[key] || m.domain !== domain) continue;
      if (names.some((n) => m.re.test(n))) found.entities[key] = id;
    }
    if (domain === "update" && !found.entities.update) found.entities.update = id;
    if (domain !== "sensor") continue;
    if (lncIsTemperature(st)) temps.push({ id: id, rank: lncTemperatureRank(names), ok: lncAvail(st) });
    const ifname = lncInterface(names);
    if (ifname) ifaces.push({ id: id, rank: lncInterfaceRank(ifname), ok: lncIsIPv4(st && st.state) });
    if (lncIsDisk(names, st)) found.disks.push(id);
  }
  const best = (list) => list.sort((a, b) => a.rank - b.rank || (b.ok - a.ok) || a.id.localeCompare(b.id))[0];
  const t = best(temps);
  if (t) found.entities.temperature = t.id;
  const i = best(ifaces.filter((x) => x.rank < 9)) || best(ifaces);
  if (i) found.entities.ip = i.id;
  return found;
}

/* The computer and the entities shown by the card: configuration first, then discovery. */
function lncResolve(config, hass) {
  const cfg = Object.assign({}, LNC_DEFAULTS, config || {});
  const devices = lncDevices(hass);
  let device = null;
  if (cfg.device) {
    device = (hass && hass.devices && hass.devices[cfg.device]) || null;
  } else {
    for (const key of LNC_ENTITY_KEYS) {
      const id = cfg[key + "_entity"];
      const e = id && hass && hass.entities ? hass.entities[id] : null;
      if (e && e.device_id && hass.devices && hass.devices[e.device_id]) {
        device = hass.devices[e.device_id];
        break;
      }
    }
    if (!device) device = devices[0] || null;
  }
  const found = lncDiscover(hass, device);
  const entities = {};
  for (const key of LNC_ENTITY_KEYS) entities[key] = cfg[key + "_entity"] || found.entities[key] || null;
  let disks = cfg.disk_entities;
  const ownDisks = Array.isArray(disks) ? disks.length > 0 : !!disks;
  if (!ownDisks) disks = found.disks;
  else if (!Array.isArray(disks)) disks = [disks];
  return {
    cfg: cfg,
    device: device,
    devices: devices,
    found: found,
    entities: entities,
    disks: disks.slice(),
    ownDisks: ownDisks,
    name: cfg.name || lncDeviceName(device) || LNC_MANUFACTURER,
    subtitle: cfg.subtitle || (device && device.model) || LNC_MANUFACTURER
  };
}

/* Discovered disks in a natural order: the root partition first, then by mount point. */
function lncSortDisks(hass, ids) {
  const key = (id) => {
    const mp = lncAttr(lncState(hass, id), "mountpoint");
    return mp == null ? "~" + id : (mp === "/" ? "" : String(mp));
  };
  return ids.slice().sort((a, b) => key(a).localeCompare(key(b)));
}

function lncDiskLabel(hass, id) {
  const mp = lncAttr(lncState(hass, id), "mountpoint");
  if (mp) return String(mp);
  const slug = String(id).split(".").slice(1).join(".");
  const m = slug.match(/disk_(?:dev_)?(.+)$/);
  return m ? m[1] : slug;
}

/* on, off or unavailable. Without a status entity, the CPU sensor decides. */
function lncStatus(hass, entities) {
  const s = lncState(hass, entities.status);
  if (s) return s.state === "on" ? "on" : s.state === "off" ? "off" : "unavailable";
  const c = lncState(hass, entities.cpu);
  if (c) return lncAvail(c) ? "on" : "off";
  return "unavailable";
}

/* ------------------------------------------------------------------ */
/* History and charts                                                  */
/* ------------------------------------------------------------------ */

function lncTime(row) {
  if (row.lu != null) return row.lu * 1000;
  if (row.lc != null) return row.lc * 1000;
  const t = Date.parse(row.last_updated || row.last_changed || "");
  return isFinite(t) ? t : null;
}

/* Numeric series [[time, value]] from a history/history_during_period answer. */
function lncSeries(result, id) {
  const rows = result && result[id] ? result[id] : [];
  const out = [];
  for (const r of rows) {
    const t = lncTime(r);
    const v = parseFloat(r.s != null ? r.s : r.state);
    if (t != null && isFinite(v)) out.push([t, v]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/* SVG path in a 100 x 40 box: x by time, y autoscaled, the line held up to "end". */
function lncPath(points, start, end) {
  if (!points || !points.length) return "";
  let lo = Infinity, hi = -Infinity;
  for (const p of points) {
    if (p[1] < lo) lo = p[1];
    if (p[1] > hi) hi = p[1];
  }
  if (hi - lo < 5) {
    hi += 3;
    lo = Math.max(0, lo - 2);
  }
  const span = end - start || 1, range = hi - lo || 1;
  const x = (t) => Math.max(0, Math.min(100, (t - start) / span * 100)).toFixed(1);
  const y = (v) => (38 - (v - lo) / range * 36).toFixed(1);
  let d = "", lastY = null;
  for (const p of points) {
    const py = y(p[1]);
    d += (d ? " L" : "M") + x(p[0]) + " " + py;
    lastY = py;
  }
  return d + " L100 " + lastY;
}

/* ------------------------------------------------------------------ */
/* Editor schema                                                       */
/* ------------------------------------------------------------------ */

function lncEditorSchema(lang) {
  const ent = (name, domain) => ({ name: name, selector: { entity: { domain: domain } } });
  return [
    { name: "device", selector: { device: { filter: { manufacturer: LNC_MANUFACTURER } } } },
    {
      type: "grid", name: "", schema: [
        { name: "name", selector: { text: {} } },
        { name: "subtitle", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "hours_to_show", selector: { number: { min: 1, max: 48, step: 1, mode: "box", unit_of_measurement: "h" } } }
      ]
    },
    {
      type: "expandable", name: "", title: lncT(lang, "sec_display"), schema: [
        { name: "show_charts", selector: { boolean: {} } },
        { name: "show_storage", selector: { boolean: {} } },
        { name: "show_details", selector: { boolean: {} } },
        { name: "show_actions", selector: { boolean: {} } },
        { name: "confirm_actions", selector: { boolean: {} } }
      ]
    },
    {
      type: "expandable", name: "", title: lncT(lang, "sec_sensors"), schema: [
        ent("status_entity", "binary_sensor"),
        ent("cpu_entity", "sensor"),
        ent("memory_entity", "sensor"),
        ent("temperature_entity", "sensor"),
        { name: "disk_entities", selector: { entity: { domain: "sensor", multiple: true } } },
        ent("wifi_entity", "sensor"),
        ent("download_entity", "sensor"),
        ent("upload_entity", "sensor"),
        ent("users_entity", "sensor"),
        ent("ip_entity", "sensor"),
        ent("uptime_entity", "sensor")
      ]
    },
    {
      type: "expandable", name: "", title: lncT(lang, "sec_alerts"), schema: [
        ent("updates_count_entity", "sensor"),
        ent("system_updates_entity", "binary_sensor"),
        ent("restart_required_entity", "binary_sensor"),
        ent("update_entity", "update")
      ]
    },
    {
      type: "expandable", name: "", title: lncT(lang, "sec_buttons"), schema: [
        ent("suspend_entity", "button"),
        ent("restart_entity", "button"),
        ent("shutdown_entity", "button")
      ]
    }
  ];
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

const LNC_STYLE = `
:host { display: block; }
ha-card { overflow: hidden; padding: 0; height: 100%; box-sizing: border-box; }
[data-e], [data-a] { cursor: pointer; }
[data-e]:focus-visible, button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.head { display: flex; align-items: center; gap: 12px; padding: 14px 16px 4px; border-radius: 12px; }
.badge { width: 40px; height: 40px; border-radius: 50%; flex: none; display: flex; align-items: center;
  justify-content: center; color: #fff; transition: background-color .3s; }
.badge ha-icon { --mdc-icon-size: 22px; }
.tt { flex: 1; min-width: 0; }
.tt .t { font-size: 16px; font-weight: 600; color: var(--primary-text-color); line-height: 1.3;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt .s { font-size: 13px; color: var(--secondary-text-color); line-height: 1.3;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.big { font-size: 24px; font-weight: 700; white-space: nowrap; color: var(--lnc-accent, var(--primary-text-color)); }
.big small { font-size: 13px; font-weight: 600; color: var(--secondary-text-color); }
.alerts { display: flex; flex-direction: column; gap: 6px; padding: 8px 12px 0; }
.alerts:empty { display: none; }
.chip { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; padding: 8px 10px;
  border-radius: 12px; }
.chip ha-icon { --mdc-icon-size: 16px; flex: none; }
.chip.warn { background: color-mix(in srgb, var(--orange-color, #ff9800) 14%, transparent); color: var(--orange-color, #ff9800); }
.chip.info { background: color-mix(in srgb, var(--blue-color, #2196f3) 12%, transparent); color: var(--blue-color, #2196f3); }
.charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; padding: 10px 12px 0; }
.box { border-radius: 12px; min-width: 0;
  background: var(--ha-card-background-secondary, rgba(var(--rgb-primary-text-color, 0, 0, 0), .045)); }
.ch { padding: 8px 10px 6px; }
.hd { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; margin-bottom: 4px; }
.lbl { font-size: 11px; color: var(--secondary-text-color); }
.val { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; }
.val small { font-weight: 500; color: var(--secondary-text-color); }
.ch svg { width: 100%; height: 46px; display: block; }
.stor { margin: 10px 12px 0; padding: 8px 10px 10px; }
.stor .hd { margin-bottom: 0; }
.srow { display: flex; align-items: center; gap: 8px; margin-top: 7px; border-radius: 6px; }
.sk { font-size: 11px; color: var(--secondary-text-color); width: 72px; flex: none; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.sbar { flex: 1; height: 6px; border-radius: 3px; background: var(--divider-color); overflow: hidden; }
.sbar > div { height: 100%; border-radius: 3px; transition: width .6s ease; }
.sv { font-size: 11px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; flex: none;
  min-width: 108px; text-align: right; }
.sv small { font-weight: 500; color: var(--secondary-text-color); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; padding: 10px 12px 0; }
.cell { display: flex; align-items: center; gap: 8px; padding: 8px 10px; }
.ic { width: 32px; height: 32px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; }
.ic ha-icon { --mdc-icon-size: 18px; }
.tx { min-width: 0; }
.tx .v { font-size: 14px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx .v small { font-weight: 500; color: var(--secondary-text-color); }
.tx .k { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acts { display: flex; gap: 8px; padding: 10px 12px 0; }
.acts button { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 8px; border: none; border-radius: 12px; font: inherit; font-size: 13px; font-weight: 600;
  white-space: nowrap; transition: filter .15s, background-color .2s; }
.acts button:hover:not([disabled]) { filter: brightness(1.08); }
.acts button ha-icon { --mdc-icon-size: 17px; flex: none; }
.acts button[disabled] { opacity: .4; cursor: not-allowed; }
.end { height: 14px; }
.empty { padding: 20px 16px; }
.empty .t { font-size: 15px; font-weight: 600; color: var(--primary-text-color); }
.empty .h { margin-top: 4px; font-size: 13px; color: var(--secondary-text-color); }
[hidden] { display: none !important; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

class LnxlinkCard extends HTMLElement {
  static getStubConfig() {
    return {};
  }

  static async getConfigElement() {
    return document.createElement(LNC_EDITOR_TAG);
  }

  setConfig(config) {
    if (config && typeof config !== "object") throw new Error("Invalid configuration");
    this._config = Object.assign({}, config || {});
    this._res = null;
    this._built = false;
    this._parts = {};
    this._hist = null;
    this._histKey = null;
    this._confirm = null;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    const c = Object.assign({}, LNC_DEFAULTS, this._config || {});
    return 2 + (c.show_charts ? 2 : 0) + (c.show_storage ? 1 : 0) + (c.show_details ? 2 : 0) + (c.show_actions ? 1 : 0);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  connectedCallback() {
    if (!this._timer) this._timer = setInterval(() => this._fetchHistory(true), LNC_REFRESH_MS);
    if (this._hass) this._render();
  }

  disconnectedCallback() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    if (this._cto) clearTimeout(this._cto);
    this._cto = null;
  }

  _root() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    return this.shadowRoot;
  }

  /* Discovery runs again only when the registries or the configuration change. */
  _resolve() {
    const h = this._hass;
    if (!this._res || this._resEntities !== h.entities || this._resDevices !== h.devices) {
      this._res = lncResolve(this._config, h);
      this._resEntities = h.entities;
      this._resDevices = h.devices;
    }
    return this._res;
  }

  _render() {
    if (!this._hass || !this._config) return;
    const hass = this._hass;
    const lang = lncLang(hass);
    const r = this._resolve();
    const hasAny = r.device || LNC_ENTITY_KEYS.some((k) => r.entities[k]) || r.disks.length;
    if (!hasAny) {
      this._built = false;
      this._parts = {};
      this._root().innerHTML = `<style>${LNC_STYLE}</style><ha-card><div class="empty"><div class="t">${lncEsc(lncT(lang, "no_device"))}</div><div class="h">${lncEsc(lncT(lang, "no_device_hint"))}</div></div></ha-card>`;
      return;
    }
    if (!this._built) this._build();
    const status = lncStatus(hass, r.entities);
    const online = status === "on";
    if (!online) this._confirm = null;
    const cfg = r.cfg;
    this._set("head", this._headHtml(hass, lang, r, status));
    this._set("alerts", this._alertsHtml(hass, lang, r));
    this._show("charts", cfg.show_charts && (r.entities.cpu || r.entities.memory));
    if (cfg.show_charts) this._set("charts", this._chartsHtml(hass, lang, r));
    this._show("stor", cfg.show_storage && r.disks.length);
    if (cfg.show_storage) this._set("stor", this._storageHtml(hass, lang, r));
    this._show("grid", cfg.show_details);
    if (cfg.show_details) this._set("grid", this._detailsHtml(hass, lang, r, online));
    this._show("acts", cfg.show_actions && (r.entities.suspend || r.entities.restart || r.entities.shutdown));
    if (cfg.show_actions) this._set("acts", this._actionsHtml(hass, lang, r, online));
    if (cfg.show_charts) this._fetchHistory(false);
  }

  _build() {
    const root = this._root();
    root.innerHTML = `<style>${LNC_STYLE}</style>
<ha-card>
  <div id="head"></div>
  <div class="alerts" id="alerts"></div>
  <div class="charts" id="charts"></div>
  <div class="stor box" id="stor"></div>
  <div class="grid" id="grid"></div>
  <div class="acts" id="acts"></div>
  <div class="end"></div>
</ha-card>`;
    const card = root.querySelector("ha-card");
    card.addEventListener("click", (ev) => this._onClick(ev));
    card.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const el = ev.composedPath()[0];
      if (el && el.dataset && el.dataset.e && el.tagName !== "BUTTON") {
        ev.preventDefault();
        this._more(el.dataset.e);
      }
    });
    this._parts = {};
    this._built = true;
  }

  /* Replaces the content of a part only when it changed. */
  _set(id, html) {
    if (this._parts[id] === html) return;
    this._parts[id] = html;
    const el = this._root().getElementById(id);
    if (el) el.innerHTML = html;
  }

  _show(id, visible) {
    const el = this._root().getElementById(id);
    if (el) el.hidden = !visible;
  }

  _onClick(ev) {
    const path = ev.composedPath();
    for (const el of path) {
      if (!el || !el.dataset) continue;
      if (el.dataset.a) {
        ev.stopPropagation();
        if (!el.disabled) this._action(el.dataset.a);
        return;
      }
      if (el.dataset.e) {
        this._more(el.dataset.e);
        return;
      }
      if (el.tagName === "HA-CARD") return;
    }
  }

  _more(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: entityId } }));
  }

  _action(kind) {
    const r = this._res;
    if (!r || !this._hass) return;
    const id = r.entities[kind];
    if (!id) return;
    const needsConfirm = r.cfg.confirm_actions !== false && (kind === "restart" || kind === "shutdown");
    if (needsConfirm && this._confirm !== kind) {
      this._confirm = kind;
      if (this._cto) clearTimeout(this._cto);
      this._cto = setTimeout(() => {
        this._confirm = null;
        this._render();
      }, LNC_CONFIRM_MS);
      this._render();
      return;
    }
    this._confirm = null;
    if (this._cto) clearTimeout(this._cto);
    this._hass.callService("button", "press", { entity_id: id });
    this._render();
  }

  _attrs(entityId) {
    return entityId ? ` data-e="${lncEsc(entityId)}" tabindex="0" role="button"` : "";
  }

  _headHtml(hass, lang, r, status) {
    const online = status === "on";
    const color = online ? LNC_COLORS.green : status === "off" ? LNC_COLORS.grey : LNC_COLORS.disabled;
    let icon = r.cfg.icon || LNC_DEFAULTS.icon;
    if (status === "off" && icon === "mdi:laptop") icon = "mdi:laptop-off";
    if (status === "unavailable") icon = "mdi:lan-disconnect";
    this.style.setProperty("--lnc-accent", color);
    let sub;
    if (online) {
      const parts = [lncT(lang, "status_on")];
      const ip = lncText(hass, r.entities.ip);
      if (ip) parts.push(ip);
      const ssid = lncAttr(lncState(hass, r.entities.wifi), "SSID");
      if (ssid) parts.push(lncTrunc(ssid, 18));
      sub = parts.join(" " + LNC_DOT + " ");
    } else {
      sub = r.subtitle + " " + LNC_DOT + " " + lncT(lang, status === "off" ? "status_off" : "status_unavailable");
    }
    const cpu = lncNum(hass, r.entities.cpu);
    const big = online && cpu != null
      ? `<div class="big" id="big">${lncEsc(lncFmt(hass, cpu, 0))}%<small> ${lncEsc(lncT(lang, "cpu"))}</small></div>` : "";
    return `<div class="head"${this._attrs(r.entities.status || r.entities.cpu)}>
  <div class="badge" style="background:${color}"><ha-icon icon="${lncEsc(icon)}"></ha-icon></div>
  <div class="tt"><div class="t" id="name">${lncEsc(r.name)}</div><div class="s" id="sub">${lncEsc(sub)}</div></div>
  ${big}
</div>`;
  }

  _alertsHtml(hass, lang, r) {
    let out = "";
    const chip = (cls, id, icon, text) =>
      `<div class="chip ${cls}"${this._attrs(id)}><ha-icon icon="${icon}"></ha-icon><span>${lncEsc(text)}</span></div>`;
    const restart = lncState(hass, r.entities.restart_required);
    if (restart && restart.state === "on") out += chip("warn", r.entities.restart_required, "mdi:restart-alert", lncT(lang, "alert_restart"));
    const sys = lncState(hass, r.entities.system_updates);
    if (sys && sys.state === "on") out += chip("info", r.entities.system_updates, "mdi:package-up", lncT(lang, "alert_updates"));
    const upd = lncState(hass, r.entities.update);
    if (upd && upd.state === "on") {
      const v = lncAttr(upd, "latest_version");
      out += chip("info", r.entities.update, "mdi:update", lncT(lang, "alert_lnxlink", { version: v ? String(v) : "" }).replace("  ", " "));
    }
    return out;
  }

  _chartsHtml(hass, lang, r) {
    const block = (id, entityId, label, color) => {
      if (!entityId) return "";
      const v = lncNum(hass, entityId);
      const h = this._hist && this._hist.series ? this._hist.series[entityId] : null;
      let path = "";
      if (h && h.length) path = lncPath(h, this._hist.start, this._hist.end);
      const value = v != null ? lncEsc(lncFmt(hass, v, 1)) + "%" : LNC_DASH;
      return `<div class="ch box" id="${id}"${this._attrs(entityId)}>
  <div class="hd"><span class="lbl">${lncEsc(label)}</span><span class="val">${value}</span></div>
  <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">${path ? `<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` : ""}</svg>
</div>`;
    };
    return block("ch_cpu", r.entities.cpu, lncT(lang, "cpu"), LNC_COLORS.blue) +
      block("ch_ram", r.entities.memory, lncT(lang, "ram"), LNC_COLORS.purple);
  }

  _storageHtml(hass, lang, r) {
    const ids = r.ownDisks ? r.disks : lncSortDisks(hass, r.disks);
    let used = 0, total = 0, rows = "";
    for (const id of ids) {
      const st = lncState(hass, id);
      const pct = lncNum(hass, id);
      const size = parseFloat(lncAttr(st, "total"));
      const label = lncDiskLabel(hass, id);
      let value = LNC_DASH, bar = "";
      if (pct != null) {
        const color = pct >= 90 ? LNC_COLORS.red : pct >= 80 ? LNC_COLORS.orange : LNC_COLORS.blueGrey;
        bar = `<div style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%;background:${color}"></div>`;
        value = lncEsc(lncFmt(hass, pct, 0)) + "%";
        if (isFinite(size) && size > 0) {
          const u = size * pct / 100;
          used += u;
          total += size;
          value += ` <small>${lncEsc(lncFmt(hass, u, size < 10 ? 1 : 0))}/${lncEsc(lncFmt(hass, size, size < 10 ? 1 : 0))} GB</small>`;
        }
      }
      rows += `<div class="srow"${this._attrs(id)}><span class="sk" title="${lncEsc(label)}">${lncEsc(label)}</span><div class="sbar">${bar}</div><span class="sv">${value}</span></div>`;
    }
    const head = total > 0
      ? `${lncEsc(lncFmt(hass, used, 0))}/${lncEsc(lncFmt(hass, total, 0))} GB <small>${lncEsc(lncFmt(hass, used / total * 100, 0))}%</small>`
      : LNC_DASH;
    return `<div class="hd"><span class="lbl">${lncEsc(lncT(lang, "storage"))}</span><span class="val" id="stor_total">${head}</span></div>${rows}`;
  }

  _detailsHtml(hass, lang, r, online) {
    const e = r.entities;
    const cells = [];
    const cell = (icon, color, valueHtml, label, entityId) => cells.push(
      `<div class="cell box"${this._attrs(entityId)}><div class="ic" style="background:color-mix(in srgb, ${color} 18%, transparent);color:${color}"><ha-icon icon="${icon}"></ha-icon></div><div class="tx"><div class="v">${valueHtml}</div><div class="k">${lncEsc(label)}</div></div></div>`);
    if (e.temperature) {
      const t = lncNum(hass, e.temperature);
      const unit = lncAttr(lncState(hass, e.temperature), "unit_of_measurement") || LNC_DEG + "C";
      const f = unit === LNC_DEG + "F";
      const warn = f ? 167 : 75, hot = f ? 194 : 90;
      const color = t == null ? LNC_COLORS.grey : t >= hot ? LNC_COLORS.red : t >= warn ? LNC_COLORS.orange : LNC_COLORS.green;
      cell("mdi:thermometer", color, t != null ? lncEsc(lncFmt(hass, t, 0) + unit) : LNC_DASH, lncT(lang, "cpu_temp"), e.temperature);
    }
    if (e.updates_count) {
      const n = lncNum(hass, e.updates_count);
      const count = n == null ? null : Math.round(n);
      const value = count == null ? LNC_DASH
        : count > 0 ? lncEsc(lncFmt(hass, count, 0)) : lncEsc(lncT(lang, "up_to_date"));
      cell("mdi:package-up", count > 0 ? LNC_COLORS.amber : LNC_COLORS.grey, value, lncT(lang, "updates"), e.updates_count);
    }
    if (e.wifi) {
      const w = lncNum(hass, e.wifi);
      const ssid = lncAttr(lncState(hass, e.wifi), "SSID");
      cell(w == null ? "mdi:wifi-off" : "mdi:wifi", w == null ? LNC_COLORS.grey : LNC_COLORS.cyan,
        w != null ? lncEsc(lncFmt(hass, w, 0)) + "%" : LNC_DASH, ssid && w != null ? lncTrunc(ssid, 16) : lncT(lang, "wifi"), e.wifi);
    }
    const rate = (id, icon, color, label) => {
      if (!id) return;
      const v = lncNum(hass, id);
      const unit = lncAttr(lncState(hass, id), "unit_of_measurement") || "Mbit/s";
      cell(icon, v == null ? LNC_COLORS.grey : color,
        v != null ? `${lncEsc(lncFmt(hass, v, lncRateDigits(v)))} <small>${lncEsc(unit)}</small>` : LNC_DASH, label, id);
    };
    rate(e.download, "mdi:arrow-down-bold", LNC_COLORS.indigo, lncT(lang, "download"));
    rate(e.upload, "mdi:arrow-up-bold", LNC_COLORS.teal, lncT(lang, "upload"));
    if (e.users) {
      const u = lncText(hass, e.users);
      const someone = u && u !== "No user";
      cell("mdi:account", someone ? LNC_COLORS.purple : LNC_COLORS.grey,
        someone ? lncEsc(lncTrunc(u, 14)) : (online ? lncEsc(lncT(lang, "nobody")) : LNC_DASH), lncT(lang, "user"), e.users);
    }
    if (e.uptime) {
      const boot = lncText(hass, e.uptime);
      const up = online && boot ? lncUptime(lang, boot, Date.now()) : null;
      cell("mdi:timer-outline", up ? LNC_COLORS.blueGrey : LNC_COLORS.grey, up ? lncEsc(up) : LNC_DASH, lncT(lang, "uptime"), e.uptime);
    }
    return cells.join("");
  }

  _actionsHtml(hass, lang, r, online) {
    const list = [
      ["suspend", "mdi:sleep", "act_suspend"],
      ["restart", "mdi:restart", "act_restart"],
      ["shutdown", "mdi:power", "act_shutdown"]
    ];
    let out = "";
    for (const [kind, icon, label] of list) {
      const id = r.entities[kind];
      if (!id) continue;
      const confirming = this._confirm === kind;
      const base = kind === "shutdown" ? LNC_COLORS.red : LNC_COLORS.primary;
      const bg = confirming ? base : `color-mix(in srgb, ${base} 14%, transparent)`;
      const fg = confirming ? "#fff" : base;
      const enabled = online && lncButtonOk(lncState(hass, id));
      out += `<button type="button" data-a="${kind}" id="act_${kind}"${enabled ? "" : " disabled"} style="background:${bg};color:${fg}"><ha-icon icon="${confirming ? "mdi:alert" : icon}"></ha-icon><span>${lncEsc(lncT(lang, confirming ? "confirm" : label))}</span></button>`;
    }
    return out;
  }

  /* CPU and RAM history from the recorder, refreshed every minute. */
  async _fetchHistory(force) {
    const hass = this._hass, r = this._res;
    if (!hass || !r || !r.cfg.show_charts || typeof hass.callWS !== "function") return;
    const ids = [r.entities.cpu, r.entities.memory].filter(Boolean);
    if (!ids.length) return;
    const hours = Math.max(1, Math.min(48, Number(r.cfg.hours_to_show) || LNC_DEFAULTS.hours_to_show));
    const key = ids.join(",") + "|" + hours;
    if (!force && this._histKey === key) return;
    if (this._fetching) return;
    this._histKey = key;
    this._fetching = true;
    const end = Date.now(), start = end - hours * LNC_HOUR;
    try {
      const result = await hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        entity_ids: ids,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false
      });
      const series = {};
      for (const id of ids) series[id] = lncSeries(result, id);
      this._hist = { start: start, end: end, series: series };
    } catch (e) {
      this._histKey = null;
    } finally {
      this._fetching = false;
    }
    this._render();
  }
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

async function lncEnsureHaForm() {
  if (customElements.get("ha-form")) return;
  try {
    const helpers = await window.loadCardHelpers();
    const card = await helpers.createCardElement({ type: "entities", entities: [] });
    if (card && card.constructor && card.constructor.getConfigElement) await card.constructor.getConfigElement();
  } catch (e) {
    /* ha-form is defined by the dashboard editor anyway */
  }
  await Promise.race([customElements.whenDefined("ha-form"), new Promise((res) => setTimeout(res, 2000))]);
}

function lncSameList(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
}

/* A clean configuration: no empty values, no defaults, and no entity that the
   card would find by itself anyway (so discovery keeps working). */
function lncCleanConfig(config, previous, hass) {
  const out = Object.assign({}, config);
  const prev = previous || {};
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v === "" || v === undefined || v === null || (Array.isArray(v) && !v.length)) delete out[k];
    else if (k in LNC_DEFAULTS && v === LNC_DEFAULTS[k]) delete out[k];
  }
  if (hass) {
    const auto = lncResolve({}, hass);
    if (out.device && !prev.device && auto.device && out.device === auto.device.id) delete out.device;
    const found = lncResolve(out.device ? { device: out.device } : {}, hass).found;
    for (const key of LNC_ENTITY_KEYS) {
      const k = key + "_entity";
      if (out[k] && !prev[k] && out[k] === found.entities[key]) delete out[k];
    }
    if (out.disk_entities && !prev.disk_entities &&
      lncSameList(out.disk_entities, lncSortDisks(hass, found.disks))) delete out.disk_entities;
  }
  out.type = "custom:" + LNC_TAG;
  return out;
}

class LnxlinkCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = Object.assign({}, config);
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  async _update() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      await lncEnsureHaForm();
      if (this._form) return;
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => (s.name ? lncT(lncLang(this._hass), "ed_" + s.name) : "");
      this._form.addEventListener("value-changed", (ev) => {
        this._config = lncCleanConfig(Object.assign({}, this._config, ev.detail.value || {}), this._config, this._hass);
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config: JSON.parse(JSON.stringify(this._config)) }, bubbles: true, composed: true
        }));
      });
      this.appendChild(this._form);
    }
    const lang = lncLang(this._hass);
    const r = lncResolve(this._config, this._hass);
    const data = Object.assign({}, LNC_DEFAULTS, this._config);
    data.device = this._config.device || (r.device ? r.device.id : undefined);
    for (const key of LNC_ENTITY_KEYS) data[key + "_entity"] = r.entities[key] || undefined;
    data.disk_entities = r.ownDisks ? r.disks : lncSortDisks(this._hass, r.disks);
    delete data.type;
    this._form.hass = this._hass;
    this._form.schema = lncEditorSchema(lang);
    this._form.data = data;
  }
}

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

if (customElements.get(LNC_TAG)) {
  console.warn("LNXLINK-CARD: another copy of the card is already loaded; remove the duplicate resource.");
} else {
  customElements.define(LNC_TAG, LnxlinkCard);
  customElements.define(LNC_EDITOR_TAG, LnxlinkCardEditor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: LNC_TAG,
    name: "LNXlink Card",
    description: "Linux computer monitored with LNXlink: status, CPU and RAM charts, storage, network, alerts and power buttons.",
    preview: true,
    documentationURL: LNC_REPO_URL
  });
  console.info("%c LNXLINK-CARD %c v" + LNC_VERSION + " ",
    "background:#2196f3;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px",
    "background:#444;color:#fff;border-radius:0 4px 4px 0;padding:2px 6px");
}
