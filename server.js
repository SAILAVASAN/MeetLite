// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {}; // roomId -> Set of socketIds

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", ({ roomId, username }) => {
  console.log(`${username} (${socket.id}) joined room ${roomId}`);

  if (!rooms[roomId]) rooms[roomId] = new Map(); // use Map to store usernames
  rooms[roomId].set(socket.id, username);

  socket.join(roomId);

  // Notify existing peers about new user
  socket.to(roomId).emit("peer-joined", { peerId: socket.id, username });
});

  socket.on("signal", ({ target, signal }) => {
    console.log(`Signal from ${socket.id} -> ${target}`);
    io.to(target).emit("signal", { from: socket.id, signal });
  });

 socket.on("leave", ({ roomId }) => {
  const username = rooms[roomId]?.get(socket.id);
  console.log(`${username} (${socket.id}) left room ${roomId}`);
  if (rooms[roomId]) {
    rooms[roomId].delete(socket.id);
    socket.to(roomId).emit("peer-left", { peerId: socket.id, username });
  }
  socket.leave(roomId);
});


  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const [roomId, members] of Object.entries(rooms)) {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        socket.to(roomId).emit("peer-left", { peerId: socket.id });
      }
    }
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log("Server running on http://localhost:4000");
});
