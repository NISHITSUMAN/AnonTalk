// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = {}; // Map socket.id to usernames

function generateRandomName() {
  return `Anon_${Math.floor(1000 + Math.random() * 9000)}`;
}

function broadcastUserCount() {
  const count = Object.keys(users).length;
  io.emit("user-count", count);
}

// Serve static frontend
app.use(express.static("public"));

io.on("connection", (socket) => {
  const username = generateRandomName();
  users[socket.id] = username;

  console.log(`✅ ${username} connected (${socket.id})`);

  // Send assigned name and broadcast join
  socket.emit("assign-name", username);
  socket.broadcast.emit("system-message", `🔵 ${username} joined the chat`);
  broadcastUserCount();

  socket.on("chat-message", (msg) => {
    io.emit("chat-message", {
      name: users[socket.id],
      message: msg,
    });
  });

  socket.on("typing", () => {
    socket.broadcast.emit("typing", users[socket.id]);
  });

  socket.on("register-user", (name) => {
    console.log("User registered with name:", name);
    // Optional: You can store this if needed
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      io.emit("system-message", `🔴 ${username} left the chat`);
      delete users[socket.id];
      broadcastUserCount();
    }
  });
});

server.listen(3000, () => {
  console.log("✅ AnonTalk running at http://localhost:3000");
});
