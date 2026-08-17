const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const slugify = require("slugify");
const path = require("path");
require("dotenv").config();

// DB connection


// Models
const Category = require(path.join(__dirname, "src/models/Category"));
const SubCategory = require(path.join(__dirname, "src/models/SubCategory"));
const ChildCategory = require(path.join(__dirname, "src/models/ChildCategory"));

mongoose.connect("mongodb://localhost:27017/assurebay");

const DEFAULT_COVER = {
  _id: "default",
  url: "/uploads/default/category.png",
};

async function importCSV(filePath) {
  const rows = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      rows.push({
        category: row.category?.trim(),
        subCategory: row.sub_category?.trim(),
        childCategory: row.child_category?.trim(),
      });
    })
    .on("end", async () => {
      console.log(`Loaded ${rows.length} rows`);

      for (const row of rows) {
        if (!row.category || !row.subCategory || !row.childCategory) {
          console.log("Skipping invalid row:", row);
          continue;
        }

        /* =======================
           CATEGORY
        ======================= */
        const categorySlug = slugify(row.category, { lower: true });

        let category = await Category.findOne({ slug: categorySlug });

        if (!category) {
          category = await Category.create({
            name: row.category,
            slug: categorySlug,

            metaTitle: row.category,
            description: row.category,
            metaDescription: row.category,

            cover: DEFAULT_COVER,
          });

          console.log("✅ Category created:", row.category);
        }

        /* =======================
           SUB CATEGORY
        ======================= */
        const subSlug = slugify(row.subCategory, { lower: true });

        let subCategory = await SubCategory.findOne({
          slug: subSlug,
          parentCategory: category._id,
        });

        if (!subCategory) {
          subCategory = await SubCategory.create({
            name: row.subCategory,
            slug: subSlug,

            parentCategory: category._id,

            metaTitle: row.subCategory,
            description: row.subCategory,
            metaDescription: row.subCategory,

            cover: DEFAULT_COVER,
          });

          console.log(
            `✅ SubCategory created: ${row.subCategory} → ${row.category}`
          );
        }

        /* =======================
           CHILD CATEGORY
        ======================= */
        const childSlug = slugify(row.childCategory, { lower: true });

        const childExists = await ChildCategory.findOne({
          slug: childSlug,
          subCategory: subCategory._id,
        });

        if (!childExists) {
          await ChildCategory.create({
            name: row.childCategory,
            slug: childSlug,

            subCategory: subCategory._id,

            metaTitle: row.childCategory,
            description: row.childCategory,
            metaDescription: row.childCategory,

            cover: DEFAULT_COVER,
          });

          console.log(
            `✅ ChildCategory created: ${row.childCategory} → ${row.subCategory}`
          );
        }
      }

      console.log("🎉 CATEGORY IMPORT COMPLETED");
      process.exit(0);
    });
}

// ▶️ RUN
importCSV("./categories.csv");
