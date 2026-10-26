// Общие правила замены и настройки по умолчанию (используются content-скриптом и popup).
var UZ_APOSTROPHES = ["'", "‘", "’", "ʻ", "ʼ", "`"]; // ' ‘ ’ ʻ ʼ `

var UZ_RULES = [
  { id: "o", from: "oʻ", base: "o", triggers: UZ_APOSTROPHES, lower: "ö", upper: "Ö" },
  { id: "g", from: "gʻ", base: "g", triggers: UZ_APOSTROPHES, lower: "ğ", upper: "Ğ" },
  { id: "sh", from: "sh", base: "s", triggers: ["h", "H"], lower: "ş", upper: "Ş" },
  { id: "ch", from: "ch", base: "c", triggers: ["h", "H"], lower: "ç", upper: "Ç" }
];

var UZ_DEFAULTS = {
  enabled: true,
  disabledSites: [],
  rules: { o: true, g: true, sh: true, ch: true }
};
