const OrderItem = require("../models/OrderItem");
const Order = require("../models/Order");
const Product = require("../models/Product");

const idOf = (v) => v?._id || v || null;

async function attachTicketContext(ticket) {
  if (!ticket) return ticket;
  const t = ticket.toObject ? ticket.toObject() : { ...ticket };

  const itemId = idOf(t.relatedOrderItem);
  const item = itemId
    ? await OrderItem.findById(itemId).select("orderNo productId productName imageUrl").lean()
    : null;

  const productId = idOf(t.relatedProduct) || item?.productId;
  const product = productId ? await Product.findById(productId).select("name slug images").lean() : null;

  let orderNo = item?.orderNo || null;
  if (!orderNo && t.relatedOrder) {
    const order = await Order.findById(idOf(t.relatedOrder)).select("orderNo").lean();
    orderNo = order?.orderNo || null;
  }

  const name = product?.name || item?.productName;
  t.context = {
    orderNo,
    product: name
      ? {
          name,
          slug: product?.slug || null,
          image: item?.imageUrl || product?.images?.[0]?.url || null
        }
      : null
  };
  return t;
}

module.exports = { attachTicketContext };