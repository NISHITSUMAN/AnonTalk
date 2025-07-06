const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const users = {};

function broadcastUserCount() {
  const count = Object.keys(users).length;
  io.emit("user-count", count);
}

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  const username = `Anon_${Math.floor(1000 + Math.random() * 9000)}`;
  users[socket.id] = username;

  console.log(`✅ ${username} connected (${socket.id})`);

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

// ✅ Important for Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ AnonTalk running at http://localhost:${PORT}`);
});
