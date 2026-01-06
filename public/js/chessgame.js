const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  console.log(board);

  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowIndex;
      squareElement.dataset.col = squareIndex;

      if (square) {
        const pieceElement = document.createElement("div");

        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );

        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;

            sourceSquare = { row: rowIndex, col: squareIndex };

            const squareName = `${String.fromCharCode(97 + squareIndex)}${
              8 - rowIndex
            }`;

            highlightMoves(squareName);

            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", () => {
          clearHighlights();
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handleMove(sourceSquare, targetSource);
        }
      });
      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

const handleMove = (sourceSquare, targetSource) => {
  const move = {
    from: `${String.fromCharCode(97 + sourceSquare.col)}${
      8 - sourceSquare.row
    }`,
    to: `${String.fromCharCode(97 + targetSource.col)}${8 - targetSource.row}`,
  };
  socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
  const pieces = {
    p: "♙", // white pawn
    r: "♖", // white rook
    n: "♘", // white knight
    b: "♗", // white bishop
    q: "♕", // white queen
    k: "♔", // white king
  };

  return pieces[piece.type] || "";
};

socket.on("playerRole", (role) => {
  playerRole = role;
  renderBoard();
});

socket.on("spectattorRole", () => {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();
});
socket.on("move", (move) => {
  chess.move(move);
  clearHighlights();
  renderBoard();
});

const clearHighlights = () => {
  document
    .querySelectorAll(".square.highlight, .square.capture")
    .forEach((sq) => sq.classList.remove("highlight", "capture"));
};

const highlightMoves = (square) => {
  clearHighlights();

  const moves = chess.moves({
    square,
    verbose: true,
  });

  moves.forEach((move) => {
    const col = move.to.charCodeAt(0) - 97;
    const row = 8 - parseInt(move.to[1]);

    const targetSquare = document.querySelector(
      `.square[data-row="${row}"][data-col="${col}"]`
    );

    if (targetSquare) {
      targetSquare.classList.add(move.captured ? "capture" : "highlight");
    }
  });
};

const statusElement = document.getElementById("status");

socket.on("status", (status) => {
  if (status === "waiting") {
    statusElement.innerText = "⏳ Waiting for opponent...";
  }

  if (status === "connected") {
    statusElement.innerText = " Opponent connected!";
    renderBoard();
  }

  if (status === "opponent-left") {
    statusElement.innerText = " Opponent disconnected. Waiting...";
  }
});
