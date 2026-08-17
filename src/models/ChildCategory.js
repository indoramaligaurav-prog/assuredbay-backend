const mongoose = require("mongoose");

const ChildCategorySchema = new mongoose.Schema(
  {
    cover: {
    _id: { type: String, required: false },
    url: { type: String, required: false },
      },
    name: {
      type: String,
      required: [true, "Name is required."],
      maxlength: [100, "Name cannot exceed 100 characters."],
      index: true,
    },
    metaTitle: { type: String, required: false },

    description: { type: String, required: false },
    metaDescription: { type: String, required: false },
    slug: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
      required: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
  
);

ChildCategorySchema.index(
  { slug: 1, subCategory: 1 },
  { unique: true }
);

const ChildCategory =
  mongoose.models.ChildCategory ||
  mongoose.model("ChildCategory", ChildCategorySchema);
module.exports = ChildCategory;
