import { APIClient, createError } from "./dist/index.mjs";
import { normalizeError } from "universal-error-normalizer";

// Create client instance
const client = new APIClient({
  baseURL: "https://httpstat.us",
  timeout: 2000,
  adapter: "fetch", // test with fetch first
});

// Helper to run a demo request and log normalized errors
async function runDemo(name, fn) {
  console.log(`\n=== ${name} ===`);
  try {
    const res = await fn();
    console.log("✅ Success - Response:", res);
  } catch (err) {
    console.log("Raw Error from Client:", {
      type: err.type,
      message: err.message,
      status: err.status,
      code: err.code,
      retryable: err.retryable,
      source: err.source,
    });

    // Show what happens when we normalize it again with universal-error-normalizer
    const norm = normalizeError(err);
    console.log("Re-normalized with universal-error-normalizer:", {
      type: norm.type,
      message: norm.message,
      status: norm.status,
      retryable: norm.retryable,
      source: norm.source,
    });
  }
}

async function main() {
  // 1️⃣ Fetch 404 Not Found
  await runDemo("Fetch 404 Not Found", () =>
    client.get("/404") // intentionally missing
  );

  // 2️⃣ Axios 500 Server Error
  client.updateConfig({ adapter: "axios" });
  await runDemo("Axios 500 Server Error", () =>
    client.get("/500") // endpoint that returns 500
  );

  // 3️⃣ Timeout
  await runDemo("Timeout Test", () =>
    client.get("/200?sleep=5000") // will exceed 2s timeout
  );

  // 4️⃣ Custom Error Simulation
  await runDemo("Custom Error", async () => {
    throw createError("auth", "Token expired");
  });

  // 5️⃣ GraphQL Validation Error Simulation
  await runDemo("GraphQL Validation Error", async () => {
    throw createError("validation", "Email is invalid", {
      code: "VALIDATION_ERROR",
      field: "email",
    });
  });

  // 6️⃣ Network Error (unreachable host)
  await runDemo("Network Error Simulation", () =>
    client.get("http://localhost:9999/")
  );
}

main().catch(console.error);