const Products = require("../../models/Product");
const Users = require("../../models/User");

/*     Get User Wishlist    */
const getWishlist = async (req, res) => {
  try {


    const wishlist = req.userData.wishlist;
    const products = await Products.aggregate([
      {
        $match: {
          _id: { $in: wishlist },
          status: "published",
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "reviews",
          foreignField: "_id",
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" },
          variantWithLeastStock: {
            $reduce: {
              input: "$variants",
              initialValue: {
                stockQuantity: Number.MAX_VALUE,
                price: null,
                salePrice: null,
              },
              in: {
                $cond: [
                  { $lt: ["$$this.stockQuantity", "$$value.stockQuantity"] },
                  {
                    stockQuantity: "$$this.stockQuantity",
                    price: "$$this.price",
                    salePrice: "$$this.salePrice",
                  },
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          stockQuantity: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.stockQuantity",
              "$stockQuantity",
            ],
          },
          price: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.price",
              "$price",
            ],
          },
          salePrice: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.salePrice",
              "$salePrice",
            ],
          },
        },
      },

      {
        $project: {
          images: 1,
          name: 1,
          slug: 1,
          discount: 1,
          likes: 1,
          salePrice: 1,
          price: 1,
          averageRating: 1,
          vendor: 1,
          shop: 1,
          createdAt: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*     Add to Wishlist    */
const createWishlist = async (req, res) => {
  try {
    const user = req.userData;

    if (user?.role === "vendor" || user?.role === "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Admins and vendors are not allowed to use the wishlist feature.",
      });
    }

    const uid = user._id.toString();

    const wishlist = user.wishlist;

    const { pid } = req.body;
    const isAlready = wishlist.filter((id) => id.toString() === pid);

    if (!isAlready.length) {
      await Users.findByIdAndUpdate(
        uid,
        { $addToSet: { wishlist: pid } },
        { new: true }
      );

      await Products.findByIdAndUpdate(pid, {
        $inc: { likes: 1 },
      });

      const newWishlist = [...wishlist, pid];

      return res.status(201).json({
        success: true,
        data: newWishlist,
        type: "pushed",
        message: "Added To Wishlist",
      });
    }
    await Products.findByIdAndUpdate(pid, {
      $inc: { likes: -1 },
    });

    await Users.findByIdAndUpdate(
      uid,
      { $pull: { wishlist: pid } },
      { new: true }
    );

    const removedWishlist = wishlist.filter((id) => id.toString() !== pid);

    return res.status(200).json({
      success: true,
      type: "pulled",
      message: "Removed From Wishlist",
      data: removedWishlist,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getWishlist,
  createWishlist,
};
