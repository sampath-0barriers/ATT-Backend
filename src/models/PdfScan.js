const { client } = require("../dao/database");
const { ObjectId } = require("mongodb");

const db = client.db();
class PdfScan {
  // Handling PDFs uploaded by users
  static async create(pdfScanData) {
    return await db.collection("pdf_scans").insertOne({
      uploadDate: new Date(),
      ...pdfScanData,
    });
  }

  static async update(pdfScanId, updateData) {
    return await db.collection("pdf_scans").updateOne(
      { _id: pdfScanId },
      {
        $set: {
          ...updateData,
        },
      }
    );
  }

  static async findById(pdfScanId) {
    return await db.collection("pdf_scans").findOne({
      _id: ObjectId.createFromHexString(pdfScanId),
    });
  }

  static async findAll(query = {}, options = {}) {
    console.log("Getting all PDF scans with query and options:", JSON.stringify({ query, options }));
    return await db.collection("pdf_scans").find(query, options).toArray();
  }

  static async findOneBy(query = {}, options = {}) {
    console.log("Getting one PDF scan with query and options:", JSON.stringify({ query, options }));
    return await db.collection("pdf_scans").findOne(query, options);
  }

  static async count(query) {
    console.log("Counting PDF scans with query:", JSON.stringify(query));
    return await db.collection("pdf_scans").countDocuments(query);
  }

  static async findAllByUser(userId) {
    return await db
      .collection("pdf_scans")
      .find({ authorId: userId })
      .project({ fileData: 0 }) // Exclude file data from results
      .toArray();
  }

  static async deleteById(pdfScanId) {
    console.log(`Deleting PDF scan and associated scan results with id: ${pdfScanId}`);
    const _pdfScanId = ObjectId.createFromHexString(pdfScanId);
    // delete all scan results for this pdf scan
    await db.collection("pdf_scan_results").deleteMany({ pdfScanId: _pdfScanId });
    // finally, delete pdf scan
    const result = await db.collection("pdf_scans").deleteOne({
      _id: _pdfScanId,
    });
    return result;
  }

  static async deleteBy(query) {
    console.log("Deleting PDF scans with query:", JSON.stringify(query));
    // get items to delete only. incldue _id field only
    const itemsToDelete = await db.collection("pdf_scans").find(query, { projection: { _id: 1 } }).toArray();
    const pdfScanIdsToDelete = itemsToDelete.map(item => item._id);
    // delete all scan results for these pdf scans
    await db.collection("pdf_scan_results").deleteMany({ pdfScanId: { $in: pdfScanIdsToDelete } });
    // finally, delete pdf scans
    const deleteResult = await db.collection("pdf_scans").deleteMany(query);
    return deleteResult;
  }

  // Handling PDF scan results
  static async createScanResult(scanResultData) {
    return await db.collection("pdf_scan_results").insertOne({
      createdAt: new Date(),
      lastModified: new Date(),
      ...scanResultData,
    });
  }

  static async updateScanResult(resultId, updateData) {
    return await db.collection("pdf_scan_results").updateOne(
      { _id: ObjectId.createFromHexString(resultId) },
      {
        $set: {
          lastModified: new Date(),
          ...updateData,
        },
      }
    );
  }

  static async findScanResults(pdfScanId) {
    return await db
      .collection("pdf_scan_results")
      .find({ pdfScanId: pdfScanId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async findScanResultsBy(query = {}, options = {}) {
    console.log("Getting pdf scan results with query and options:", JSON.stringify({ query, options }));
    return await db.collection("pdf_scan_results").find(query, options).toArray();
  }

  static async findOneScanResultBy(query = {}, options = {}) {
    return await db.collection("pdf_scan_results").findOne(query, options);
  }


  static async findScanResultById(resultId) {
    return await db.collection("pdf_scan_results").findOne({
      _id: ObjectId.createFromHexString(resultId),
    });
  }
}

module.exports = PdfScan;
