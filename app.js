const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

const rooms = [];
let roomCount = 1;

const findOrCreateRoom = () => {
  let room = rooms.find((r) => r.players.length < 2);

  if (!room) {
    room = {
      id: `room-${roomCount++}`,
      players: [],
      chess: new Chess(),
    };
    rooms.push(room);
  }

  return room;
};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const room = findOrCreateRoom();
  room.players.push(socket.id);
  socket.join(room.id);

  if (room.players.length === 1) {
    socket.emit("playerRole", "w");
    socket.emit("status", "waiting");
  }

  if (room.players.length === 2) {
    const [white, black] = room.players;

    io.to(white).emit("playerRole", "w");
    io.to(black).emit("playerRole", "b");

    io.to(room.id).emit("status", "connected");
    io.to(room.id).emit("boardState", room.chess.fen());
  }

  socket.on("move", (move) => {
    const chess = room.chess;

    const isWhite = socket.id === room.players[0];
    const isBlack = socket.id === room.players[1];

    if (
      (chess.turn() === "w" && !isWhite) ||
      (chess.turn() === "b" && !isBlack)
    ) {
      return;
    }

    const result = chess.move(move);
    if (result) {
      io.to(room.id).emit("move", move);
      io.to(room.id).emit("boardState", chess.fen());
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    room.players = room.players.filter((id) => id !== socket.id);

    io.to(room.id).emit("status", "opponent-left");

    if (room.players.length === 0) {
      const index = rooms.indexOf(room);
      rooms.splice(index, 1);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
