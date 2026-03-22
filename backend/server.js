require("dotenv").config();

const http = require("http");
const socketIO = require("socket.io");
const app = require("./api");
const path = require("path");
const Message = require("./Models").Message;

const PORT = process.env.PORT || 5001;

// Create HTTP server with Socket.io
const server = http.createServer(app);
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(",").map(url => url.trim().replace(/\/$/, "")) 
  : [];

const io = socketIO(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.includes("localhost") || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store active users
const activeUsers = new Map();

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("🔗 User connected:", socket.id);

  // User comes online
  socket.on("user-online", (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`👤 ${userId} is online`);
    io.emit("user-status", { userId, status: "online" });
  });

  // Send message via socket
  socket.on("send-message", async (data) => {
    try {
      const { sender, recipient, text, attachments } = data;
      console.log(`💬 Message from ${sender} to ${recipient}: ${text || "[Attachment]"}`);

      // Save to database
      const message = new Message({
        sender,
        recipient,
        text: text || (attachments && attachments.length > 0 ? "📁 Attachment" : ""),
        attachments: attachments || []
      });
      await message.save();

      // Populate sender and recipient info
      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "name email")
        .populate("recipient", "name email");

      // Emit to recipient if online
      const recipientSocketId = activeUsers.get(recipient);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receive-message", populatedMessage);
        console.log(`✅ Message delivered to ${recipient}`);
      }

      // Confirm to sender
      socket.emit("message-sent", populatedMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("message-error", { error: error.message });
    }
  });

  // User goes offline
  socket.on("disconnect", () => {
    // Find and remove user
    for (let [userId, socketId] of activeUsers) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(`👋 ${userId} went offline`);
        io.emit("user-status", { userId, status: "offline" });
        break;
      }
    }
    console.log("❌ User disconnected:", socket.id);
  });
});

const express = require("express");
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
app.use((req, res) => {
  console.log(`404 at ${req.method} ${req.url}`);
  res.status(404).json({ 
    message: "API route not found", 
    requestedPath: req.url,
    method: req.method 
  });
});
