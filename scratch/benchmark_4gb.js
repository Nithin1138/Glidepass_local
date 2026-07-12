const fs = require('fs');
const http = require('http');
const path = require('path');

// Configuration
const SERVER_URL = 'http://127.0.0.1:8000';
const SID = 'test_session_token'; // Replace with active SESSION_TOKEN if needed
const FILE_SIZE_GB = 4;
const FILE_SIZE_BYTES = FILE_SIZE_GB * 1024 * 1024 * 1024;
const TEMP_FILE_PATH = path.join(__dirname, 'speedtest_4gb.tmp');

function create4GBFile() {
    console.log(`Creating a 4GB dummy file for speed testing at: ${TEMP_FILE_PATH}`);
    const bufferSize = 16 * 1024 * 1024; // 16MB write buffer
    const buffer = Buffer.alloc(bufferSize, 'a');
    const fd = fs.openSync(TEMP_FILE_PATH, 'w');
    let written = 0;
    
    const start = Date.now();
    while (written < FILE_SIZE_BYTES) {
        const toWrite = Math.min(bufferSize, FILE_SIZE_BYTES - written);
        fs.writeSync(fd, buffer, 0, toWrite);
        written += toWrite;
        
        if (Date.now() - start > 1000) {
            const pct = ((written / FILE_SIZE_BYTES) * 100).toFixed(1);
            console.log(`Writing dummy file: ${pct}%...`);
        }
    }
    fs.closeSync(fd);
    console.log(`Successfully created 4GB dummy file in ${((Date.now() - start) / 1000).toFixed(2)}s`);
}

async function runUploadTest() {
    console.log('\n--- STARTING 4GB UPLOAD SPEED TEST ---');
    const fileStream = fs.createReadStream(TEMP_FILE_PATH, { highWaterMark: 4 * 1024 * 1024 }); // 4MB stream chunks
    
    return new Promise((resolve, reject) => {
        const url = `${SERVER_URL}/api/files/upload_raw?filename=speedtest_4gb.tmp&sid=${encodeURIComponent(SID)}`;
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': FILE_SIZE_BYTES
            }
        };

        const startTime = Date.now();
        let bytesSent = 0;
        let lastReportTime = Date.now();

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                const totalDuration = (Date.now() - startTime) / 1000;
                const avgSpeed = (FILE_SIZE_BYTES / totalDuration / 1048576).toFixed(2);
                console.log(`\nUpload complete. Server response: ${responseData}`);
                console.log(`Average Upload Speed: ${avgSpeed} MB/s (Time taken: ${totalDuration.toFixed(2)}s)`);
                resolve(avgSpeed);
            });
        });

        req.on('error', (err) => {
            console.error('Upload Request Error:', err);
            reject(err);
        });

        // Monitor progress
        fileStream.on('data', (chunk) => {
            bytesSent += chunk.length;
            const now = Date.now();
            if (now - lastReportTime >= 1000) {
                const elapsed = (now - startTime) / 1000;
                const speed = (bytesSent / elapsed / 1048576).toFixed(2);
                const pct = ((bytesSent / FILE_SIZE_BYTES) * 100).toFixed(1);
                console.log(`Uploading: ${pct}% | Current Speed: ${speed} MB/s`);
                lastReportTime = now;
            }
        });

        fileStream.pipe(req);
    });
}

async function runDownloadTest() {
    console.log('\n--- STARTING 4GB DOWNLOAD SPEED TEST ---');
    return new Promise((resolve, reject) => {
        const url = `${SERVER_URL}/api/files/download/speedtest_4gb.tmp?sid=${encodeURIComponent(SID)}`;
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET'
        };

        const startTime = Date.now();
        let bytesReceived = 0;
        let lastReportTime = Date.now();

        const req = http.request(options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Server returned code ${res.statusCode}`));
                return;
            }

            res.on('data', (chunk) => {
                bytesReceived += chunk.length;
                const now = Date.now();
                if (now - lastReportTime >= 1000) {
                    const elapsed = (now - startTime) / 1000;
                    const speed = (bytesReceived / elapsed / 1048576).toFixed(2);
                    const pct = ((bytesReceived / FILE_SIZE_BYTES) * 100).toFixed(1);
                    console.log(`Downloading: ${pct}% | Current Speed: ${speed} MB/s`);
                    lastReportTime = now;
                }
            });

            res.on('end', () => {
                const totalDuration = (Date.now() - startTime) / 1000;
                const avgSpeed = (bytesReceived / totalDuration / 1048576).toFixed(2);
                console.log(`\nDownload complete.`);
                console.log(`Average Download Speed: ${avgSpeed} MB/s (Time taken: ${totalDuration.toFixed(2)}s)`);
                resolve(avgSpeed);
            });
        });

        req.on('error', (err) => {
            console.error('Download Request Error:', err);
            reject(err);
        });

        req.end();
    });
}

async function main() {
    try {
        // Step 1: Create 4GB file
        if (!fs.existsSync(TEMP_FILE_PATH)) {
            create4GBFile();
        } else {
            console.log('4GB dummy file already exists. Skipping creation.');
        }

        // Step 2: Run Upload Speed Test
        const uploadSpeed = await runUploadTest();

        // Step 3: Run Download Speed Test
        const downloadSpeed = await runDownloadTest();

        console.log('\n======================================');
        console.log('         SPEED TEST COMPLETED         ');
        console.log('======================================');
        console.log(`Laptop Local Upload speed:   ${uploadSpeed} MB/s`);
        console.log(`Laptop Local Download speed: ${downloadSpeed} MB/s`);
        console.log('--------------------------------------');
        console.log('For mobile: Use Private/Incognito browser on');
        console.log('your phone connected to LAN, run the test card,');
        console.log('and check real-time speed feedback there!');
        console.log('======================================\n');

        // Cleanup temporary files
        try {
            fs.unlinkSync(TEMP_FILE_PATH);
            console.log('Cleaned up local dummy file.');
        } catch (e) {}

    } catch (err) {
        console.error('Speed test execution failed:', err);
    }
}

main();
