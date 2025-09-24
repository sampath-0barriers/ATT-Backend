const PdfScan = require("../models/PdfScan");

class PdfScansRepo {
  async create(pdfScanData) {
    const result = await PdfScan.create(pdfScanData);
    return { ...pdfScanData, insertedId: result.insertedId };
  }

  async update(pdfScanId, updateData) {
    const result = await PdfScan.update(pdfScanId, updateData);
    return result.modifiedCount > 0;
  }

  async findById(pdfScanId) {
    return await PdfScan.findById(pdfScanId);
  }

  async findAll(query, options) {
    return await PdfScan.findAll(query, options);
  }

  async findOneBy(query, options) {
    return await PdfScan.findOneBy(query, options);
  }

  async count(query) {
    return await PdfScan.count(query);
  };

  async findAllByUser(userId) {
    return await PdfScan.findAllByUser(userId);
  }

  async deleteById(pdfScanId) {
    const result = await PdfScan.deleteById(pdfScanId);
    return result.deletedCount > 0;
  }

  async deleteBy(query) {
    const result = await PdfScan.deleteBy(query);
    return result.deletedCount;
  }

  async createScanResult(scanResultData) {
    const result = await PdfScan.createScanResult(scanResultData);
    return { ...scanResultData, insertedId: result.insertedId };
  }

  async updateScanResult(resultId, updateData) {
    const result = await PdfScan.updateScanResult(resultId, updateData);
    return result.modifiedCount > 0;
  }

  async findScanResults(pdfScanId) {
    return await PdfScan.findScanResults(pdfScanId);
  }

  async findScanResultsBy(query, options) {
    return await PdfScan.findScanResultsBy(query, options);
  }

  async findOneScanResultBy(query, options) {
    return await PdfScan.findOneScanResultBy(query, options);
  }

  async findScanResultById(resultId) {
    return await PdfScan.findScanResultById(resultId);
  }
}

module.exports = new PdfScansRepo();
