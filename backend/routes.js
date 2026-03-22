const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { Department, PerformanceReview, Payroll, Announcement, Goal, Document, Message, Task, Team, TeamMessage } = require("./Models");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "public", "uploads", "messages");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const router = express.Router();

// ==================== DEPARTMENTS ====================
router.post("/departments", async (req, res) => {
  try {
    const dept = new Department(req.body);
    await dept.save();
    res.status(201).json({ message: "Department created", department: dept });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/departments", async (req, res) => {
  try {
    const departments = await Department.find().populate("head", "name email");
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/departments/:deptId", async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.deptId, req.body, { new: true })
      .populate("head", "name email");
    res.json({ message: "Department updated", department });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/departments/:deptId", async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.deptId);
    res.json({ message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== PERFORMANCE REVIEWS ====================
router.post("/performance-reviews", async (req, res) => {
  try {
    const review = new PerformanceReview(req.body);
    await review.save();
    res.status(201).json({ message: "Review submitted", review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/performance-reviews/:employeeId", async (req, res) => {
  try {
    const reviews = await PerformanceReview.find({ employee: req.params.employeeId })
      .populate("reviewer", "name email");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== PAYROLL ====================
router.post("/payroll", async (req, res) => {
  try {
    const payroll = new Payroll(req.body);
    await payroll.save();
    res.status(201).json({ message: "Payroll entry created", payroll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/payroll/:employeeId", async (req, res) => {
  try {
    const payrollRecords = await Payroll.find({ employee: req.params.employeeId })
      .sort({ month: -1 });
    res.json(payrollRecords);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== ANNOUNCEMENTS ====================
router.post("/announcements", async (req, res) => {
  try {
    const announcement = new Announcement(req.body);
    await announcement.save();
    res.status(201).json({ message: "Announcement posted", announcement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/announcements", async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate("author", "name email")
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/announcements/:id", async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/announcements/:id", async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("author", "name email");
    res.json({ message: "Announcement updated", announcement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== EMPLOYEE GOALS ====================
router.post("/goals", async (req, res) => {
  try {
    const goal = new Goal(req.body);
    await goal.save();
    res.status(201).json({ message: "Goal created", goal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/goals/:employeeId", async (req, res) => {
  try {
    const goals = await Goal.find({ employee: req.params.employeeId });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/goals/:goalId", async (req, res) => {
  try {
    const goal = await Goal.findByIdAndUpdate(req.params.goalId, req.body, { new: true });
    res.json({ message: "Goal updated", goal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/goals/:goalId", async (req, res) => {
  try {
    await Goal.findByIdAndDelete(req.params.goalId);
    res.json({ message: "Goal deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== TEAMS ====================
router.post("/teams", async (req, res) => {
  try {
    const team = new Team(req.body);
    await team.save();
    res.status(201).json({ message: "Team created", team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/teams", async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/teams/:teamId", async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.teamId, req.body, { new: true });
    res.json({ message: "Team updated", team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/teams/:teamId", async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.teamId);
    await TeamMessage.deleteMany({ team: req.params.teamId });
    res.json({ message: "Team deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== TEAM MESSAGES ====================
router.post("/teams/:teamId/messages", async (req, res) => {
  try {
    const msg = new TeamMessage({ ...req.body, team: req.params.teamId });
    await msg.save();
    res.status(201).json({ message: "Team message sent", msg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/teams/:teamId/messages", async (req, res) => {
  try {
    const msgs = await TeamMessage.find({ team: req.params.teamId }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== EMPLOYEE TASKS ====================
router.post("/tasks", async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).json({ message: "Task created", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/tasks/:employeeId", async (req, res) => {
  try {
    const tasks = await Task.find({ employee: req.params.employeeId });
    res.json(tasks.map(t => ({
        id: t._id,
        description: t.description,
        deadline: t.deadline,
        status: t.status,
        assignedDate: t.assignedDate
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().populate("employee", "name");
    res.json(tasks.map(t => ({
        id: t._id,
        userId: t.employee?._id,
        userName: t.employee?.name,
        description: t.description,
        deadline: t.deadline,
        status: t.status,
        assignedDate: t.assignedDate
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/tasks/:taskId", async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.taskId, req.body, { new: true });
    res.json({ message: "Task updated", task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/tasks/:taskId", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== DOCUMENTS ====================
router.post("/documents", async (req, res) => {
  try {
    const document = new Document(req.body);
    await document.save();
    res.status(201).json({ message: "Document uploaded", document });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/documents/:employeeId", async (req, res) => {
  try {
    const documents = await Document.find({ employee: req.params.employeeId });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/documents/:docId", async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.docId);
    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== MESSAGES ====================
router.post("/messages/upload", upload.single("attachment"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileUrl = `/uploads/messages/${req.file.filename}`;
    res.status(201).json({
      message: "File uploaded successfully",
      attachment: {
        name: req.file.originalname,
        url: fileUrl
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/messages", async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email")
      .populate("recipient", "name email");
    res.status(201).json({ message: "Message sent", data: populatedMessage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/messages/:userId", async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.userId },
        { recipient: req.params.userId }
      ]
    })
      .populate("sender", "name email")
      .populate("recipient", "name email")
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/messages/:userId/:contactId", async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: contactId },
        { sender: contactId, recipient: userId }
      ]
    })
      .populate("sender", "name email")
      .populate("recipient", "name email")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/messages/:messageId/read", async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { isRead: true, readAt: new Date() },
      { new: true }
    )
      .populate("sender", "name email")
      .populate("recipient", "name email");
    res.json({ message: "Message marked as read", data: message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/messages/:messageId", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/messages-unread/:userId", async (req, res) => {
  try {
    const unreadCount = await Message.countDocuments({
      recipient: req.params.userId,
      isRead: false
    });
    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==================== ANALYTICS ====================
router.get("/analytics/overview", async (req, res) => {
  try {
    const User = require("./User");
    const totalEmployees = await User.countDocuments();
    const departments = await Department.countDocuments();
    const pendingLeaves = await User.aggregate([
      { $unwind: "$leaveRequests" },
      { $match: { "leaveRequests.status": "Pending" } },
      { $count: "count" }
    ]);
    const pendingCount = pendingLeaves.length > 0 ? pendingLeaves[0].count : 0;

    res.json({
      totalEmployees,
      departments,
      pendingLeaves: pendingCount,
      announcements: await Announcement.countDocuments()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
