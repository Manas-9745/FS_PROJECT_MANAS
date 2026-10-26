const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");
const Item = require("./models/Item");

async function checkAtlas() {
  console.log("======================================================");
  console.log(" CONNECTING TO MONGODB ATLAS...");
  console.log("======================================================");
  
  await mongoose.connect(process.env.MONGO_URI);
  console.log(" Connected to MongoDB Atlas cluster!");
  console.log(" Database Name:", mongoose.connection.name);

  console.log("\n======================================================");
  console.log(" 1. USERS COLLECTION (Exp 5 - Password Hashing & Roles)");
  console.log("======================================================");
  const users = await User.find().select("+password");
  users.forEach((u, i) => {
    console.log(`\nUser #${i + 1}:`);
    console.log(`  ID:       ${u._id}`);
    console.log(`  Name:     ${u.name}`);
    console.log(`  Email:    ${u.email}`);
    console.log(`  Role:     ${u.role}`);
    console.log(`  Password: ${u.password} (Bcrypt Hash)`);
    console.log(`  Created:  ${u.createdAt}`);
  });

  console.log("\n======================================================");
  console.log(" 2. ITEMS COLLECTION (Lost & Found Project PS)");
  console.log("======================================================");
  const itemCount = await Item.countDocuments();
  console.log(`  Total items in database: ${itemCount}`);
  const sampleItems = await Item.find().limit(3);
  sampleItems.forEach((item, i) => {
    console.log(`  Item #${i + 1}: [${item.status}] ${item.name} (${item.location})`);
  });

  console.log("\n======================================================");
  console.log(" All data is live in your cloud MongoDB Atlas cluster!");
  console.log("======================================================\n");

  await mongoose.disconnect();
}

checkAtlas().catch((err) => {
  console.error("Atlas connection error:", err.message);
  process.exit(1);
});
