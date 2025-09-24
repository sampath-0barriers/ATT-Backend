require('dotenv').config({ path: './.env' });
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");


const ScansController = require("./controllers/ScansController");
const PdfScansController = require("./controllers/PdfScansController");
const GuidanceController = require("./controllers/GuidanceController");
const UserController = require("./controllers/UserController");
const ProjectController = require("./controllers/ProjectController");
const Auth = require("./auth/auth");
const DeviceController = require("./controllers/DeviceController");
const ReportController = require("./controllers/ReportsController");
const ViolationController = require("./controllers/ViolationController");
const LicenseController = require("./controllers/LicenseController");

const app = express();

const { MongoClient } = require("mongodb"); // Ensure MongoClient is imported

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/molyreporter"; // Use .env first, fallback to local

console.log("MongoDB URI:", mongoURI); // Debugging

const client = new MongoClient(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


client.connect()
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Handle csv uploads
const csvStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "src/uploads/csv"); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadCsv = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  }
});

// Handle pdf uploads
// Ensure the pdf uploads directory exists
const pdfUploadsDir = path.join(__dirname, "uploads", "pdfs");
if (!fs.existsSync(pdfUploadsDir)) {
  fs.mkdirSync(pdfUploadsDir, { recursive: true });
}

const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, pdfUploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Performance logger middleware
const performanceLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`Request to ${req.originalUrl} took ${duration}ms`);
  });
  next();
};
app.use(performanceLogger);

app.use(
  "/uploads/images",
  express.static(path.join(__dirname, "./uploads/images"))
);

app.use(
  cors({
    origin: ["http://localhost:3000", "https://molyreporter-frontend-ljte.onrender.com"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Origin",
      "X-Requested-With",
      "Accept"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  })
); //any origin

// stripe webhook endpoint requires raw body parsing to validate the signature
// or move stripe webhook route to the top with express.raw() middleware
app.use(express.json(
  {
    verify: (req, res, buf) => {
      // check if the request is a stripe webhook event
      if (req.originalUrl.startsWith("/license/payment-webhook")) {

        req.rawBody = buf.toString();
      }
    }
  }
));
app.use(
  express.urlencoded({
    extended: true
  })
);

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "src/uploads/images"); // This is the destination directory for image uploads
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// PDF scan endpoints
app.post(
  "/pdf-scan/create",
  Auth.authenticateToken,
  Auth.validateLicense,
  uploadPdf.single("pdf"),
  PdfScansController.createPdfScan
);
app.delete(
  "/pdf-scan/delete/:pdfScanId",
  Auth.authenticateToken,
  Auth.validateLicense,
  PdfScansController.deletePdfScan
);
app.get(
  "/pdf-scans",
  Auth.authenticateToken,
  Auth.validateLicense,
  PdfScansController.getAllPdfScans
);
app.get(
  "/pdf-scan/:pdfScanId",
  Auth.authenticateToken,
  Auth.validateLicense,
  PdfScansController.getPdfScanById
);
app.post(
  "/pdf-scan/run/:pdfScanId",
  Auth.authenticateToken,
  Auth.validateLicense,
  PdfScansController.runPdfScan
);
app.get(
  "/pdf-scan/results/:pdfScanId",
  Auth.authenticateToken,
  Auth.validateLicense,
  PdfScansController.getScanResults
);

// run scheduled scans on every hour
const runScheduledScans = require("./jobs/RunScheduledScans.js");
runScheduledScans();

// Scan endpoints
app.get("/scan/urls", Auth.authenticateToken, Auth.validateLicense, ScansController.getURLs);
app.get("/request", Auth.authenticateToken, Auth.validateLicense, ScansController.getRequest);
app.post("/create-scan", Auth.authenticateToken, Auth.validateLicense, ScansController.createScan);
app.post("/run-scan", Auth.authenticateToken, Auth.validateLicense, ScansController.runScan);
app.post(
  "/schedule-scan",
  Auth.authenticateToken,
  Auth.validateLicense,
  ScansController.scheduleScan
);
app.put("/scan/edit", Auth.authenticateToken, Auth.validateLicense, ScansController.editScan);
app.delete("/scan/delete", Auth.authenticateToken, Auth.validateLicense, ScansController.deleteScan);
app.delete(
  "/scan/delete-multiple-scans",
  Auth.authenticateToken,
  Auth.validateLicense,
  ScansController.deleteMultipleScans
);
// app.get("/get-steps", Auth.authenticateToken, Auth.validateLicense, StepsController.getSteps);
app.get("/scan", Auth.authenticateToken, Auth.validateLicense, ScansController.getResults);
// app.get(
//   "/score",
//   Auth.authenticateToken,
//   Auth.validateLicense,
//   ScansController.getAccessibilityScore
// );
app.get(
  "/guidance-levels",
  Auth.authenticateToken,
  Auth.validateLicense,
  GuidanceController.getGuidanceLevels
);
app.get(
  "/device-configs",
  Auth.authenticateToken,
  Auth.validateLicense,
  DeviceController.getDeviceConfigs
);
app.get(
  "/scan_request",
  Auth.authenticateToken,
  Auth.validateLicense,
  ScansController.getScanRequests
);
//added by aman
app.get(
  "/scan_request/:id",
  Auth.authenticateToken,
  Auth.validateLicense,
  ScansController.getScanByRequestID
);
// added by aman


app.get(
  "/scan/:scanRequestId/report/",
  Auth.authenticateToken,
  Auth.validateLicense,
  ReportController.generateReport
);

// User/auth endpoints
app.post("/login", Auth.login);
app.post("/token", Auth.refresh);
app.delete("/logout", Auth.logout);
app.get("/users", Auth.authenticateToken, UserController.getAll);
app.post("/register", UserController.register);
app.post("/registerClient", UserController.registerClient);
app.get("/user", Auth.authenticateToken, UserController.getUsername);
app.patch(
  "/user",
  upload.single("avatar"),
  Auth.authenticateToken,
  UserController.edit
);
app.delete("/user", Auth.authenticateToken, UserController.deleteUser);
app.put("/user/approve", Auth.authenticateToken, UserController.approve);
// verifying user email by user himself
app.put("/user/verify", UserController.verify);

// Project endpoints
app.get("/projects", Auth.authenticateToken, Auth.validateLicense, ProjectController.getAllBy); //retrieve projects to display in that table
app.get("/project", Auth.authenticateToken, Auth.validateLicense, ProjectController.getProjectById);
app.post("/project", Auth.authenticateToken, Auth.validateLicense, ProjectController.create);
app.patch("/project", Auth.authenticateToken, Auth.validateLicense, ProjectController.edit); //editing projects
app.delete("/project", Auth.authenticateToken, Auth.validateLicense, ProjectController.deleteProject);

// Custom violation endpoints
app.post(
  "/violations/upload",
  Auth.authenticateToken,
  uploadCsv.single("file"),
  ViolationController.uploadViolationDescriptions
);

app.get(
  "/violations/descriptions",
  Auth.authenticateToken,
  ViolationController.getCustomDescriptions
);

// Use this scan endpoint for scan results if custom violation descriptions are needed
app.get(
  "/scan/custom",
  Auth.authenticateToken,
  ScansController.getResults,
  ViolationController.applyCustomViolationDescriptions,
  (req, res) => {
    res.json(res.locals.scanResults);
  }
);

// license payment, webhook endpoints
app.post("/license/create-checkout-session", Auth.authenticateToken, LicenseController.createCheckoutSession);
app.post("/license/payment-webhook", LicenseController.handlePaymentWebhook);
app.get("/license/plans", Auth.authenticateToken, LicenseController.getAllLicensePlans);
app.get("/licenses", Auth.authenticateToken, LicenseController.getAllLicenses);

// error handler middleware
app.use((err, req, res, next) => {
  console.error(err.message, err.stack);
  res.status(500).json({ error: "Something went terribly wrong!" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🔥 Server started listening on http://localhost:${port} 🚀`);
});