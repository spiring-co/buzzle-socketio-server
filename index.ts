import * as dotenv from "dotenv";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import fetch from "node-fetch";
import mailer from "@sendgrid/mail";

dotenv.config();

const {
    PORT=5000,
    API_URL,
    API_TOKEN,
    SENDGRID_API_KEY = "",
    FROM_EMAIL = "noreply@spiring.co",
} = process.env;
mailer.setApiKey(SENDGRID_API_KEY);
let isAlertSent = false
const getPendingAndErrorJobs = async () => {
    const result = {};
    const response = await fetch(
        `${API_URL}/jobs?paginate=false&fields=state&state[]=!finished`,
        { headers: { Authorization: `Bearer ${API_TOKEN}` } },
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

const mailPendingJobs = async () => {
    try {
        const result = await mailer.send({
            to: [
                "utkarsh@spiring.co",
                "harsh@spiring.co",
                "support@bulaava.in",
            ],
            from: FROM_EMAIL,
            subject: "More than 20 pending jobs",
            text: "You have more than 20 pending jobs in the queue",
            html: "<strong>You have more than 20 pending jobs in the queue</strong>",
        });
        console.log(result);
    } catch (e) {
        console.error(e);
    }
};

io.on("connection", (socket: Socket) => {
    // job progress
    // broadcasts progress receive from render nodes to clients
    socket.on("job-progress", (data) => io.emit("job-progress", data));
    socket.on("job-logs", (data) => io.emit("job-logs", data));
    socket.on("job-status", async (data) => {
        const result = await getPendingAndErrorJobs()
        io.emit("job-status", result)
        if (result["created"] <= 20) {
            isAlertSent = false
            return
        }
        if (!isAlertSent && result["created"] > 20) {
            //send alert
            await mailPendingJobs()
            isAlertSent = true
        }

    });

});

// server status
const statusInterval = setInterval(function () {
    io.emit("server-status", "I'm fine 🔥");
}, 5000);


console.log("💡 Socket server up on: " + PORT);
const server = httpServer.listen(PORT);
//clear interval if app shutdowns
process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);
function shutDown() {
    clearInterval(statusInterval)
    console.log("Cleared Inteval!")
    server.close((err) => {
        if (err) {
            console.log(`Failed to close server due to: ${err.message}`)
        } else {
            console.log("Server closed")
        }
    })
}

