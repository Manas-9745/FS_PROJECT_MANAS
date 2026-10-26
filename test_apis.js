const http = require('http');

const baseURL = 'http://localhost:5000/api/items';

const makeRequest = (options, body = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', error => reject(error));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const runTests = async () => {
  console.log("=== STARTING API TESTS (Simulating Postman) ===");

  // 1. POST API - Create Item 1
  console.log("\n1. Testing POST API (Creating item 1)...");
  const post1Res = await makeRequest({
    method: 'POST',
    host: 'localhost',
    port: 5000,
    path: '/api/items',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Black Leather Wallet',
    description: 'Found near the library entrance. Contains some ID cards.',
    category: 'Personal',
    status: 'Found',
    location: 'Library Entrance'
  });
  console.log("Response Status:", post1Res.status);
  console.log("Response Body:", post1Res.data);

  // 2. POST API - Create Item 2
  console.log("\n2. Testing POST API (Creating item 2)...");
  const post2Res = await makeRequest({
    method: 'POST',
    host: 'localhost',
    port: 5000,
    path: '/api/items',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Apple AirPods',
    description: 'Lost my airpods in a white case during the morning lecture.',
    category: 'Electronics',
    status: 'Lost',
    location: 'Room 301'
  });
  console.log("Response Status:", post2Res.status);
  
  // 3. POST API - Create Item 3 (to be deleted)
  const post3Res = await makeRequest({
    method: 'POST',
    host: 'localhost',
    port: 5000,
    path: '/api/items',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Blue Water Bottle',
    description: 'Test item for deletion',
    category: 'Accessories',
    status: 'Found',
    location: 'Cafeteria'
  });

  // 4. GET ALL API
  console.log("\n3. Testing GET API (Fetching all items)...");
  const getRes = await makeRequest({
    method: 'GET',
    host: 'localhost',
    port: 5000,
    path: '/api/items'
  });
  console.log("Response Status:", getRes.status);
  console.log(`Total items retrieved: ${getRes.data.length}`);

  const createdItemId = post1Res.data._id;

  // 5. GET BY ID API
  console.log(`\n4. Testing GET BY ID API (Fetching item ID: ${createdItemId})...`);
  const getByIdRes = await makeRequest({
    method: 'GET',
    host: 'localhost',
    port: 5000,
    path: `/api/items/${createdItemId}`
  });
  console.log("Response Status:", getByIdRes.status);
  console.log("Item Name:", getByIdRes.data.name);

  // 6. PUT API
  console.log(`\n5. Testing PUT API (Updating item ID: ${createdItemId})...`);
  const putRes = await makeRequest({
    method: 'PUT',
    host: 'localhost',
    port: 5000,
    path: `/api/items/${createdItemId}`,
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Black Leather Wallet (UPDATED)',
    description: 'Found near the library entrance. Contains some ID cards. Claimed!',
  });
  console.log("Response Status:", putRes.status);
  console.log("Updated Item Name:", putRes.data.name);

  // 7. DELETE API
  const itemToDeleteId = post3Res.data._id;
  console.log(`\n6. Testing DELETE API (Deleting item ID: ${itemToDeleteId})...`);
  const deleteRes = await makeRequest({
    method: 'DELETE',
    host: 'localhost',
    port: 5000,
    path: `/api/items/${itemToDeleteId}`
  });
  console.log("Response Status:", deleteRes.status);
  console.log("Response Body:", deleteRes.data);

  console.log("\n=== API TESTS COMPLETED SUCCESSFULLY ===");
};

runTests();
