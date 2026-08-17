const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    cover: {
      _id: {
        type: String,
        required: false,
      },
      url: {
        type: String,
        required: false,
      },
    },

    name: {
      type: String,
      required: [true, "Name is required."],
      maxlength: [100, "Name cannot exceed 100 characters."],
      index: true,
    },

    metaTitle: {
      type: String,
      required: false,
      maxlength: [100, "Meta title cannot exceed 100 characters."],
    },

    description: {
      type: String,
      required: false,
      maxlength: [500, "Description cannot exceed 500 characters."],
    },

    metaDescription: {
      type: String,
      required: false,
      maxlength: [200, "Meta description cannot exceed 200 characters."],
    },

    slug: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
    },

    subCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Category || mongoose.model("Category", CategorySchema);
