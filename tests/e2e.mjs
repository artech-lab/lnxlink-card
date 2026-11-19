// End-to-end test in a real browser engine, with a simulated Home Assistant.
// Requires the dev dependencies:  npm install && npx playwright install chromium
// Run with:  npm run test:e2e   (a few seconds; CHROME_PATH=/path/to/chrome to use another browser)
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const CARD = fileURLToPath(new URL("../dist/lnxlink-card.js", import.meta.url));

const STUBS = `
<style>body{margin:0;padding:16px;background:#111;font-family:sans-serif;
  --primary-color:#03a9f4;--primary-text-color:#e1e1e1;--secondary-text-color:#9b9b9b;
  --card-background-color:#1c1c1c;--divider-color:rgba(225,225,225,.12);}
  #host{width:440px}</style>
<div id="host"></div>
<script>
customElements.define("ha-card", class extends HTMLElement {
  constructor(){ super(); this.attachShadow({mode:"open"}).innerHTML = '<slot></slot>'; }
});
customElements.define("ha-icon", class extends HTMLElement {});
customElements.define("ha-form", class extends HTMLElement {});
window.makeHass = function (lang, opts) {
  opts = opts || {};
  const log = { ws: [], more: [], services: [] };
  window.__log = log;
  const now = Date.now();
  const states = {}, entities = {};
  const devices = { demo: { id: "demo", name: "demo-pc", manufacturer: "LNXlink", model: "Ubuntu 24.04" } };
  const add = function (id, state, attrs) {
    states[id] = { state: String(state), attributes: Object.assign({ friendly_name: "demo-pc " + id.split(".")[1].replace("demo_pc_", "") }, attrs || {}) };
    entities[id] = { entity_id: id, device_id: "demo", platform: "mqtt" };
  };
  const off = opts.offline;
  const v = (x) => (off ? "unavailable" : x);
  add("binary_sensor.demo_pc_lwt", off ? "off" : "on");
  add("sensor.demo_pc_cpu_usage", v("23.4"), { unit_of_measurement: "%" });
  add("sensor.demo_pc_memory_usage", v("48.2"), { unit_of_measurement: "%" });
  add("sensor.demo_pc_temperature_coretemp_package_id_0", v("78"), { unit_of_measurement: "\\u00b0C", device_class: "temperature" });
  add("sensor.demo_pc_disk_dev_nvme0n1p2", v("91"), { unit_of_measurement: "%", mountpoint: "/", total: 200 });
  add("sensor.demo_pc_disk_dev_nvme0n1p1", v("6"), { unit_of_measurement: "%", mountpoint: "/boot/efi", total: 1 });
  add("sensor.demo_pc_wifi", v("72"), { unit_of_measurement: "%", SSID: "<i>Lab</i>" });
  add("sensor.demo_pc_network_download", v("18.25"), { unit_of_measurement: "Mbit/s" });
  add("sensor.demo_pc_network_upload", v("2.4"), { unit_of_measurement: "Mbit/s" });
  add("sensor.demo_pc_interface_enp3s0", v("192.0.2.10"));
  add("sensor.demo_pc_current_users", v("No user"));
  add("sensor.demo_pc_boot_time", v(new Date(now - (3 * 60 + 5) * 60000).toISOString()), { device_class: "timestamp" });
  add("sensor.demo_pc_system_updates_count", v("1"));
  add("binary_sensor.demo_pc_system_updates", v("on"));
  add("binary_sensor.demo_pc_required_restart", v("on"));
  add("update.demo_pc_update", v("on"), { latest_version: "2026.11.0" });
  add("button.demo_pc_suspend", v("unknown"));
  add("button.demo_pc_restart", v("unknown"));
  add("button.demo_pc_shutdown", v("unknown"));
  const rows = (vals) => vals.map((x, i) => ({ s: String(x), lu: (now - (vals.length - i) * 600000) / 1000 }));
  return {
    language: lang, locale: { language: lang }, states: states, entities: entities, devices: devices,
    callWS: async function (msg) {
      log.ws.push(msg.type + ":" + msg.entity_ids.join(","));
      return { "sensor.demo_pc_cpu_usage": rows([10, 40, 22, 23]), "sensor.demo_pc_memory_usage": rows([45, 47, 48]) };
    },
    callService: function (domain, service, data) { log.services.push(domain + "." + service + ":" + data.entity_id); }
  };
};
window.mount = function (config, hass) {
  const card = document.createElement("lnxlink-card");
  card.setConfig(Object.assign({ type: "custom:lnxlink-card" }, config));
  card.addEventListener("hass-more-info", function (ev) { window.__log.more.push(ev.detail.entityId); });
  document.getElementById("host").innerHTML = "";
  document.getElementById("host").appendChild(card);
  card.hass = hass;
  window.card = card;
  return card;
};
</script>`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.setContent(STUBS);
await page.addScriptTag({ path: CARD });
const q = (sel) => page.evaluate((s) => {
  const el = window.card.shadowRoot.querySelector(s);
  return el ? el.innerText.replace(/\s+/g, " ").trim() : null;
}, sel);
const all = (sel) => page.evaluate((s) =>
  [...window.card.shadowRoot.querySelectorAll(s)].map((el) => el.innerText.replace(/\s+/g, " ").trim()), sel);
const attr = (sel, a) => page.evaluate(([s, n]) => {
  const el = window.card.shadowRoot.querySelector(s);
  return el ? el.getAttribute(n) : null;
}, [sel, a]);
const hidden = (sel) => page.evaluate((s) => window.card.shadowRoot.querySelector(s).hidden, sel);
const click = (sel) => page.evaluate((s) => window.card.shadowRoot.querySelector(s).click(), sel);
const settle = () => page.waitForTimeout(150);

// 1. discovery and rendering without configuration
await page.evaluate(() => window.mount({}, window.makeHass("en")));
await settle();
assert.equal(await q("#name"), "demo-pc");
assert.equal(await q("#sub"), "Online · 192.0.2.10 · <i>Lab</i>", "the SSID is text, not HTML");
assert.equal(await q("#big"), "23% CPU");
assert.deepEqual(await all(".chip"), ["Restart required to complete the updates", "System updates available",
  "LNXlink 2026.11.0 available"]);
assert.deepEqual(await all(".ch .hd"), ["CPU 23.4%", "RAM 48.2%"]);
assert.match(await attr("#ch_cpu path", "d"), /^M\d/);
assert.equal(await q("#stor_total"), "182/201 GB 91%");
assert.deepEqual(await all(".srow .sk"), ["/", "/boot/efi"], "root partition first");
assert.equal(await attr(".srow .sbar > div", "style"), "width:91.0%;background:var(--red-color, #f44336)");
assert.deepEqual(await all(".cell"), ["78°C CPU temp", "1 Updates", "72% <i>Lab</i>", "18.3 Mbit/s Download",
  "2.40 Mbit/s Upload", "Nobody User", "3 h 5 min Uptime"]);
assert.deepEqual(await all(".acts button"), ["Suspend", "Restart", "Shut down"]);
assert.equal(await attr("#act_restart", "disabled"), null, "buttons in state unknown can be pressed");
assert.deepEqual(await page.evaluate(() => window.__log.ws), ["history/history_during_period:sensor.demo_pc_cpu_usage,sensor.demo_pc_memory_usage"]);
console.log("ok - discovery and rendering");

// 2. more-info from a click and from the keyboard
await click(".cell[data-e='sensor.demo_pc_wifi']");
await click(".srow[data-e='sensor.demo_pc_disk_dev_nvme0n1p1']");
await page.evaluate(() => window.card.shadowRoot.querySelector("#ch_ram").dispatchEvent(
  new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true })));
await click(".head");
assert.deepEqual(await page.evaluate(() => window.__log.more), ["sensor.demo_pc_wifi",
  "sensor.demo_pc_disk_dev_nvme0n1p1", "sensor.demo_pc_memory_usage", "binary_sensor.demo_pc_lwt"]);
console.log("ok - more-info");

// 3. power buttons: suspend at once, restart only after a second tap
await click("#act_suspend");
await click("#act_restart");
assert.equal(await q("#act_restart"), "Confirm?");
assert.deepEqual(await page.evaluate(() => window.__log.services), ["button.press:button.demo_pc_suspend"]);
await click("#act_restart");
assert.equal(await q("#act_restart"), "Restart");
assert.deepEqual(await page.evaluate(() => window.__log.services), ["button.press:button.demo_pc_suspend",
  "button.press:button.demo_pc_restart"]);
assert.deepEqual(await page.evaluate(() => window.__log.more.length), 4, "a button does not open more-info");
console.log("ok - power buttons");

// 4. offline: the layout stays, values become dashes, buttons are disabled
await page.evaluate(() => { window.card.hass = window.makeHass("en", { offline: true }); });
await settle();
assert.equal(await q("#sub"), "Ubuntu 24.04 · Offline");
assert.equal(await q("#big"), null);
assert.equal(await attr(".badge ha-icon", "icon"), "mdi:laptop-off");
assert.deepEqual(await all(".chip"), []);
assert.equal((await all(".cell")).length, 7);
assert.equal(await q(".cell"), "— CPU temp");
assert.equal(await attr("#act_shutdown", "disabled"), "");
await click("#act_shutdown");
assert.equal(await page.evaluate(() => window.__log.services.length), 0);
console.log("ok - offline");

// 5. Italian, options, a name that is text
await page.evaluate(() => window.mount({ name: "<b>PC</b>", show_charts: false, show_storage: false, confirm_actions: false,
  disk_entities: ["sensor.demo_pc_disk_dev_nvme0n1p1"] }, window.makeHass("it")));
await settle();
assert.equal(await q("#name"), "<b>PC</b>");
assert.equal(await hidden("#charts"), true);
assert.equal(await hidden("#stor"), true);
assert.deepEqual(await all(".chip"), ["Riavvio richiesto per completare gli aggiornamenti",
  "Aggiornamenti di sistema disponibili", "LNXlink 2026.11.0 disponibile"]);
assert.deepEqual((await all(".cell")).slice(0, 3), ["78°C Temp. CPU", "1 Update", "72% <i>Lab</i>"]);
assert.equal(await q(".cell:nth-child(4)"), "18,3 Mbit/s Download");
assert.deepEqual(await all(".acts button"), ["Sospendi", "Riavvia", "Spegni"]);
assert.deepEqual(await page.evaluate(() => window.__log.ws), [], "no history without charts");
await click("#act_shutdown");
assert.deepEqual(await page.evaluate(() => window.__log.services), ["button.press:button.demo_pc_shutdown"],
  "no confirmation when disabled");
console.log("ok - Italian and options");

// 6. no LNXlink computer
await page.evaluate(() => { const h = window.makeHass("en"); h.devices = {}; h.entities = {}; window.mount({}, h); });
assert.equal(await q(".empty .t"), "No LNXlink computer found");
console.log("ok - empty state");

// 7. editor: labels and a clean configuration
const cfg = await page.evaluate(async () => {
  const ed = document.createElement("lnxlink-card-editor");
  let out = null;
  ed.addEventListener("config-changed", (ev) => { out = ev.detail.config; });
  document.getElementById("host").appendChild(ed);
  ed.setConfig({ type: "custom:lnxlink-card" });
  ed.hass = window.makeHass("it");
  await new Promise((r) => setTimeout(r, 50));
  const form = ed.querySelector("ha-form");
  const labels = [form.computeLabel({ name: "hours_to_show" }), form.computeLabel({ name: "disk_entities" })];
  const data = form.data;
  form.dispatchEvent(new CustomEvent("value-changed", { detail: { value: Object.assign({}, data, { hours_to_show: 6, name: "" }) } }));
  return { out, labels, device: data.device, cpu: data.cpu_entity, disks: data.disk_entities };
});
assert.deepEqual(cfg.labels, ["Storico dei grafici (ore)", "Dischi"]);
assert.equal(cfg.device, "demo");
assert.equal(cfg.cpu, "sensor.demo_pc_cpu_usage");
assert.deepEqual(cfg.disks, ["sensor.demo_pc_disk_dev_nvme0n1p2", "sensor.demo_pc_disk_dev_nvme0n1p1"]);
assert.deepEqual(cfg.out, { type: "custom:lnxlink-card", hours_to_show: 6 }, "discovered values are not saved");
console.log("ok - editor");

assert.deepEqual(errors, [], "no page errors");
await browser.close();
console.log("all end-to-end tests passed");
