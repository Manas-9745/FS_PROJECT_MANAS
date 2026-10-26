const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'EXP_6_JWT_Authentication.postman_collection.json');
const destDir = path.join(__dirname, '..', 'postman', 'collections');
const dest = path.join(destDir, 'EXP_6_JWT_Authentication.postman_collection.json');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log("Copied collection to postman/collections/");
}
