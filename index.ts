import * as dotenv from "dotenv";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import fetch from "node-fetch";
import mailer from "@sendgrid/mail";

dotenv.config();

const { PORT, API_URL, API_TOKEN, SENDGRID_API_KEY = "", FROM_EMAIL = "noreply@spiring.co"} = process.env;
mailer.setApiKey(SENDGRID_API_KEY);

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
// created

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const mailPendingJobs = async () =>{
  try {
    const result = await mailer.send({
      to: ["utkarsh@spiring.co", "harsh@spiring.co","support@bulaava.in"],
      from: FROM_EMAIL,
      subject: "More than 20 pending jobs",
      text: 'You have more than 20 pending jobs in the queue',
      html: '<strong>You have more than 20 pending jobs in the queue</strong>',
    });
    console.log(result);
  } catch (e) {
    console.error(e);
  }
}

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

var executed = false;
setInterval(function () {
  getPendingAndErrorJobs().then((result) => {
    console.log(result)
    io.emit("job-status", result);
    //if created jobs are over 50 then sends an email 
    if(result["created"] > 20){
      console.log("over 20")
      if (!executed) {
        executed = true;
        mailPendingJobs();
      }
    }
    if(result["created"] < 20){
      executed = false
    }
  });
}, 2000);

console.log("💡 Socket server up on: " + PORT);
httpServer.listen(PORT);
