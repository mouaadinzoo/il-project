const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const roomsRouter = require("./src/routes/rooms");
const authRouter = require("./src/routes/auth");
const registerSockets = require("./src/sockets");
const { attachUser } = require("./src/middleware/auth");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://172.20.10.4:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

app.use("/api/rooms", roomsRouter);
app.use("/api/auth", authRouter);

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "WatchTogether API running",
    routes: ["/api/rooms/create", "/api/rooms/join"],
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://172.20.10.4:5173"],
    methods: ["GET", "POST"],
  },
});

registerSockets(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});
