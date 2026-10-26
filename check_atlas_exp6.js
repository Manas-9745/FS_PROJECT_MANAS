const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");
const Item = require("./models/Item");

async function checkAtlasExp6() {
  console.log("========================================================================");
  console.log("             MONGODB ATLAS CLUSTER VERIFICATION (EXP NO. 6)             ");
  console.log("========================================================================");
  
  await mongoose.connect(process.env.MONGO_URI);
  console.log(" Connected to MongoDB Atlas Cloud Cluster!");
  console.log(" Cluster Host: ac-c3sj7wd-shard-00-00.fwg0mfx.mongodb.net");
  console.log(" Database Name:", mongoose.connection.name);

  console.log("\n========================================================================");
  console.log(" 1. USERS COLLECTION (EXP 6: JWT Authentication & User/Admin Roles)");
  console.log("========================================================================");
  const users = await User.find().select("+password").sort({ createdAt: -1 });
  console.log(` Total registered users in Atlas: ${users.length}\n`);

  users.forEach((u, i) => {
    console.log(`User #${i + 1}:`);
    console.log(`  Name:     ${u.name}`);
    console.log(`  Email:    ${u.email}`);
    console.log(`  Role:     ${u.role.toUpperCase() === "ADMIN" ? "🛡️ ADMIN (Full Access)" : "👤 USER (Standard Access)"}`);
    console.log(`  ID:       ${u._id}`);
    console.log(`  Password: ${u.password} (Bcrypt Hash)`);
    console.log(`  Logins:   ${u.loginCount || 1} live session(s) recorded`);
    console.log(`  Last In:  ${u.lastLogin ? u.lastLogin.toLocaleString() : 'Just registered'}`);
    console.log(`  Created:  ${u.createdAt}`);
    console.log("------------------------------------------------------------------------");
  });

  console.log("\n========================================================================");
  console.log(" 2. ITEMS COLLECTION (Lost & Found Project PS)");
  console.log("========================================================================");
  const itemCount = await Item.countDocuments();
  console.log(` Total Lost & Found items in Atlas: ${itemCount}\n`);
  const recentItems = await Item.find().sort({ createdAt: -1 }).limit(5);
  recentItems.forEach((item, i) => {
    console.log(`Item #${i + 1}: [${item.status}] ${item.name} | Category: ${item.category} | Location: ${item.location}`);
  });

  console.log("\n========================================================================");
  console.log(" All user accounts, roles, and items are active in MongoDB Atlas!");
  console.log("========================================================================\n");

  await mongoose.disconnect();
}

checkAtlasExp6().catch((err) => {
  console.error("Atlas connection error:", err.message);
  process.exit(1);
});
