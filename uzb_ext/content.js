(() => {
  let settings = structuredClone(UZ_DEFAULTS);
  // Последняя замена — чтобы Backspace сразу после неё вернул исходные символы ("sh" вместо "ş").
  let lastConversion = null;

  const host = location.hostname;

  function isActive() {
    return settings.enabled && !settings.disabledSites.includes(host);
  }

  chrome.storage.sync.get(UZ_DEFAULTS, (stored) => {
    settings = { ...UZ_DEFAULTS, ...stored, rules: { ...UZ_DEFAULTS.rules, ...stored.rules } };
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      settings[key] = key === "rules" ? { ...UZ_DEFAULTS.rules, ...newValue } : newValue;
    }
  });

  const TEXT_INPUT_TYPES = new Set(["text", "search", "url", "tel", ""]);

  function isTextField(el) {
    if (el instanceof HTMLTextAreaElement) return true;
    if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type);
    return false;
  }

  function getEditable(e) {
    const target = e.composedPath()[0];
    if (!(target instanceof Element)) return null;
    if (isTextField(target)) return target;
    if (target.isContentEditable) return target;
    return null;
  }

  // Символ непосредственно перед кареткой (только при свёрнутом выделении).
  function charBeforeCaret(el) {
    if (isTextField(el)) {
      const { selectionStart: start, selectionEnd: end } = el;
      if (start === null || start !== end || start === 0) return null;
      return el.value[start - 1];
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
    const { startContainer: node, startOffset: offset } = sel.getRangeAt(0);
    if (node.nodeType === Node.TEXT_NODE) {
      return offset > 0 ? node.data[offset - 1] : null;
    }
    // Каретка между узлами — берём текст от начала редактора до каретки.
    const range = sel.getRangeAt(0).cloneRange();
    range.setStart(el, 0);
    const text = range.toString();
    return text ? text[text.length - 1] : null;
  }

  // Заменяет `count` символов перед кареткой на `text`.
  // execCommand сохраняет историю Ctrl+Z и корректно работает с React/Gmail/и т.п.
  function replaceBeforeCaret(el, count, text) {
    if (isTextField(el)) {
      const pos = el.selectionStart;
      el.setSelectionRange(pos - count, pos);
      if (!document.execCommand("insertText", false, text)) {
        el.setRangeText(text, pos - count, pos, "end");
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      }
      return;
    }
    const sel = window.getSelection();
    for (let i = 0; i < count; i++) sel.modify("extend", "backward", "character");
    document.execCommand("insertText", false, text);
  }

  function findRule(prev, typed) {
    const base = prev.toLowerCase();
    return UZ_RULES.find(
      (r) => settings.rules[r.id] && r.base === base && r.triggers.includes(typed)
    );
  }

  function onBeforeInput(e) {
    if (e.isComposing || !isActive()) return;
    const el = getEditable(e);
    if (!el) return;

    if (e.inputType === "deleteContentBackward" && lastConversion && lastConversion.el === el) {
      const conv = lastConversion;
      lastConversion = null;
      if (charBeforeCaret(el) === conv.result) {
        e.preventDefault();
        replaceBeforeCaret(el, 1, conv.original);
      }
      return;
    }

    if (e.inputType !== "insertText" || !e.data || e.data.length !== 1) {
      lastConversion = null;
      return;
    }

    const prev = charBeforeCaret(el);
    const rule = prev && findRule(prev, e.data);
    if (!rule) {
      lastConversion = null;
      return;
    }

    const result = prev === prev.toUpperCase() ? rule.upper : rule.lower;
    e.preventDefault();
    replaceBeforeCaret(el, 1, result);
    lastConversion = { el, result, original: prev + e.data };
  }

  window.addEventListener("beforeinput", onBeforeInput, true);

  // Любое перемещение каретки отменяет возможность «отката» через Backspace.
  const NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);
  window.addEventListener("keydown", (e) => { if (NAV_KEYS.has(e.key)) lastConversion = null; }, true);
  window.addEventListener("mousedown", () => { lastConversion = null; }, true);
})();
