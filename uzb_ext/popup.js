const $enabled = document.getElementById("enabled");
const $status = document.getElementById("status");
const $statusText = document.getElementById("statusText");
const $main = document.getElementById("main");
const $favicon = document.getElementById("favicon");
const $siteHost = document.getElementById("siteHost");
const $siteHint = document.getElementById("siteHint");
const $siteEnabled = document.getElementById("siteEnabled");
const $rules = document.getElementById("rules");
const $shortcut = document.getElementById("shortcut");

let settings = structuredClone(UZ_DEFAULTS);
let host = "";
let supported = false;

// Страницы, на которых Chrome не запускает content-скрипты расширений.
const BLOCKED_HOSTS = ["chromewebstore.google.com", "chrome.google.com"];

function save(patch) {
  Object.assign(settings, patch);
  chrome.storage.sync.set(patch);
  render();
}

function render() {
  const siteOn = !settings.disabledSites.includes(host);

  $enabled.checked = settings.enabled;
  $main.classList.toggle("is-off", !settings.enabled);

  if (!settings.enabled) {
    $status.dataset.state = "off";
    $statusText.textContent = "O'chirilgan";
  } else if (supported && !siteOn) {
    $status.dataset.state = "site-off";
    $statusText.textContent = "Bu saytda o'chirilgan";
  } else {
    $status.dataset.state = "on";
    $statusText.textContent = "Yoqilgan";
  }

  $siteEnabled.hidden = !supported;
  $siteEnabled.checked = siteOn;
  $siteHint.textContent = supported
    ? (siteOn ? "Shu saytda ishlaydi" : "Shu saytda o'chirilgan")
    : "Bu sahifada kengaytmalar ishlamaydi";

  for (const btn of $rules.children) {
    btn.setAttribute("aria-pressed", String(settings.rules[btn.dataset.id]));
  }
}

function buildRules() {
  for (const rule of UZ_RULES) {
    const btn = document.createElement("button");
    btn.className = "rule";
    btn.dataset.id = rule.id;
    btn.title = `${rule.from} → ${rule.lower}`;

    const to = document.createElement("span");
    to.className = "rule-to";
    to.textContent = rule.lower;
    const from = document.createElement("span");
    from.className = "rule-from";
    from.textContent = rule.from;

    btn.append(to, from);
    btn.addEventListener("click", () => {
      save({ rules: { ...settings.rules, [rule.id]: !settings.rules[rule.id] } });
    });
    $rules.append(btn);
  }
}

function loadTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    let url = null;
    try {
      url = new URL(tab.url);
    } catch {}

    host = url ? url.hostname : "";
    supported = !!url && /^(https?|file):$/.test(url.protocol) && !BLOCKED_HOSTS.includes(host);

    $siteHost.textContent = url?.protocol === "file:" ? "Mahalliy fayl" : host || "—";
    $favicon.hidden = !tab.favIconUrl;
    if (tab.favIconUrl) $favicon.src = tab.favIconUrl;
    render();
  });
}

function loadShortcut() {
  chrome.commands.getAll((commands) => {
    const cmd = commands.find((c) => c.name === "toggle-conversion");
    $shortcut.textContent = cmd?.shortcut || "o'rnatilmagan";
  });
}

chrome.storage.sync.get(UZ_DEFAULTS, (stored) => {
  settings = { ...UZ_DEFAULTS, ...stored, rules: { ...UZ_DEFAULTS.rules, ...stored.rules } };
  buildRules();
  render();
  loadTab();
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("preload")));
});
loadShortcut();

document.getElementById("version").textContent = "v" + chrome.runtime.getManifest().version;

$enabled.addEventListener("change", () => save({ enabled: $enabled.checked }));

$siteEnabled.addEventListener("change", () => {
  const sites = settings.disabledSites.filter((s) => s !== host);
  if (!$siteEnabled.checked) sites.push(host);
  save({ disabledSites: sites });
});

document.getElementById("editShortcut").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
