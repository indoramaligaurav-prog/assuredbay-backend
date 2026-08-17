const { getDisplayPrice } = require('../utils/priceEngine');

module.exports = function priceHydrator(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = async function (data) {

    async function hydrate(obj) {
      if (Array.isArray(obj)) return Promise.all(obj.map(hydrate));

      if (obj?.price && obj?.vendor) {
        obj.displayPrice = await getDisplayPrice({
          product: obj,
          buyerId: req.user?._id
        });
      }

      if (obj && typeof obj === 'object') {
        for (const k in obj) obj[k] = await hydrate(obj[k]);
      }
      return obj;
    }

    const hydrated = await hydrate(data);
    return originalJson(hydrated);
  };

  next();
};
