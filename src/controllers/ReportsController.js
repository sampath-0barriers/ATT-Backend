const { ObjectId } = require('mongodb');
const ReportsService = require("../services/ReportService");
const ScansService = require("../services/ScansService");
const fs = require("fs");

async function generateReport(request, response) {
  try {
    const scanRequestId = request.params.scanRequestId;
    if (!scanRequestId) {
      response.status(400).send("Please provide a scanRequestId.");
      return;
    }

    const format = request.query.format || "csv"; // default to CSV if no format is provided
    // Get the user from the request object
    const user = request.user;
    const userId = user._id;
    const isAdmin = user.admin;
    const _scanRequestId = ObjectId.createFromHexString(scanRequestId);
    const query = isAdmin ? { _id: _scanRequestId } : { _id: _scanRequestId, authorId: userId };
    const scanExists = await ScansService.countScansBy(query);
    if (!scanExists) return response.status(404).send("Scan request not found with the provided ID.");
    const reportFile = await ReportsService.generateReport(
      scanRequestId,
      format,
      userId
    );

    if (format === "csv") {
      response.setHeader("Content-Type", "text/csv");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename=report-${scanRequestId}.csv`
      );
      // If reportFile is a stream, pipe it directly to response
      if (reportFile instanceof require("stream").Readable) {
        reportFile.pipe(response);
      }
      console.log(reportFile);
      fs.createReadStream(reportFile).pipe(response);
    } else if (format === 'pdf') {
      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Disposition', `attachment; filename=report-${scanRequestId}.pdf`);
      if (reportFile && typeof reportFile.pipe === 'function') {
        reportFile.pipe(response);
      }
      else {
        fs.createReadStream(reportFile).pipe(response);
      }
    } else if (format === "html") {
      response.setHeader("Content-Type", "text/html");
      if (typeof reportFile === "function") {
        response.send(reportFile);
      } else {
        response.setHeader(
          "Content-Disposition",
          `attachment; filename=report-${scanRequestId}.html`
        );
        fs.createReadStream(reportFile).pipe(response);
      }
    } else {
      response.status(400).send("Unsupported report format.");
    }
  } catch (err) {
    console.error(err);
    response.status(500).send("Error generating report.");
  }
}

module.exports = {
  generateReport,
};
