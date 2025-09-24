const fs = require("fs").promises;
const { ObjectId } = require('mongodb');
const PdfScansService = require("../services/PdfScansService");

class PdfScansController {
  static async createPdfScan(req, res) {
    try {
      const { _id: userId } = req.user;

      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      const fileData = {
        path: req.file.path,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };

      const result = await PdfScansService.createPdfScan(fileData, userId);

      res.status(201).json({
        message: "PDF scan created successfully",
        ...result,
      });
    } catch (error) {
      console.error("Error creating PDF scan:", error);
      res.status(500).json({ error: "Failed to create PDF scan" });
    } finally {
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path).catch((error) => {
          console.error("Failed to delete uploaded PDF file:", error);
        });
      }
    }
  }

  static async deletePdfScan(req, res) {
    try {
      const { pdfScanId } = req.params;
      console.log(`[PdfScansController.deletePdfScan] pdfScanId: ${pdfScanId}`);

      if (!pdfScanId || pdfScanId === ":pdfScanId") {
        return res.status(400).json({ error: "pdfScanId is required" });
      }
      const user = req.user;
      const isAdmin = user.admin;
      const _pdfScanId = ObjectId.createFromHexString(pdfScanId);
      const query = isAdmin ? { _id: _pdfScanId } : { _id: _pdfScanId, authorId: user._id };
      const isPdfExists = await PdfScansService.countPdfScans(query);
      console.log(`[PdfScansController.deletePdfScan] isPdfExists: ${isPdfExists}`);
      if (!isPdfExists) return res.status(404).json({ error: "PDF scan not found with Id" });
      await PdfScansService.deletePdfScan(pdfScanId);
      res.json({ message: "PDF scan deleted successfully" });
    } catch (error) {
      console.error("Error deleting PDF scan:", error);
      res.status(500).json({ error: "Failed to delete PDF scan" });
    }
  }

  static async getAllPdfScans(req, res) {
    try {
      const user = req.user;
      const isAdmin = user.admin;
      const limit = parseInt(req.query.limit) || 10;
      const skip = parseInt(req.query.skip) || 0;
      const sort = req.query.sort || "-uploadDate";
      // if user type is admin, empty query, else include author
      const query = isAdmin ? {} : { authorId: user._id };
      const pdfScans = await PdfScansService.getAllPdfScans(query, { limit, skip, sort });
      res.json(pdfScans);
    } catch (error) {
      console.error("Error fetching PDF scans:", error);
      res.status(500).json({ error: "Failed to fetch PDF scans" });
    }
  }

  static async getPdfScanById(req, res) {
    try {
      const { pdfScanId } = req.params;
      const user = req.user;
      const isAdmin = user.admin;
      console.log(
        `[PdfScansController.getPdfScanById] pdfScanId: ${pdfScanId}`
      );

      if (!pdfScanId || pdfScanId === ":pdfScanId") {
        return res.status(400).json({ error: "pdfScanId is required" });
      }
      const _pdfScanId = ObjectId.createFromHexString(pdfScanId);
      const query = isAdmin ? { _id: _pdfScanId } : { _id: _pdfScanId, authorId: user._id };
      const pdfScan = await PdfScansService.getOnePdfScanBy(query);
      if (!pdfScan) return res.status(404).json({ error: "PDF scan not found" });
      res.json(pdfScan);
    } catch (error) {
      console.error("Error fetching PDF scan:", error);
      res.status(500).json({ error: "Failed to fetch PDF scan" });
    }
  }

  static async runPdfScan(req, res) {
    try {
      const { pdfScanId } = req.params;
      console.log(`[PdfScansController.runPdfScan] pdfScanId: ${pdfScanId}`);
      if (!pdfScanId || pdfScanId === ":pdfScanId") {
        return res.status(400).json({ error: "pdfScanId is required" });
      }

      const user = req.user;
      const isAdmin = user.admin;
      const _pdfScanId = ObjectId.createFromHexString(pdfScanId);
      const query = isAdmin ? { _id: _pdfScanId } : { _id: _pdfScanId, authorId: user._id };
      const isPdfExists = await PdfScansService.countPdfScans(query);
      if (!isPdfExists) return res.status(404).json({ error: "PDF scan not found with Id" });
      const result = await PdfScansService.runPdfScan(_pdfScanId);

      res.json({
        message: "PDF scan completed successfully",
        status: result.status,
        result,
      });
    } catch (error) {
      if (error.message === "PDF scan not found") {
        return res.status(404).json({ error: error.message });
      }
      console.error("Error running PDF scan:", error);
      res.status(500).json({ error: "Failed to run PDF scan" });
    }
  }

  static async getScanResults(req, res) {
    try {
      const { pdfScanId } = req.params;
      const user = req.user;
      const isAdmin = user.admin;
      const _pdfScanId = ObjectId.createFromHexString(pdfScanId);
      const query = isAdmin ? { pdfScanId: _pdfScanId } : { pdfScanId: _pdfScanId, authorId: user._id };
      const results = await PdfScansService.getScanResultsBy(query, { sort: "-createdAt" });
      res.json(results);
    } catch (error) {
      console.error("Error fetching scan results:", error);
      res.status(500).json({ error: "Failed to fetch scan results" });
    }
  }

  static async getScanResultById(req, res) {
    try {
      const { resultId } = req.params;
      const user = req.user;
      const isAdmin = user.admin;
      const _resultId = ObjectId.createFromHexString(resultId);
      const query = isAdmin ? { _id: _resultId } : { _id: _resultId, authorId: user._id };
      const result = await PdfScansService.getOneScanResultBy(query);
      if (!result) return res.status(404).json({ error: "Scan result not found" });
      res.json(result);
    } catch (error) {
      console.error("Error fetching scan result:", error);
      res.status(500).json({ error: "Failed to fetch scan result" });
    }
  }
}

module.exports = PdfScansController;
