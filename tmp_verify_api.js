const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8081,
  path: '/api/drug-info/profile?name=Amoxicillin',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('--- API RESPONSE PREVIEW (/api/drugs/profile) ---');
    console.log('Brand Name:', json.brandName);
    console.log('Usage Instructions (Tokenized List):');
    if (json.usageInstructions) json.usageInstructions.forEach((item, i) => console.log(`${i+1}. ${item}`));
    console.log('--- END PREVIEW ---');
    
    // Test the second endpoint
    const options2 = { ...options, path: '/api/drug-info/Amoxicillin' };
    http.get(options2, (res2) => {
      let data2 = '';
      res2.on('data', c => data2 += c);
      res2.on('end', () => {
        console.log('--- API RESPONSE PREVIEW (/api/drug-info/Amoxicillin) ---');
        console.log('Status:', res2.statusCode);
        console.log('Raw output:', data2);
        console.log('--- END PREVIEW ---');
      });
    });
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
