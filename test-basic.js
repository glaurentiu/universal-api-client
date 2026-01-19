import { APIClient, createError } from "./dist/index.mjs";
import { normalizeError } from "universal-error-normalizer";

// Test 1: Basic successful request
async function testBasicSuccess() {
  console.log("\n=== Test 1: Basic Success ===");
  const client = new APIClient({
    baseURL: "https://jsonplaceholder.typicode.com",
    timeout: 5000,
  });

  try {
    const response = await client.get("/posts/1");
    console.log("✅ Success! Post title:", response.data.title);
    console.log("Status:", response.status);
    console.log("Response time:", response.duration, "ms");
  } catch (err) {
    console.log("❌ Error:", err.message);
  }
}

// Test 2: Error creation and normalization
async function testErrorCreation() {
  console.log("\n=== Test 2: Error Creation & Normalization ===");

  // Create different types of errors
  const errors = [
    createError("auth", "Invalid API key"),
    createError("validation", "Email format invalid", { field: "email", code: "INVALID_EMAIL" }),
    createError("server", "Internal server error", { status: 500 }),
    createError("network", "Connection timeout"),
  ];

  for (const err of errors) {
    console.log(`\nOriginal Error: ${err.type} - ${err.message}`);
    console.log(`Retryable: ${err.retryable}, Status: ${err.status}`);

    // Show what universal-error-normalizer does with it
    const normalized = normalizeError(err);
    console.log(`Normalized: ${normalized.type} - ${normalized.message}`);
  }
}

// Test 3: Client configuration
async function testConfiguration() {
  console.log("\n=== Test 3: Client Configuration ===");

  const client = new APIClient({
    baseURL: "https://httpbin.org",
    timeout: 10000,
    retries: 2,
    headers: {
      "X-Test": "universal-api-client",
    },
  });

  try {
    const response = await client.get("/headers");
    console.log("✅ Headers sent correctly:", response.data.headers["X-Test"]);
  } catch (err) {
    console.log("❌ Error:", err.message);
  }
}

// Test 4: Different HTTP methods
async function testHttpMethods() {
  console.log("\n=== Test 4: HTTP Methods ===");

  const client = new APIClient({
    baseURL: "https://jsonplaceholder.typicode.com",
  });

  try {
    // GET
    const getResponse = await client.get("/posts/1");
    console.log("✅ GET:", getResponse.data.id);

    // POST
    const postResponse = await client.post("/posts", {
      title: "Test Post",
      body: "This is a test",
      userId: 1,
    });
    console.log("✅ POST created:", postResponse.data.id);

  } catch (err) {
    console.log("❌ Error:", err.message);
  }
}

async function main() {
  console.log("🧪 Testing Universal API Client with Universal Error Normalizer");
  console.log("=" .repeat(60));

  await testBasicSuccess();
  await testErrorCreation();
  await testConfiguration();
  await testHttpMethods();

  console.log("\n" + "=" .repeat(60));
  console.log("✅ All tests completed!");
}

main().catch(console.error);