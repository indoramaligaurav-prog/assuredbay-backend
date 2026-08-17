const Review = require("../../models/Review");
const Products = require("../../models/Product");
/*    Get All Reviews (Admin Only)    */
const getReviewsByAdmin = async (req, res) => {
  try {
    const reviews = await Review.find({});
    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*    Create Review by Admin (Manual Entry)    */
const createReviewByAdmin = async (req, res) => {
  try {
    const { _id, review } = await req.body;
    const isReview = await Review.findOne({ _id: _id });
    const product = await Products.findOne({ _id: _id });

    await Products.findByIdAndUpdate(
      _id,
      {
        totalReview: product.totalReview + 1,
        totalRating: product.totalRating + review.rating,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (isReview) {
      const filtered = isReview.ratings.filter(
        (v) => v.name === `${review.rating} Star`
      )[0];
      const notFiltered = isReview.ratings.filter(
        (v) => v.name !== `${review.rating} Star`
      );

      const alreadyReview = await Review.findByIdAndUpdate(
        _id,
        {
          ratings: [
            ...notFiltered,
            {
              name: `${review.rating} Star`,
              reviewCount: filtered.reviewCount + 1,
              starCount: filtered.starCount + 1,
            },
          ],
          reviews: [...isReview.reviews, { ...review }],
        },
        {
          new: true,
          runValidators: true,
        }
      );

      return res.status(400).json({ success: true, data: alreadyReview });
    } else {
      const ratingData = [
        {
          name: "1 Star",
          starCount: 0,
          reviewCount: 0,
        },
        {
          name: "2 Star",
          starCount: 0,
          reviewCount: 0,
        },
        {
          name: "3 Star",
          starCount: 0,
          reviewCount: 0,
        },
        {
          name: "4 Star",
          starCount: 0,
          reviewCount: 0,
        },
        {
          name: "5 Star",
          starCount: 0,
          reviewCount: 0,
        },
      ];

      const filtered = ratingData.filter(
        (v) => v.name === `${review.rating} Star`
      )[0];
      const notFiltered = ratingData.filter(
        (v) => v.name !== `${review.rating} Star`
      );

      const newReview = await Review.create([
        {
          _id: _id,
          ratings: [
            ...notFiltered,
            {
              name: `${review.rating} Star`,
              reviewCount: filtered.reviewCount + 1,
              starCount: filtered.starCount + 1,
            },
          ],
          reviews: [{ ...review }],
        },
      ]);

      return res.status(201).json({ success: true, data: newReview });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getReviewsByAdmin,
  createReviewByAdmin,
};
