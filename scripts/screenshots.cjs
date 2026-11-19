// Regenerates the README images with fictional demo data (no real computer).
// A simulated LNXlink computer with three hours of CPU and RAM history.
// Needs the dev dependencies:  npm install && npx playwright install chromium
// Run with:  npm run screenshots   (CHROME_PATH=/path/to/chrome to use another browser)
const { chromium } = require("playwright");
const mdi = require("@mdi/js");
const path = require("path");
const fs = require("fs");
const ROOT = path.join(__dirname, "..");
const CARD = path.join(ROOT, "dist", "lnxlink-card.js");
const OUT = path.join(ROOT, "images");
const ORIGIN = "http://ha.local";

const icons = {
  "mdi:laptop": mdi.mdiLaptop, "mdi:laptop-off": mdi.mdiLaptopOff, "mdi:lan-disconnect": mdi.mdiLanDisconnect,
  "mdi:restart-alert": mdi.mdiRestartAlert, "mdi:package-up": mdi.mdiPackageUp, "mdi:update": mdi.mdiUpdate,
  "mdi:thermometer": mdi.mdiThermometer, "mdi:wifi": mdi.mdiWifi, "mdi:wifi-off": mdi.mdiWifiOff,
  "mdi:arrow-down-bold": mdi.mdiArrowDownBold, "mdi:arrow-up-bold": mdi.mdiArrowUpBold, "mdi:account": mdi.mdiAccount,
  "mdi:timer-outline": mdi.mdiTimerOutline, "mdi:sleep": mdi.mdiSleep, "mdi:restart": mdi.mdiRestart,
  "mdi:power": mdi.mdiPower, "mdi:alert": mdi.mdiAlert
};

const THEMES = {
  dark: "--primary-color:#03a9f4;--primary-text-color:#e1e1e1;--secondary-text-color:#9b9b9b;--card-background-color:#1c1c1c;--divider-color:rgba(225,225,225,.12);--rgb-primary-text-color:225,225,225;background:#111111;",
  light: "--primary-color:#03a9f4;--primary-text-color:#212121;--secondary-text-color:#727272;--card-background-color:#ffffff;--divider-color:rgba(0,0,0,.12);--rgb-primary-text-color:33,33,33;background:#fafafa;"
};
const html = (theme) => `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:20px;font-family:Inter,Roboto,"DejaVu Sans",sans-serif;-webkit-font-smoothing:antialiased;${THEMES[theme]}}
#host{width:430px}</style></head><body><div id="host"></div><script>
const ICONS = ${JSON.stringify(icons)};
customElements.define("ha-card", class extends HTMLElement { constructor(){ super(); this.attachShadow({mode:"open"}).innerHTML =
 '<style>:host{display:block;background:var(--card-background-color);border-radius:12px;border:1px solid var(--divider-color);color:var(--primary-text-color);box-sizing:border-box;overflow:hidden}</style><slot></slot>'; } });
customElements.define("ha-icon", class extends HTMLElement {
  static get observedAttributes(){ return ["icon"]; }
  connectedCallback(){ this.render(); } attributeChangedCallback(){ this.render(); }
  render(){ if(!this.shadowRoot) this.attachShadow({mode:"open"}); const p = ICONS[this.getAttribute("icon")] || "";
    this.shadowRoot.innerHTML = '<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24"><path d="'+p+'"/></svg>'; }
});
</script></body></html>`;

/* fictional computer: device registry, entities, states and recorder history */
function demo(lang, now) {
  let seed = 11;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const device = { id: "demo_pc", name: "workstation", manufacturer: "LNXlink", model: "Ubuntu 24.04 LTS" };
  const states = {}, entities = {};
  const add = (id, state, attrs) => {
    states[id] = { state: String(state), attributes: attrs || {} };
    entities[id] = { entity_id: id, device_id: device.id, platform: "mqtt" };
  };
  add("binary_sensor.workstation_lwt", "on");
  add("sensor.workstation_cpu_usage", "27.6", { unit_of_measurement: "%" });
  add("sensor.workstation_memory_usage", "58.3", { unit_of_measurement: "%" });
  add("sensor.workstation_temperature_coretemp_package_id_0", "61", { unit_of_measurement: "°C", device_class: "temperature" });
  add("sensor.workstation_disk_dev_nvme0n1p2", "83", { unit_of_measurement: "%", mountpoint: "/", total: 476 });
  add("sensor.workstation_disk_dev_nvme0n1p1", "7", { unit_of_measurement: "%", mountpoint: "/boot/efi", total: 1 });
  add("sensor.workstation_disk_dev_sda1", "41", { unit_of_measurement: "%", mountpoint: "/data", total: 932 });
  add("sensor.workstation_wifi", "74", { unit_of_measurement: "%", SSID: "Demo-WiFi" });
  add("sensor.workstation_network_download", "42.7", { unit_of_measurement: "Mbit/s" });
  add("sensor.workstation_network_upload", "6.35", { unit_of_measurement: "Mbit/s" });
  add("sensor.workstation_interface_wlp2s0", "192.168.1.42");
  add("sensor.workstation_current_users", "demo");
  add("sensor.workstation_boot_time", new Date(now - (2 * 1440 + 5 * 60 + 18) * 60000).toISOString(), { device_class: "timestamp" });
  add("sensor.workstation_system_updates_count", "12");
  add("binary_sensor.workstation_system_updates", "on");
  add("binary_sensor.workstation_required_restart", "on");
  add("update.workstation_update", "off");
  add("button.workstation_suspend", "unknown");
  add("button.workstation_restart", "unknown");
  add("button.workstation_shutdown", "unknown");
  const cpu = [], ram = [];
  let c = 12, m = 51;
  for (let i = 180; i >= 0; i -= 2) {
    const t = (now - i * 60000) / 1000;
    const burst = (i < 120 && i > 95) || (i < 40 && i > 28) ? 35 : 0;
    c = Math.max(2, Math.min(96, c * 0.55 + (8 + burst + rand() * 18) * 0.45));
    m = Math.max(30, Math.min(90, m + (i < 110 && i > 90 ? 0.6 : (rand() - 0.52) * 0.9)));
    cpu.push({ s: c.toFixed(1), lu: t });
    ram.push({ s: m.toFixed(1), lu: t });
  }
  cpu.push({ s: "27.6", lu: now / 1000 });
  ram.push({ s: "58.3", lu: now / 1000 });
  return {
    hass: { language: lang, locale: { language: lang }, states, entities, devices: { [device.id]: device } },
    history: { "sensor.workstation_cpu_usage": cpu, "sensor.workstation_memory_usage": ram }
  };
}

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const shot = async (file, theme, lang, config) => {
    const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 470, height: 1200 } });
    page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
    await page.route(ORIGIN + "/**", (route) => route.fulfill({ contentType: "text/html", body: html(theme) }));
    await page.goto(ORIGIN + "/");
    await page.addScriptTag({ path: CARD });
    await page.evaluate(([d, cfg]) => {
      d.hass.callWS = async () => d.history;
      d.hass.callService = () => {};
      const card = document.createElement("lnxlink-card");
      card.setConfig(Object.assign({ type: "custom:lnxlink-card" }, cfg));
      document.getElementById("host").appendChild(card);
      card.hass = d.hass;
      window.card = card;
    }, [demo(lang, Date.now()), config || {}]);
    await page.waitForFunction(() => window.card.shadowRoot.querySelector("#ch_cpu path"));
    await page.waitForTimeout(800);
    await page.locator("#host").screenshot({ path: file });
    await page.close();
    console.log("wrote", path.relative(ROOT, file));
  };
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "lnc-shots-"));
  await shot(path.join(tmp, "dark-en.png"), "dark", "en", { name: "Workstation" });
  await shot(path.join(OUT, "light-it.png"), "light", "it", { name: "Workstation" });

  /* composite preview: English dark on the left, Italian light on the right */
  const fig = (file, caption) => `<figure><img src="data:image/png;base64,${fs.readFileSync(file).toString("base64")}"><figcaption>${caption}</figcaption></figure>`;
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1100, height: 1400 } });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;font-family:Inter,Roboto,"DejaVu Sans",sans-serif;-webkit-font-smoothing:antialiased}
    #c{display:inline-flex;gap:28px;align-items:flex-start;padding:30px 32px 26px;background:#111111;}
    figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:10px}
    img{width:470px;display:block}
    figcaption{color:#9b9b9b;font-size:15px;letter-spacing:.2px}
  </style></head><body><div id="c">
    ${fig(path.join(tmp, "dark-en.png"), "English, dark theme")}
    ${fig(path.join(OUT, "light-it.png"), "Italian, light theme")}
  </div></body></html>`);
  await page.waitForTimeout(300);
  await page.locator("#c").screenshot({ path: path.join(OUT, "preview.png") });
  await page.close();
  console.log("wrote images/preview.png");
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
})();
