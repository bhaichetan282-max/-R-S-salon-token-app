const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sabhi folder paths ko check karega
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public/public')));
app.use(express.static(__dirname));

let currentToken = 0;
let lastIssuedToken = 100;
const AVG_SERVICE_MINUTES = 20;
let queue = [];

io.on('connection', (socket) => {
  socket.emit('update_state', {
    currentToken,
    lastIssuedToken,
    queue,
    avgTime: AVG_SERVICE_MINUTES
  });

  socket.on('book_token', (customerData) => {
    lastIssuedToken += 1;
    const newBooking = {
      tokenNumber: lastIssuedToken,
      name: customerData.name,
      phone: customerData.phone,
      slot: customerData.slot,
      bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    queue.push(newBooking);

    io.emit('update_state', {
      currentToken,
      lastIssuedToken,
      queue,
      avgTime: AVG_SERVICE_MINUTES
    });

    socket.emit('booking_success', newBooking);
  });

  socket.on('next_token', () => {
    if (queue.length > 0) {
      const nextCustomer = queue.shift();
      currentToken = nextCustomer.tokenNumber;
    } else {
      currentToken += 1;
    }

    io.emit('update_state', {
      currentToken,
      lastIssuedToken,
      queue,
      avgTime: AVG_SERVICE_MINUTES
    });
  });

  socket.on('reset_system', () => {
    currentToken = 0;
    lastIssuedToken = 100;
    queue = [];
    io.emit('update_state', {
      currentToken,
      lastIssuedToken,
      queue,
      avgTime: AVG_SERVICE_MINUTES
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
