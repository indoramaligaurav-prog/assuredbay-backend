module.exports = {

  PAN: {
    type: "identity",
    regex: /[A-Z]{5}[0-9]{4}[A-Z]/,
    keywords: ["INCOME TAX", "PERMANENT ACCOUNT NUMBER"]
  },

  AADHAR: {
    type: "identity",
    regex: /\d{4}\s?\d{4}\s?\d{4}/,
    keywords: ["AADHAAR", "UIDAI"]
  },

  PASSPORT: {
    type: "identity",
    regex: /[A-Z0-9]{6,9}/,
    keywords: ["PASSPORT", "NATIONALITY"]
  },

  EMIRATES_ID: {
    type: "identity",
    regex: /\d{3}-\d{4}-\d{7}-\d/,
    keywords: ["EMIRATES", "IDENTITY"]
  },

  SSN: {
    type: "identity",
    regex: /\d{3}-\d{2}-\d{4}/,
    keywords: ["SOCIAL SECURITY"]
  },

  UTILITY_BILL: {
    type: "address",
    regex: null,
    keywords: ["BILL", "ELECTRICITY", "WATER", "GAS"]
  },

  BANK_STATEMENT: {
    type: "address",
    regex: null,
    keywords: ["ACCOUNT", "BALANCE", "STATEMENT"]
  },

  BUSINESS_REGISTRATION: {
    type: "business",
    regex: null,
    keywords: ["CERTIFICATE", "REGISTRATION"]
  },

  TRADE_LICENSE: {
    type: "business",
    regex: null,
    keywords: ["TRADE LICENSE"]
  },

};