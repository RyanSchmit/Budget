const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
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
const categorizeRoutes = require("./routes/categorize");
const keywordRulesRoutes = require("./routes/keywordRules");

const app = express();

app.use(helmet());

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",")
  : [];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI request limit reached. Please try again later." },
});

app.use(globalLimiter);
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/transactions", auth, transactionRoutes);
app.use("/api/snapshots", auth, snapshotRoutes);
app.use("/api/chat", auth, chatRoutes);
app.use("/api/advisor", auth, aiLimiter, advisorRoutes);
app.use("/api/goals", auth, goalRoutes);
app.use("/api/user", auth, userRoutes);
app.use("/api/category-limits", auth, categoryLimitRoutes);
app.use("/api/categorize", auth, aiLimiter, categorizeRoutes);
app.use("/api/keyword-rules", auth, keywordRulesRoutes);

app.use(errorHandler);

module.exports = app;
