import * as dotenv from "dotenv";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

dotenv.config();

const { PORT = 9999 } = process.env;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket: Socket) => {
  // job progress
  // broadcasts progress receive from render nodes to clients
  console.log(socket.id);
  socket.on("job-progress", (data) => io.emit("job-progress", data));
  socket.on("job-logs", (data) => io.emit("job-logs", data));

});

// server status
setInterval(function () {
  io.emit("server-status", "I'm fine 🔥");
}, 2000);

console.log("💡 Socket server up on: " + PORT);
httpServer.listen(PORT);
