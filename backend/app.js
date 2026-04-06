const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const auth = require("./middleware/auth");
const errorHandler = require("./middleware/errorHandler");
const transactionRoutes = require("./routes/transactions");
const snapshotRoutes = require("./routes/snapshots");
const chatRoutes = require("./routes/chat");
const advisorRoutes = require("./routes/advisor");
const goalRoutes = require("./routes/goals");
const userRoutes = require("./routes/user");
const categoryLimitRoutes = require("./routes/categoryLimits");

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/transactions", auth, transactionRoutes);
app.use("/api/snapshots", auth, snapshotRoutes);
app.use("/api/chat", auth, chatRoutes);
app.use("/api/advisor", auth, advisorRoutes);
app.use("/api/goals", auth, goalRoutes);
app.use("/api/user", auth, userRoutes);
app.use("/api/category-limits", auth, categoryLimitRoutes);

app.use(errorHandler);

module.exports = app;
