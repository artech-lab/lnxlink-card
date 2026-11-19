// Unit tests for the pure logic of the card. Run with: npm test
// The card file is loaded in a sandbox with minimal DOM stubs, then its
// top-level functions are exercised directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

process.env.TZ = "UTC";

const src = readFileSync(new URL("../dist/lnxlink-card.js", import.meta.url), "utf8");
const ctx = {
  console: { info() {}, warn() {}, log() {} },
  HTMLElement: class {},
  customElements: { get: () => undefined, define() {} },
  window: {},
  navigator: { language: "en-US" },
  document: {},
  Intl,
  setTimeout
};
vm.createContext(ctx);
vm.runInContext(
  src + "\n;globalThis.__api = { LNC_I18N, LNC_DEFAULTS, LNC_ENTITY_KEYS, lncLang, lncLocale, lncNumberLocale," +
  " lncT, lncEsc, lncFmt, lncTrunc, lncSlug, lncUptime, lncDevices, lncDiscover, lncResolve, lncSortDisks," +
  " lncDiskLabel, lncStatus, lncSeries, lncPath, lncEditorSchema, lncCleanConfig, lncInterfaceRank };",
  ctx
);
const api = ctx.__api;
const plain = (v) => JSON.parse(JSON.stringify(v));

/* A simulated instance: one LNXlink computer with the usual entities (some with
   an area prefix in the entity id, as happens after moving the device), a
   second computer, and an unrelated device. */
function instance() {
  const states = {}, entities = {};
  const devices = {
    pc1: { id: "pc1", name: "workstation", manufacturer: "LNXlink", model: "Ubuntu 24.04" },
    pc2: { id: "pc2", name: "server", manufacturer: "LNXlink", model: "Debian 13" },
    tv: { id: "tv", name: "TV", manufacturer: "Other" }
  };
  const add = (id, state, attrs, device) => {
    const dev = devices[device || "pc1"];
    states[id] = { state: state, attributes: Object.assign({ friendly_name: dev.name + " " + (attrs && attrs.n || "") }, attrs || {}) };
    delete states[id].attributes.n;
    entities[id] = { entity_id: id, device_id: dev.id, platform: "mqtt" };
  };
  add("binary_sensor.office_workstation_lwt", "on", { n: "LWT" });
  add("sensor.workstation_cpu_usage", "12.5", { n: "CPU Usage", unit_of_measurement: "%" });
  add("sensor.workstation_cpu_load_average", "8", { n: "CPU Load Average", unit_of_measurement: "%" });
  add("sensor.workstation_memory_usage", "41", { n: "Memory Usage", unit_of_measurement: "%" });
  add("sensor.workstation_memory_used", "6500", { n: "Memory Used", unit_of_measurement: "MB" });
  add("sensor.workstation_temperature_acpitz", "40", { n: "Temperature acpitz", unit_of_measurement: "°C", device_class: "temperature" });
  add("sensor.workstation_temperature_coretemp_core_0", "52", { n: "Temperature coretemp Core 0", unit_of_measurement: "°C", device_class: "temperature" });
  add("sensor.workstation_temperature_coretemp_package_id_0", "55", { n: "Temperature coretemp Package id 0", unit_of_measurement: "°C", device_class: "temperature" });
  add("sensor.workstation_disk_dev_sda2", "3", { n: "Disk dev_sda2", unit_of_measurement: "%", mountpoint: "/recovery", total: 4 });
  add("sensor.workstation_disk_dev_sda1", "8", { n: "Disk dev_sda1", unit_of_measurement: "%", mountpoint: "/boot/efi", total: 1 });
  add("sensor.workstation_disk_dev_sda3", "62", { n: "Disk dev_sda3", unit_of_measurement: "%", mountpoint: "/", total: 460 });
  add("sensor.workstation_disk_io_sda", "1", { n: "Disk IO sda", unit_of_measurement: "%" });
  add("sensor.workstation_interface_tailscale0", "100.64.0.1", { n: "Interface tailscale0" });
  add("sensor.workstation_interface_wlp2s0", "192.168.1.20", { n: "Interface wlp2s0" });
  add("sensor.workstation_wifi", "78", { n: "WiFi", unit_of_measurement: "%", SSID: "HomeNet" });
  add("sensor.workstation_network_download", "12.4", { n: "Network Download", unit_of_measurement: "Mbit/s" });
  add("sensor.workstation_network_upload", "1.2", { n: "Network Upload", unit_of_measurement: "Mbit/s" });
  add("sensor.office_workstation_current_users", "alex", { n: "Current Users" });
  add("sensor.office_workstation_boot_time", "2026-03-10T05:00:00+00:00", { n: "Boot Time", device_class: "timestamp" });
  add("sensor.workstation_system_updates_count", "4", { n: "System Updates Count" });
  add("binary_sensor.workstation_system_updates", "on", { n: "System Updates" });
  add("binary_sensor.workstation_required_restart", "off", { n: "Required Restart" });
  add("update.workstation_update", "off", { n: "Update" });
  add("button.workstation_suspend", "unknown", { n: "Suspend" });
  add("button.workstation_restart", "unknown", { n: "Restart" });
  add("button.workstation_shutdown", "unknown", { n: "Shutdown" });
  add("sensor.server_cpu_usage", "3", { n: "CPU Usage", unit_of_measurement: "%" }, "pc2");
  add("sensor.tv_cpu_usage", "3", { n: "CPU Usage", unit_of_measurement: "%" }, "tv");
  return { states, entities, devices };
}

test("the card registers itself in the card picker", () => {
  assert.equal(ctx.window.customCards.length, 1);
  assert.equal(ctx.window.customCards[0].type, "lnxlink-card");
  assert.equal(ctx.window.customCards[0].preview, true);
});

test("source file is plain ASCII", () => {
  assert.ok(/^[\x00-\x7F]*$/.test(src));
});

test("every language has exactly the keys of the English dictionary", () => {
  const en = Object.keys(api.LNC_I18N.en).sort();
  assert.ok(Object.keys(api.LNC_I18N).includes("it"));
  for (const lang of Object.keys(api.LNC_I18N)) {
    assert.deepEqual(Object.keys(api.LNC_I18N[lang]).sort(), en, "keys of '" + lang + "' differ from 'en'");
    for (const k of en) {
      const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
      assert.equal(ph(api.LNC_I18N[lang][k]), ph(api.LNC_I18N.en[k]), "placeholders of '" + lang + "." + k + "'");
    }
  }
});

test("every editor field has a label and every entity key an option", () => {
  const names = [];
  const walk = (list) => list.forEach((s) => (s.schema ? walk(s.schema) : names.push(s.name)));
  walk(api.lncEditorSchema("en"));
  for (const lang of Object.keys(api.LNC_I18N)) {
    for (const n of names) assert.ok(api.LNC_I18N[lang]["ed_" + n], lang + ": ed_" + n);
  }
  for (const key of api.LNC_ENTITY_KEYS) assert.ok(names.includes(key + "_entity"), key);
  assert.ok(names.includes("disk_entities"));
  for (const key of Object.keys(api.LNC_DEFAULTS)) assert.ok(names.includes(key), key);
});

test("language and number format follow Home Assistant", () => {
  assert.equal(api.lncLang({ locale: { language: "it" } }), "it");
  assert.equal(api.lncLang({ locale: { language: "it-IT" } }), "it");
  assert.equal(api.lncLang({ language: "it_CH" }), "it");
  assert.equal(api.lncLang({ locale: { language: "de" } }), "en");
  assert.equal(api.lncLang(null), "en");
  assert.equal(api.lncLocale({ language: "it_CH" }), "it-CH");
  assert.equal(api.lncFmt({ locale: { language: "it" } }, 12.345, 1), "12,3");
  assert.equal(api.lncFmt({ locale: { language: "it", number_format: "comma_decimal" } }, 1234.5, 1), "1,234.5");
  assert.equal(api.lncFmt({ locale: { language: "en", number_format: "none" } }, 1234, 0), "1234");
});

test("translation, escaping and truncation", () => {
  assert.equal(api.lncT("it", "alert_lnxlink", { version: "2026.1" }), "LNXlink 2026.1 disponibile");
  assert.equal(api.lncT("xx", "storage"), "Storage");
  assert.equal(api.lncT("it", "no_such_key"), "no_such_key");
  assert.equal(api.lncEsc('<b a="1">&\''), "&lt;b a=&quot;1&quot;&gt;&amp;&#39;");
  assert.equal(api.lncTrunc("abcdefgh", 5), "abcd…");
  assert.equal(api.lncSlug(" Temperature coretemp Package id 0 "), "temperature_coretemp_package_id_0");
});

test("uptime", () => {
  const now = Date.UTC(2026, 2, 10, 8, 12);
  assert.equal(api.lncUptime("en", "2026-03-10T08:05:00+00:00", now), "7 min");
  assert.equal(api.lncUptime("en", "2026-03-10T05:00:00+00:00", now), "3 h 12 min");
  assert.equal(api.lncUptime("it", "2026-03-08T05:00:00+00:00", now), "2 g 3 h");
  assert.equal(api.lncUptime("en", "not a date", now), null);
});

test("only LNXlink devices, sorted by name", () => {
  const h = instance();
  assert.deepEqual(plain(api.lncDevices(h).map((d) => d.id)), ["pc2", "pc1"]);
});

test("discovery finds every entity of the computer", () => {
  const h = instance();
  const f = api.lncDiscover(h, h.devices.pc1);
  assert.deepEqual(plain(f.entities), {
    status: "binary_sensor.office_workstation_lwt",
    cpu: "sensor.workstation_cpu_usage",
    memory: "sensor.workstation_memory_usage",
    temperature: "sensor.workstation_temperature_coretemp_package_id_0",
    wifi: "sensor.workstation_wifi",
    download: "sensor.workstation_network_download",
    upload: "sensor.workstation_network_upload",
    users: "sensor.office_workstation_current_users",
    ip: "sensor.workstation_interface_wlp2s0",
    uptime: "sensor.office_workstation_boot_time",
    updates_count: "sensor.workstation_system_updates_count",
    system_updates: "binary_sensor.workstation_system_updates",
    restart_required: "binary_sensor.workstation_required_restart",
    update: "update.workstation_update",
    suspend: "button.workstation_suspend",
    restart: "button.workstation_restart",
    shutdown: "button.workstation_shutdown"
  });
  assert.deepEqual(plain(f.disks).sort(), ["sensor.workstation_disk_dev_sda1", "sensor.workstation_disk_dev_sda2",
    "sensor.workstation_disk_dev_sda3"]);
  assert.deepEqual(plain(api.lncSortDisks(h, f.disks)), ["sensor.workstation_disk_dev_sda3",
    "sensor.workstation_disk_dev_sda1", "sensor.workstation_disk_dev_sda2"], "root partition first");
});

test("discovery works with renamed entity ids through the friendly name", () => {
  const h = instance();
  const st = h.states["sensor.workstation_cpu_usage"];
  delete h.states["sensor.workstation_cpu_usage"];
  delete h.entities["sensor.workstation_cpu_usage"];
  h.states["sensor.my_processor"] = st;
  h.entities["sensor.my_processor"] = { entity_id: "sensor.my_processor", device_id: "pc1", platform: "mqtt" };
  assert.equal(api.lncDiscover(h, h.devices.pc1).entities.cpu, "sensor.my_processor");
});

test("the main network interface is preferred over virtual ones", () => {
  assert.ok(api.lncInterfaceRank("wlp2s0") < api.lncInterfaceRank("enp7s0"));
  assert.ok(api.lncInterfaceRank("enp7s0") < api.lncInterfaceRank("tailscale0"));
  assert.ok(api.lncInterfaceRank("docker0") > api.lncInterfaceRank("usb0"));
});

test("resolution: configuration first, then the chosen device, then the first one", () => {
  const h = instance();
  let r = api.lncResolve({}, h);
  assert.equal(r.device.id, "pc2", "first LNXlink device by name");
  assert.equal(r.name, "server");
  assert.equal(r.subtitle, "Debian 13");
  r = api.lncResolve({ device: "pc1", name: "Lab PC", subtitle: "Laptop", disk_entities: ["sensor.workstation_disk_dev_sda1"] }, h);
  assert.equal(r.device.id, "pc1");
  assert.equal(r.name, "Lab PC");
  assert.equal(r.subtitle, "Laptop");
  assert.deepEqual(plain(r.disks), ["sensor.workstation_disk_dev_sda1"]);
  assert.equal(r.ownDisks, true);
  r = api.lncResolve({ cpu_entity: "sensor.workstation_cpu_usage" }, h);
  assert.equal(r.device.id, "pc1", "the device of a configured entity");
  r = api.lncResolve({ cpu_entity: "sensor.other_cpu" }, { states: {}, entities: {}, devices: {} });
  assert.equal(r.device, null);
  assert.equal(r.entities.cpu, "sensor.other_cpu");
  assert.equal(r.name, "LNXlink");
});

test("disk labels", () => {
  const h = instance();
  assert.equal(api.lncDiskLabel(h, "sensor.workstation_disk_dev_sda3"), "/");
  h.states["sensor.workstation_disk_dev_sda3"].attributes = {};
  assert.equal(api.lncDiskLabel(h, "sensor.workstation_disk_dev_sda3"), "sda3");
});

test("status from the LWT sensor, or from the CPU sensor without it", () => {
  const h = instance();
  const e = api.lncResolve({ device: "pc1" }, h).entities;
  assert.equal(api.lncStatus(h, e), "on");
  h.states[e.status].state = "off";
  assert.equal(api.lncStatus(h, e), "off");
  h.states[e.status].state = "unavailable";
  assert.equal(api.lncStatus(h, e), "unavailable");
  assert.equal(api.lncStatus(h, { cpu: e.cpu }), "on");
  h.states[e.cpu].state = "unavailable";
  assert.equal(api.lncStatus(h, { cpu: e.cpu }), "off");
  assert.equal(api.lncStatus(h, {}), "unavailable");
});

test("history series and chart path", () => {
  const t0 = Date.UTC(2026, 2, 10, 8, 0);
  const res = { "sensor.cpu": [{ s: "10", lu: t0 / 1000 }, { s: "unavailable", lu: t0 / 1000 + 60 },
    { s: "30", lu: t0 / 1000 + 120 }], "sensor.x": [{ state: "5", last_updated: new Date(t0).toISOString() }] };
  assert.deepEqual(plain(api.lncSeries(res, "sensor.cpu")), [[t0, 10], [t0 + 120000, 30]]);
  assert.deepEqual(plain(api.lncSeries(res, "sensor.x")), [[t0, 5]]);
  assert.deepEqual(plain(api.lncSeries(res, "sensor.none")), []);
  const d = api.lncPath([[t0, 10], [t0 + 120000, 30]], t0, t0 + 240000);
  assert.equal(d, "M0.0 38.0 L50.0 2.0 L100 2.0");
  assert.equal(api.lncPath([], t0, t0 + 1), "");
});

test("the editor keeps the configuration minimal", () => {
  const h = instance();
  const out = api.lncCleanConfig({
    type: "custom:lnxlink-card", device: "pc2", name: "", hours_to_show: 3, show_charts: true, show_actions: false,
    cpu_entity: "sensor.server_cpu_usage", memory_entity: "sensor.workstation_memory_usage", disk_entities: []
  }, {}, h);
  assert.deepEqual(plain(out), { type: "custom:lnxlink-card", show_actions: false, memory_entity: "sensor.workstation_memory_usage" });
  const kept = api.lncCleanConfig({ device: "pc2", cpu_entity: "sensor.server_cpu_usage" },
    { device: "pc2", cpu_entity: "sensor.server_cpu_usage" }, h);
  assert.equal(kept.device, "pc2", "an explicit choice is kept");
  assert.equal(kept.cpu_entity, "sensor.server_cpu_usage");
  const other = api.lncCleanConfig({ device: "pc1", cpu_entity: "sensor.workstation_cpu_usage",
    disk_entities: ["sensor.workstation_disk_dev_sda3", "sensor.workstation_disk_dev_sda1", "sensor.workstation_disk_dev_sda2"] }, {}, h);
  assert.deepEqual(plain(other), { device: "pc1", type: "custom:lnxlink-card" });
});
