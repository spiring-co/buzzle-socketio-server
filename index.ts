import * as dotenv from "dotenv";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import fetch from "node-fetch";

dotenv.config();

const { PORT, API_URL, API_TOKEN } = process.env;



const getPendingAndErrorJobs = async () => {
  const result = {};

  const response = await fetch(
    `${API_URL}/jobs?size=9999&fields=state&state[]=!finished`,
    { headers: { Authorization: `Bearer ${API_TOKEN}` } }
  );
  const json = await response.json();

  json.data.map((j) => {
    if (j.state in result) {
      result[j.state] += 1;
    } else {
      result[j.state] = 1;
    }
  });
  return result;
};



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

setInterval(function () {
  getPendingAndErrorJobs().then((result) => {
    io.emit("job-status", result);
  });
}, 2000);

console.log("💡 Socket server up on: " + PORT);
httpServer.listen(PORT);
