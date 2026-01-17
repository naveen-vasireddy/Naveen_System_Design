// 01-url-shortener/tests/integration.test.ts

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log("Starting Day 24 Integration Tests...\n");

  // --- Test 1: Blocklist Protection ---
  console.log("Test 1: Checking Blocklist...");
  try {
    const response = await fetch(`${BASE_URL}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://malware.site/download' })
    });

    if (response.status === 400) {
      console.log("✅ PASS: Blocked malicious domain (400)");
    } else {
      console.error(`❌ FAIL: Expected 400, got ${response.status}`);
    }
  } catch (error) {
    console.error("❌ FAIL: Network error on blocklist test", error);
  }

  // --- Test 2: Rate Limiting ---
  console.log("\nTest 2: Checking Rate Limiter (Token Bucket/Fixed Window)...");
  console.log("Sending 15 requests (Limit is 10/min)...");

  let successCount = 0;
  let blockedCount = 0;

  for (let i = 1; i <= 15; i++) {
    try {
      // Use a unique URL to avoid idempotency cache (if added later)
      const response = await fetch(`${BASE_URL}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `http://google.com/search?q=${i}` })
      });

      if (response.status === 201) {
        successCount++;
        process.stdout.write('.'); // Dot indicates success
      } else if (response.status === 429) {
        blockedCount++;
        process.stdout.write('X'); // X indicates blocked
      } else {
        process.stdout.write('?'); // Unexpected status
      }
    } catch (err) {
      console.error(err);
    }
  }

  console.log("\n");
  
  // Validation Logic
  if (blockedCount > 0 && successCount <= 10) {
    console.log(`✅ PASS: Rate limiter active.`);
    console.log(`   Allowed: ${successCount}`);
    console.log(`   Blocked: ${blockedCount}`);
  } else {
    console.log(`❌ FAIL: Rate limiter did not trigger as expected.`);
    console.log(`   Allowed: ${successCount} (Should be ~10)`);
  }
}

runTests();
