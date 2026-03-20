const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8081,
  path: '/api/drug-info/profile?name=Amoxicillin',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    try {
      if (data) {
        const json = JSON.parse(data);
        console.log('Data:', JSON.stringify(json, null, 2));
      } else {
        console.log('No data received');
      }
    } catch (e) {
      console.log('Raw Data:', data);
    }
  });
});

req.on('error', (e) => console.error(e));
req.end();
