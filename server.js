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

  socket.on("join", ({ roomId }) => {
    console.log(`${socket.id} joined room ${roomId}`);

    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(socket.id);
    socket.join(roomId);

    // Notify existing peers about the new one
    socket.to(roomId).emit("peer-joined", { peerId: socket.id });
  });

  socket.on("signal", ({ target, signal }) => {
    console.log(`Signal from ${socket.id} -> ${target}`);
    io.to(target).emit("signal", { from: socket.id, signal });
  });

  socket.on("leave", ({ roomId }) => {
    console.log(`${socket.id} left room ${roomId}`);
    if (rooms[roomId]) {
      rooms[roomId].delete(socket.id);
      socket.to(roomId).emit("peer-left", { peerId: socket.id });
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

server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
