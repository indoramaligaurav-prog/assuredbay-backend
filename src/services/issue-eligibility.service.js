const { ISSUE_TAXONOMY } = require("../constants/issue-taxonomy");
const ProductConditionMaster = require("../models/ProductConditionMaster");

// Adjust these model names if yours differ (checked against your DB dump —
// collections were `products`, `orders`, `orderitems`, `users`, so the
// Mongoose model names are almost certainly these, but confirm).
const Product = require("../models/Product");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const User = require("../models/User");

const REPORT_WINDOW_DAYS = 7;

/**
 * Given an orderItemId + the requesting buyer, returns the buyer issue
 * taxonomy annotated with this specific order/product's actual return
 * policy — instead of a fixed list. Nothing is hard-blocked (legal buyer
 * rights can override marketplace return policy per the client's own
 * governance notes), but each reason carries real context so the picker
 * reflects the product instead of a static dropdown.
 */
async function getIssueEligibility({ orderItemId, buyerId }) {
  const orderItem = await OrderItem.findById(orderItemId);
  if (!orderItem) {
    const err = new Error("Order item not found");
    err.status = 404;
    throw err;
  }

  const [order, product, buyer] = await Promise.all([
    Order.findById(orderItem.orderId),
    Product.findById(orderItem.productId),
    User.findById(buyerId)
  ]);

  if (!order) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  if (order.user?._id?.toString() !== buyerId.toString() && order.user?.toString() !== buyerId.toString()) {
    const err = new Error("Not authorized");
    err.status = 403;
    throw err;
  }

  // "delivered date" doesn't exist in the schema yet — using order creation
  // as an advisory reference point only (see note to client). Swap this for
  // a real delivery timestamp the moment one exists (courier webhook, etc.)
  const referenceDate = order.createdAt;
  const daysSince = referenceDate ? Math.floor((Date.now() - new Date(referenceDate).getTime()) / 86400000) : null;
  const withinAdvisoryWindow = daysSince === null ? true : daysSince <= REPORT_WINDOW_DAYS;

  const isInternational = Boolean(
    buyer?.country && product?.itemLocation?.country && buyer.country !== product.itemLocation.country
  );

  const returnPolicy = isInternational ? product?.internationalReturns : product?.domesticReturns;

  // Product.condition is a required editorial field, so no "show everything"
  // fallback is needed here — if it's ever missing on a legacy/bad row, we
  // deliberately show nothing rather than exposing condition-inappropriate
  // reasons (see [].includes(null) === false below, for every entry).
  const productCondition = product?.condition ? product.condition.toUpperCase() : null;
  const conditionMaster = productCondition
    ? await ProductConditionMaster.findOne({ code: productCondition, active: true }).lean()
    : null;

    console.log('DEBUG productCondition:', JSON.stringify(productCondition));
console.log('DEBUG first reason conditions:', JSON.stringify(ISSUE_TAXONOMY[0].conditions));
console.log('DEBUG match?', ISSUE_TAXONOMY[0].conditions.includes(productCondition));

  const reasons = ISSUE_TAXONOMY.filter((reason) => reason.conditions.includes(productCondition)).map((reason) => {
    const base = {
      code: reason.code,
      label: reason.label,
      description: reason.description,
      subreasons: reason.subreasons,
      noEvidenceRequired: Boolean(reason.noEvidenceRequired),
      minEvidenceCount: reason.noEvidenceRequired ? 0 : reason.minEvidenceCount || 0
    };

    if (!reason.policyRelevant) {
      // vendor/carrier-fault or urgent categories — not gated by the
      // remorse-return policy at all
      return { ...base, policy: null };
    }

    return {
      ...base,
      policy: {
        isInternational,
        returnsAccepted: Boolean(returnPolicy?.accepted),
        allowedWithinDays: returnPolicy?.allowedWithin || null,
        shippingPaidBy: returnPolicy?.shippingPaidBy || null,
        refundMethod: returnPolicy?.refundMethod || null
      }
    };
  });

  return {
    orderItem: {
      _id: orderItem._id,
      productName: orderItem.productName,
      imageUrl: orderItem.imageUrl
    },
    order: { _id: order._id, orderNo: order.orderNo, createdAt: order.createdAt },
    productCondition: conditionMaster ? { code: conditionMaster.code, name: conditionMaster.name } : null,
    daysSinceOrder: daysSince,
    withinAdvisoryWindow,
    advisoryWindowDays: REPORT_WINDOW_DAYS,
    reasons
  };
}

module.exports = { getIssueEligibility, REPORT_WINDOW_DAYS };