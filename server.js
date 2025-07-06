// api/server.js

const { Server } = require("socket.io");

let io;

module.exports = (req, res) => {
  if (!res.socket.server.io) {
    console.log("🔄 New Socket.IO server being initialized...");

    io = new Server(res.socket.server, {
      path: "/api/socket.io",
    });

    const users = {};

    function broadcastUserCount() {
      const count = Object.keys(users).length;
      io.emit("user-count", count);
    }

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

    res.socket.server.io = io;
  } else {
    console.log("✅ Using existing Socket.IO server");
  }
  res.end("Socket.IO server running");
};


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ AnonTalk running at http://localhost:${PORT}`);
});

