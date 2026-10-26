const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function inspectAtlas() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const adminDb = mongoose.connection.db.admin();
  const dbsInfo = await adminDb.listDatabases();
  
  console.log("=== DATABASES ON YOUR ATLAS CLUSTER ===");
  for (const db of dbsInfo.databases) {
    console.log(`- Database: "${db.name}" (Size on disk: ${(db.sizeOnDisk / 1024).toFixed(2)} KB)`);
  }

  console.log(`\n=== CURRENT CONNECTED DATABASE: "${mongoose.connection.name}" ===`);
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`- Collection: "${col.name}" (${count} documents)`);
  }

  console.log("\n=== DOCUMENTS IN 'users' COLLECTION ===");
  const users = await mongoose.connection.db.collection("users").find({}).toArray();
  console.log(JSON.stringify(users, null, 2));

  await mongoose.disconnect();
}

inspectAtlas().catch(console.error);
