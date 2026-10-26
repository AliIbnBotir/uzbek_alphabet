importScripts("rules.js");

function updateBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? "" : "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: "#888" });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(UZ_DEFAULTS, (s) => updateBadge(s.enabled));
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(UZ_DEFAULTS, (s) => updateBadge(s.enabled));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) updateBadge(changes.enabled.newValue);
});

// Горячая клавиша Alt+Shift+U — быстро включить/выключить замену.
chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-conversion") return;
  chrome.storage.sync.get(UZ_DEFAULTS, (s) => chrome.storage.sync.set({ enabled: !s.enabled }));
});
