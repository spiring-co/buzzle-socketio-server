import * as dotenv from "dotenv";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

dotenv.config();

const { PORT } = process.env;

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
  socket.on("job-progress", (job, { state, progress, server }) => {
    io.emit("job-progress", { id: job.uid, state, progress, server });
  });

  socket.on("job-logs", (id, data) => {
    io.emit("job-logs", { id, data });
  });
});

// server status
setInterval(function () {
  io.emit("server-status", "I'm fine 🔥");
}, 2000);

console.log("💡 Socket server up on: " + PORT);
httpServer.listen(PORT);
