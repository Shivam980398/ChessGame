const express = require("express");
const port = 3000;
const socket = require("socket.io");
const http = require("http");

const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();

let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Online Chess Game" });
});

//ye function decide karega ki kisko kaise bhejna hai
io.on("connection", function (uniqueSocket) {
  console.log("Connected");

  // send to all
  //   uniqueSocket.on("joinGame", () => {
  //     console.log("Game joined");
  //     io.emit("game state");
  //   });

  //     uniqueSocket.on("disconnect", () => {
  //         console.log("Disconnected");
  //     });

  if (!players.white) {
    players.white = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "b");
  } else {
    uniqueSocket.emit("spectattorRole");
  }

  uniqueSocket.on("disconnect", () => {
    if (players.white === uniqueSocket.id) {
      delete players.white;
    } else if (players.black === uniqueSocket.id) {
      delete players.black;
    }
  });

  uniqueSocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniqueSocket.id !== players.white) return;
      if (chess.turn() === "b" && uniqueSocket.id !== players.black) return;

      const result = chess.move(move);

      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log("Invalid move :", move);
        uniqueSocket.emit("invalidMove :", move);
      }
    } catch (error) {
      console.log(error);

      uniqueSocket.emit("invalidMove :", move);
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
