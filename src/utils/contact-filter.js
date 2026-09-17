// First-layer defense against vendor/customer swapping off-platform contact
// details. This is deliberately NOT presented as foolproof — see the
// "soft" pattern below, which flags rather than blocks, because outright
// blocking on weak signals produces too many false positives (e.g. "call
// me satisfied with the refund").

const PHONE_REGEX = /(\+?\d[\d\-.\s]{7,}\d)/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PLATFORM_KEYWORDS = [
  "whatsapp", "telegram", "instagram", "insta", "snapchat", "wechat",
  "signal", "viber", "facebook messenger", "fb messenger"
];
const SOFT_PHRASES = [
  "call me", "text me", "my number", "contact me directly", "add me on",
  "dm me", "reach me at", "off the platform", "outside this app"
];

function checkMessage(text = "") {
  const lower = text.toLowerCase();

  const hasPhone = PHONE_REGEX.test(text);
  PHONE_REGEX.lastIndex = 0;
  const hasEmail = EMAIL_REGEX.test(text);
  EMAIL_REGEX.lastIndex = 0;
  const hasPlatform = PLATFORM_KEYWORDS.some((kw) => lower.includes(kw));

  if (hasPhone || hasEmail || hasPlatform) {
    return { blocked: true, flagged: false, reason: "contact_info_detected" };
  }

  const hasSoftSignal = SOFT_PHRASES.some((kw) => lower.includes(kw));
  if (hasSoftSignal) {
    return { blocked: false, flagged: true, reason: "possible_contact_sharing" };
  }

  return { blocked: false, flagged: false, reason: null };
}

module.exports = { checkMessage };