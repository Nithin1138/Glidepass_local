const http = require('http');

const TARGET_URL = 'http://localhost:3000/api/vitcodes';
const CONCURRENT_REQUESTS = 100; // Number of concurrent requests in this batch
const TOTAL_BATCHES = 10;        // Repeat to simulate throughput

let successCount = 0;
let failCount = 0;
const latencies = [];

function makeRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(TARGET_URL, (res) => {
      // Consume response data to free socket
      res.on('data', () => {});
      res.on('end', () => {
        if (res.statusCode === 200) {
          successCount++;
          latencies.push(Date.now() - start);
        } else {
          failCount++;
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      failCount++;
      resolve();
    });
    
    req.end();
  });
}

async function runBatch(batchNum) {
  console.log(`Running batch ${batchNum}/${TOTAL_BATCHES} with ${CONCURRENT_REQUESTS} concurrent requests...`);
  const promises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    promises.push(makeRequest());
  }
  await Promise.all(promises);
}

async function startStressTest() {
  const overallStart = Date.now();
  console.log('--- STARTING STRESS TEST ---');
  console.log(`Target: ${TARGET_URL}`);
  
  for (let b = 1; b <= TOTAL_BATCHES; b++) {
    await runBatch(b);
  }
  
  const overallDuration = (Date.now() - overallStart) / 1000;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  
  console.log('\n--- TEST RESULTS ---');
  console.log(`Total Requests Sent: ${CONCURRENT_REQUESTS * TOTAL_BATCHES}`);
  console.log(`Successful Requests: ${successCount}`);
  console.log(`Failed/Error Requests: ${failCount}`);
  console.log(`Total Duration: ${overallDuration.toFixed(2)} seconds`);
  console.log(`Throughput: ${(successCount / overallDuration).toFixed(2)} req/sec`);
  console.log(`Average Latency: ${avgLatency.toFixed(2)} ms`);
}

startStressTest();
