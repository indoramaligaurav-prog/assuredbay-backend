const { MongoClient, ObjectId } = require('mongodb');
const XLSX = require('xlsx');
require("dotenv").config();

// ==========================================
// CONFIGURATION
// ==========================================
const MONGO_URI = process.env.MONGODB_URI; // Replace with your connection string
const DB_NAME = 'assurebay';
const EXCEL_FILE_PATH = 'category_hierarchy.xlsx';
const CLEAR_EXISTING = true; // Set to false if you do not want to wipe collections before inserting

// Helper function to create clean, URL-friendly slugs
function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/&/g, 'and')                  // Convert '&' to 'and'
    .replace(/[^a-z0-9\s-]/g, '')          // Strip special characters except spaces/hyphens
    .replace(/\s+/g, '-')                  // Replace spaces with single hyphen
    .replace(/-+/g, '-')                   // Collapse duplicate hyphens
    .trim()                                // Trim edge whitespace
    .replace(/^-+|-+$/g, '');              // Remove leading/trailing hyphens
}

async function seedDatabase() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('⏳ Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');

    const db = client.db(DB_NAME);
    const categoriesColl = db.collection('categories');
    const subcategoriesColl = db.collection('subcategories');
    const childcategoriesColl = db.collection('childcategories');

    // Wipe collections first if configuration is true
    if (CLEAR_EXISTING) {
      console.log('🗑️ Clearing existing collections for a clean slate...');
      await categoriesColl.deleteMany({});
      await subcategoriesColl.deleteMany({});
      await childcategoriesColl.deleteMany({});
    }

    console.log(`📦 Reading Excel file: ${EXCEL_FILE_PATH}...`);
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Parse Excel sheet rows into objects
    const rows = XLSX.utils.sheet_to_json(worksheet);
    console.log(`🔍 Found ${rows.length} rows to process.`);

    // In-memory Maps to track uniqueness and hold relational ObjectIds
    const categoriesMap = new Map();     // name -> ObjectId
    const subcategoriesMap = new Map();  // "parentCatName_subCatName" -> ObjectId

    // Arrays to collect documents for Bulk Insertion
    const categoriesToInsert = [];
    const subcategoriesToInsert = [];
    const childcategoriesToInsert = [];

    const now = new Date();

    for (const row of rows) {
      const catName = row['Category'] ? row['Category'].toString().trim() : null;
      const subName = row['Sub Category'] ? row['Sub Category'].toString().trim() : null;
      const childName = row['Child Category'] ? row['Child Category'].toString().trim() : null;

      if (!catName) continue; // Skip if row is completely empty

      // ----------------------------------------------------
      // 1. PROCESS CATEGORY
      // ----------------------------------------------------
      let catId;
      if (!categoriesMap.has(catName)) {
        catId = new ObjectId();
        categoriesMap.set(catName, catId);

        categoriesToInsert.push({
          _id: catId,
          cover: { _id: 'default', url: '/uploads/default/category.png' },
          name: catName,
          metaTitle: catName,
          description: catName,
          metaDescription: catName,
          slug: slugify(catName),
          status: 'active',
          subCategories: [], // Populated sequentially below
          createdAt: now,
          updatedAt: now,
          __v: 0
        });
      } else {
        catId = categoriesMap.get(catName);
      }

      // ----------------------------------------------------
      // 2. PROCESS SUB-CATEGORY
      // ----------------------------------------------------
      if (subName) {
        // Use composite keys to prevent duplicate collisions if subcategories share names across different categories
        const subKey = `${catName}_${subName}`;
        let subId;

        if (!subcategoriesMap.has(subKey)) {
          subId = new ObjectId();
          subcategoriesMap.set(subKey, subId);

          subcategoriesToInsert.push({
            _id: subId,
            cover: { _id: 'default' },
            name: subName,
            metaTitle: subName,
            description: subName,
            metaDescription: subName,
            slug: slugify(subName),
            status: 'active',
            parentCategory: catId,
            childCategories: [], // Populated sequentially below
            createdAt: now,
            updatedAt: now,
            __v: 0
          });

          // Link the Sub-Category ObjectId to its parent Category document in memory
          const parentCatDoc = categoriesToInsert.find(c => c._id.equals(catId));
          if (parentCatDoc) {
            parentCatDoc.subCategories.push(subId);
          }
        } else {
          subId = subcategoriesMap.get(subKey);
        }

        // ----------------------------------------------------
        // 3. PROCESS CHILD-CATEGORY
        // ----------------------------------------------------
        if (childName) {
          const childId = new ObjectId();

          childcategoriesToInsert.push({
            _id: childId,
            cover: { _id: 'default', url: '/uploads/default/category.png' },
            name: childName,
            metaTitle: childName,
            description: childName,
            metaDescription: childName,
            slug: slugify(childName),
            status: 'active',
            subCategory: subId,
            createdAt: now,
            updatedAt: now,
            __v: 0
          });

          // Link the Child-Category ObjectId to its parent Sub-Category document in memory
          const parentSubDoc = subcategoriesToInsert.find(s => s._id.equals(subId));
          if (parentSubDoc) {
            parentSubDoc.childCategories.push(childId);
          }
        }
      }
    }

    // ----------------------------------------------------
    // BULK DATABASE INSERTIONS
    // ----------------------------------------------------
    if (categoriesToInsert.length > 0) {
      console.log(`🚀 Inserting ${categoriesToInsert.length} Categories...`);
      await categoriesColl.insertMany(categoriesToInsert);
    }

    if (subcategoriesToInsert.length > 0) {
      console.log(`🚀 Inserting ${subcategoriesToInsert.length} Sub-Categories...`);
      await subcategoriesColl.insertMany(subcategoriesToInsert);
    }

    if (childcategoriesToInsert.length > 0) {
      console.log(`🚀 Inserting ${childcategoriesToInsert.length} Child-Categories...`);
      await childcategoriesColl.insertMany(childcategoriesToInsert);
    }

    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error occurred during seeding:', error);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed.');
  }
}

seedDatabase();