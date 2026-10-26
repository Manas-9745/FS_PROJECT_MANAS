const http = require('http');

const items = [
  {
    name: "Blue Hydro Flask",
    description: "Blue 32oz water bottle with stickers found on a desk after the morning lecture.",
    category: "Accessories",
    status: "Found",
    location: "Classroom 301"
  },
  {
    name: "Student ID Card",
    description: "Student ID belonging to a CS department student. Turned in to the cafeteria cashier.",
    category: "Documents",
    status: "Found",
    location: "Cafeteria"
  },
  {
    name: "North Face Backpack",
    description: "Black North Face backpack containing notebooks and a graphing calculator. Left on a couch.",
    category: "Accessories",
    status: "Lost",
    location: "Student Union"
  },
  {
    name: "Silver Keys on Lanyard",
    description: "Set of 4 keys on a red campus lanyard. Found near the sophomore parking area.",
    category: "Other",
    status: "Found",
    location: "Parking Lot B"
  },
  {
    name: "MacBook Charger",
    description: "Apple 61W USB-C Power Adapter lost in the library. Needed urgently!",
    category: "Electronics",
    status: "Lost",
    location: "Library 3rd Floor"
  },
  {
    name: "Prescription Glasses",
    description: "Black frame prescription glasses found near the basketball courts in a brown case.",
    category: "Personal",
    status: "Found",
    location: "Gymnasium"
  }
];

const postItem = (item) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(item);
    const options = {
      method: 'POST',
      host: 'localhost',
      port: 5000,
      path: '/api/items',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

const seedDB = async () => {
  console.log("Seeding MongoDB Atlas with sample Lost & Found items...\n");
  for (const item of items) {
    const result = await postItem(item);
    console.log(`✅ Created: ${result.name} [${result.status}] - ID: ${result._id}`);
  }
  console.log("\n✅ All sample items seeded successfully! Refresh http://localhost:5173 to see them.");
};

seedDB();
