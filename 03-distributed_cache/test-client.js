const net = require('net');

const client = new net.Socket();

client.connect(6379, '127.0.0.1', () => {
    console.log('Connected to server');
    client.write('SET name naveen\r\n');
});

client.on('data', (data) => {
    console.log('Received: ' + data);
    if (data.toString().includes('OK')) {
        client.write('GET name\r\n');
    }
    // If we got the value back, we are done
    if (data.toString().includes('naveen')) {
        client.end();
    }
});

client.on('close', () => {
    console.log('Connection closed');
});