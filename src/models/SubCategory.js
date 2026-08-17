const mongoose = require("mongoose");

const SubCategorySchema = new mongoose.Schema(
  {
    cover: {
  filename: { type: String, required: false },
  url: { type: String, required: false }
},
    name: {
      type: String,
      required: [true, "Name is required."],
      maxlength: [100, "Name cannot exceed 100 characters."],
    },
    metaTitle: { type: String, required: false },
    description: { type: String, required: false },
    metaDescription: { type: String, required: false },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
      required: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    childCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChildCategory",
      },
    ],
  },
  { timestamps: true }
);

SubCategorySchema.index(
  { slug: 1, parentCategory: 1 },
  { unique: true }
)

const SubCategory =
  mongoose.models.SubCategory ||
  mongoose.model("SubCategory", SubCategorySchema);
module.exports = SubCategory;
