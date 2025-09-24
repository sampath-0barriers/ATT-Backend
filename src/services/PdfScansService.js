const fs = require("fs").promises;
const PdfScansRepo = require("../repository/PdfScansRepo");
const {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  PDFAccessibilityCheckerJob,
  PDFAccessibilityCheckerResult,
} = require("@adobe/pdfservices-node-sdk");
const { Readable } = require("stream");

class PdfScansService {
  constructor() {
    this.credentials = new ServicePrincipalCredentials({
      clientId: process.env.PDF_SERVICES_CLIENT_ID,
      clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET,
    });
    this.pdfServices = new PDFServices({ credentials: this.credentials });
  }

  async createPdfScan(fileData, authorId) {
    if (!fileData || !fileData.path) {
      throw new Error("No PDF file uploaded");
    }

    try {
      const fileBuffer = await fs.readFile(fileData.path);

      const pdfScanData = {
        authorId,
        mimeType: fileData.mimetype,
        fileName: fileData.originalname,
        fileSize: fileData.size,
        fileData: fileBuffer,
      };

      const result = await PdfScansRepo.create(pdfScanData);

      return result;
    } catch (error) {
      console.error("Error in createPdfScan:", error);
      throw new Error(`Failed to create PDF scan: ${error.message}`);
    }
  }

  async deletePdfScan(pdfScanId) {
    const result = await PdfScansRepo.deleteById(pdfScanId);
    return { success: result };
  }

  async getAllPdfScans(query, options) {
    return await PdfScansRepo.findAll(query, options);
  }

  async getOnePdfScanBy(query, options) {
    return await PdfScansRepo.findOneBy(query, options);
  }

  async countPdfScans(query) {
    return await PdfScansRepo.count(query);
  };

  async getPdfScanById(pdfScanId) {
    const pdfScan = await PdfScansRepo.findById(pdfScanId);
    if (!pdfScan) {
      throw new Error("PDF scan not found");
    }
    return pdfScan;
  }

  async runPdfScan(pdfScanId) {
    const pdfScan = await PdfScansRepo.findOneBy({ _id: pdfScanId });
    if (!pdfScan) {
      throw new Error("PDF scan not found");
    }

    let initialResult;
    try {
      // Create initial scan result record
      initialResult = await PdfScansRepo.createScanResult({
        pdfScanId,
        authorId: pdfScan.authorId,
        fileName: pdfScan.fileName,
        status: "In Progress",
      });

      let buffer;
      if (pdfScan.fileData && pdfScan.fileData.buffer) {
        buffer = pdfScan.fileData.buffer;
      } else {
        throw new Error("Invalid PDF data format");
      }

      const readStream = Readable.from(buffer);

      const inputAsset = await this.pdfServices.upload({
        readStream,
        mimeType: MimeType.PDF,
      });

      const job = new PDFAccessibilityCheckerJob({ inputAsset });
      const pollingURL = await this.pdfServices.submit({ job });

      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: PDFAccessibilityCheckerResult,
      });

      const resultAssetReport = pdfServicesResponse.result.report;
      const streamAssetReport = await this.pdfServices.getContent({
        asset: resultAssetReport,
      });

      const reportContent = await this.streamToString(
        streamAssetReport.readStream
      );
      const scanResults = JSON.parse(reportContent);

      const numPassed = scanResults.Summary.Passed;
      const numFailed = scanResults.Summary.Failed;
      const score = numPassed / (numPassed + numFailed);

      let success = await PdfScansRepo.updateScanResult(
        initialResult.insertedId.toString(),
        {
          results: scanResults,
          score,
          status: "Completed",
        }
      );
      if (!success) {
        throw new Error("Failed to update scan result");
      }

      // Update mostRecentScore and lastRan in PDF Scan uploaded
      success = await PdfScansRepo.update(pdfScanId, {
        mostRecentScore: score,
        lastRan: new Date(),
      });
      if (!success) {
        throw new Error("Failed to update PDF scan");
      }

      return {
        scanResultId: initialResult.insertedId,
        results: scanResults,
      };
    } catch (error) {
      // Update the initial scan result with error status
      if (initialResult?.insertedId) {
        await PdfScansRepo.updateScanResult(initialResult.insertedId, {
          error: error.message,
          status: "Failed",
        });
      }

      throw new Error(`Failed to scan PDF: ${error.message}`);
    }
  }

  async streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  }

  async getScanResults(pdfScanId) {
    return await PdfScansRepo.findScanResults(pdfScanId);
  }

  async getScanResultsBy(query, options) {
    return await PdfScansRepo.findScanResultsBy(query, options);
  }

  async getOneScanResultBy(query, options) {
    return await PdfScansRepo.findOneScanResultBy(query, options);
  }

  async getScanResultById(resultId) {
    const result = await PdfScansRepo.findScanResultById(resultId);
    if (!result) {
      throw new Error("Scan result not found");
    }
    return result;
  }
}

module.exports = new PdfScansService();
