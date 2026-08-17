const User = require("../models/User");
const Shop = require("../models/Shop");

const generateUsername = async ({
  firstName = "",
  lastName = "",
  shopName = "",
  type = "user",
}) => {

  const clean = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "");

  let base = "";

  // USER
  if (type === "user") {
    base = clean(`${firstName}${lastName}`);
  }

  // SHOP
  if (type === "shop") {
    base = clean(shopName);
  }

  if (!base) {
    base = "user";
  }

  // CHECK MODEL
  const Model = type === "shop" ? Shop : User;

  /*
    FIRST PRIORITY
    base + 4 digits
  */
  for (let i = 0; i < 5; i++) {

    const random4 =
      Math.floor(1000 + Math.random() * 9000);

    const username = `${base}${random4}`;

    const exists =
      await Model.findOne({ username });

    if (!exists) {
      return username;
    }
  }

  /*
    INSTAGRAM STYLE FALLBACK
  */
  const separators = ["", "_", "."];

  while (true) {

    const separator =
      separators[Math.floor(Math.random() * separators.length)];

    const extraDigits =
      Math.floor(1000 + Math.random() * 999999);

    const username =
      `${base}${separator}${extraDigits}`;

    const exists =
      await Model.findOne({ username });

    if (!exists) {
      return username;
    }
  }
};

module.exports = generateUsername;