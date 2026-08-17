const Review = require("../../models/Review");
const Products = require("../../models/Product");
const Orders = require("../../models/Order");

/*     Get Reviews by Product ID (Public)    */
const getReviewsbyPid = async (req, res) => {
  try {
    const pid = req.params.pid;

    const reviews = await Review.find({ product: pid })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: ["firstName", "lastName", "cover", "orders"],
      });

    const product = await Products.findById(pid).select(["slug", "status"]);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const reviewsSummery = await Products.aggregate([
      {
        $match: {
          slug: product.slug,
          status: "published",
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "product",
          as: "reviews",
        },
      },
      { $unwind: "$reviews" },
      {
        $group: {
          _id: "$reviews.rating",
          count: { $sum: 1 },
        },
      },
    ]);

    return res.status(200).json({ success: true, reviewsSummery, reviews });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Create Review by User    */
const createReview = async (req, res) => {
  try {
    const uid = req.userData._id.toString();
    const { pid, rating, review: reviewText, images } = req.body;

    const restrictedRoles = ["admin", "super-admin", "vendor"];

    if (restrictedRoles.includes(req.userData.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Admins, super-admins and vendors are not allowed to write reviews.",
      });
    }
    const orders = await Orders.find({
      "user.email": req.userData.email,
      "items.pid": pid,
    });

    const updatedImages = await Promise.all(
      images.map(async (image) => {
        return { url: image };
      })
    );
    const review = await Review.create({
      product: pid,
      review: reviewText,
      rating,
      images: updatedImages,
      user: uid,
      isPurchased: Boolean(orders.length),
    });

    await Products.findByIdAndUpdate(pid, {
      $addToSet: {
        reviews: review._id,
      },
    });

    return res
      .status(201)
      .json({ success: true, data: review, user: req.userData });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getReviewsbyPid,
  createReview,
};
