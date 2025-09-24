const { ObjectId } = require("mongodb");
const { client } = require("../dao/database");

const db = client.db();

async function createScanRequest(
  config,
  device,
  name,
  depth,
  scannedURLs,
  steps = [],
  projectID,
  authorId
) {
  console.log("author in scanscontroller:", authorId);
  const request_collection = db.collection("scan_requests");

  const insert = await request_collection.insertOne({
    ...config,
    name: name,
    depth: depth,
    status: "Incomplete",
    date_created: new Date(),
    device: device,
    steps: steps,
    urls: Array.from(scannedURLs),
    projectID: projectID,
    authorId
  });
  return insert.insertedId;
}

/**
 * We add attributes weighted_score, date_last_ran for scans that have completed a scan request
 */
async function completeScanRequest(id, score) {
  // console.log(`Completing scan request with ID ${id}`);
  // console.log(`Score: ${score}`);
  try {

    const request_collection = db.collection("scan_requests");
    console.log(id);
    const objectId = new ObjectId(id);
    console.log(objectId);
    const update = await request_collection.updateOne(
      { _id: objectId },
      {
        $set: {
          status: "Complete",
          weighted_score: score,
          date_last_ran: new Date(),
        },
      }
    );
    // console.log(update.modifiedCount)

    if (update.matchedCount === 1 || update.modifiedCount === 1) {
      console.log(
        `Scan request with ID ${id} updated successfully with score of ${score}.`
      );
    } else {
      console.log(`Scan request with ID ${id} not found or not updated.`);
    }
  } catch (error) {
    console.error("Error updating scan request:", error);
  }
}

async function saveScanResults(scanRequestId, results, score, authorId, projectID) {
  const result_collection = db.collection("scan_results");
  const record = { scanRequestId, projectID, score, ...results, authorId };
  const insert = await result_collection.insertOne(record);

  return insert.insertedId;
}

async function getScanResults(scanRequestId) {
  const result_collection = db.collection("scan_results");
  return await result_collection
    .find({
      scanRequestId: new ObjectId(scanRequestId),
    })
    .toArray();
}

async function getScanResultsBy(query = {}, options = {}) {
  console.log("Getting scan results with query, options", JSON.stringify({ query, options }));
  const result_collection = db.collection("scan_results");
  return await result_collection.find(query, options).toArray();
};
async function getScanRequest() {
  const result_collection = db.collection("scan_requests");
  console.log(result_collection.find().toArray());
  return result_collection.find().toArray();
}

async function getScanRequestsBy(query = {}, options = {}) {
  console.log("Getting scan requests with query, options", JSON.stringify({ query, options }));
  const request_collection = db.collection("scan_requests");
  return await request_collection.find(query, options).toArray();
}
async function getScanRequestById(id) {
  const request_collection = db.collection("scan_requests");
  return await request_collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Retrieves a single scan request from the database by its ID.
 *
 * @param {string} scanRequestId - The ID of the scan request to retrieve.
 * @returns {Promise<Object>} The scan request document from the db.
 */
async function getRequest(scanRequestId) {
  const result_collection = db.collection("scan_requests");

  return await result_collection.findOne({
    _id: new ObjectId(scanRequestId),
  });
}

async function getURLs(scanRequestId) {
  const result_collection = db.collection("scan_requests");

  return await result_collection
    .find({
      _id: new ObjectId(scanRequestId),
    })
    .toArray();
}

async function editScan(
  scanRequestId,
  name,
  device_config,
  depth,
  guidance,
  steps
) {
  const request_collection = db.collection("scan_requests");

  const updateData = {
    $set: {
      name: name,
      device_config: device_config,
      depth: depth,
      guidance: guidance,
    },
  };
  // Check if steps should be included
  if (steps) {
    updateData.$set.steps = steps;
  }

  const update = await request_collection.updateOne(
    { _id: new ObjectId(scanRequestId) },
    updateData
  );
  return update.modifiedCount;
}

/**
 * Edit scan by query
 * @param {*} query
 * @param {*} updateData
 * @returns {Promise<number>} The number of records updated.
 * @throws Will throw an error if the database connection fails or the update operation fails.
 * @example
 * const updatedCount = await editScanBy({ status: "Complete" }, { status: "Incomplete" });
 * console.log(updatedCount); // Number of documents updated
 */

async function editScanBy(query, updateData) {
  console.log("Updating scan with query and updateData", JSON.stringify({ query, updateData }));
  try {

    const request_collection = db.collection("scan_requests");

    const update = await request_collection.updateOne(query, updateData);
    return update.modifiedCount;
  } catch (err) {
    console.error("Error during update scan:", err);
    throw new Error("Failed to update scan request");
  }
}

/**
 * Deletes a scan request from the 'scan_requests' collection in the db.
 *
 * This function connects to the database and attempts to delete a scan request document
 * with the specified scanRequestId. It returns the number of records deleted.
 *
 * @async
 * @function deleteScan
 *
 * @param {string} scanRequestId - The unique ID of the scan request to be deleted.
 *
 * @returns {Promise<number>} The number of records deleted (1 if successful, 0 if not found).
 *
 * @throws Will throw an error if the database connection fails or the deletion operation fails.
 *
 * @example
 * const deletedCount = await deleteScan('60c72b2f9b1d4b0017c4c1e8');
 * console.log(deletedCount); // 1 if a document was deleted, 0 otherwise.
 */
async function deleteScan(scanRequestId) {
  try {

    const request_collection = db.collection("scan_requests");

    // Attempt to delete the document
    const del = await request_collection.deleteOne({
      _id: new ObjectId(scanRequestId),
    });

    // Return the number of documents deleted (either 0 or 1)
    return del.deletedCount;
  } catch (err) {
    console.error("Error during deletion:", err);
    throw new Error("Failed to delete scan request");
  }
}

async function countBy(query = {}) {
  console.log("Counting scan requests with query", JSON.stringify(query));
  const request_collection = db.collection("scan_requests");

  return await request_collection.countDocuments(query);
}

/**
 * Deletes multiple scan requests from the 'scan_requests' collection in the db.
 *
 * This function connects to the database and attempts to delete multiple scan request documents
 * with the specified scanRequestIds. It returns the number of records deleted.
 *
 * @async
 * @function deleteMultipleScans
 *
 * @param {string[]} scanRequestIds - An array of unique IDs of the scan requests to be deleted.
 *
 * @returns {Promise<number>} The number of records deleted.
 *
 * @throws Will throw an error if the database connection fails or the deletion operation fails.
 *
 * @example
 * const deletedCount = await deleteMultipleScans(['60c72b2f9b1d4b0017c4c1e8', '60c72b2f9b1d4b0017c4c1e9']);
 * console.log(deletedCount); // Number of documents deleted.
 */
async function deleteMultipleScans(scanRequestIds) {
  try {

    const request_collection = db.collection("scan_requests");

    // Convert the array of scanRequestIds to ObjectId format
    const objectIds = scanRequestIds.map((id) => new ObjectId(id));

    // Use deleteMany to remove all documents with the matching _id fields
    const deleteResult = await request_collection.deleteMany({
      _id: { $in: objectIds },
    });

    // Return the number of deleted documents
    return deleteResult.deletedCount;
  } catch (err) {
    console.error("Error during deletion of multiple scans:", err);
    throw new Error("Failed to delete multiple scan requests");
  }
}

/**
 * Delete multiple scans by query
 * @param {*} query
 * @returns {Promise<number>} The number of records deleted.
 * @throws Will throw an error if the database connection fails or the deletion operation fails.
 * @example
 * const deletedCount = await deleteScansBy({ status: "Complete" });
 * console.log(deletedCount); // Number of documents deleted.
 *
*/

async function deleteScansBy(query) {
  console.log("Deleting scans with query", JSON.stringify(query));
  try {

    const request_collection = db.collection("scan_requests");
    const result_collection = db.collection("scan_results");
    const scan_schedule_collection = db.collection("scan_schedule");

    // get items to delete. incldue _id field only
    const scansToDelete = await request_collection.find(query, {
      projection: {
        _id: 1,
      }
    }).toArray();

    // get ids of scans to delete, string conversion is not needed as scanRequestId is stored as ObjectId in collection
    const scanIdsToDelete = scansToDelete.map(scan => scan._id);
    // delete all scan schedules for these scans
    await scan_schedule_collection.deleteMany({ scanRequestId: { $in: scanIdsToDelete } });
    // delete all scan results for these scans
    await result_collection.deleteMany({ scanRequestId: { $in: scanIdsToDelete } });
    // finally, delete scans
    const deleteResult = await request_collection.deleteMany(query);
    // Return the number of deleted documents
    return deleteResult.deletedCount;
  } catch (err) {
    console.error("Error during deletion of multiple scans:", err);
    throw new Error("Failed to delete multiple scan requests");
  }
}

/**
 * Store scheduled scan in scheduled_scan collection
 * @param {*} scanRequestId id of scan scheduled
 * @param {*} scheduledTime time to run scan
 * @returns
 */
async function scheduleScan(scanRequestId, scheduledTime, authorId) {
  const time = new Date(scheduledTime);

  // connect to scan schedule database
  const schedule_collection = db.collection("scan_schedule");

  // check if scan already scheduled
  console.log("scanRequestId in schedule creation", scanRequestId);
  const existingRecord = await schedule_collection.findOne({ scanRequestId });
  var id_to_return;

  if (existingRecord) {
    // Update the existing record with the new time
    console.log("existing record in schedule", existingRecord);
    const updatedRecord = await schedule_collection.findOneAndUpdate(
      { _id: existingRecord._id },
      { $set: { formattedTime: time.toLocaleString() } },
      { returnOriginal: false }
    );
    console.log("updated record in schedule", updatedRecord);
    id_to_return = updatedRecord._id;
  } else {
    // Insert a new record
    const record = { scanRequestId, formattedTime: time.toLocaleString(), authorId };
    const insert = await schedule_collection.insertOne(record);
    id_to_return = insert.insertedId;
  }

  try {
    await completeScheduleRequest(scanRequestId, scheduledTime);
    return id_to_return;
  } catch (error) {
    console.error("Error updating scan request:", error);
    return { error: "Error updating scan request" };
  }
}

async function deleteScanSchedulesBy(query) {
  console.log("Deleting scan schedules with query", JSON.stringify(query));
  const schedule_collection = db.collection("scan_schedule");
  return await schedule_collection.deleteMany(query);
}

/**
 * Helper function to scheduleScan, update schedule time in scan_requests
 * @param {*} id
 * @param {*} date_scheduled
 */
async function completeScheduleRequest(id, date_scheduled) {
  try {

    const request_collection = db.collection("scan_requests");
    const update = await request_collection.updateOne(
      { _id: id },
      {
        $set: {
          scheduled_time: date_scheduled,
        },
      }
    );
    // console.log(update.modifiedCount)

    if (update.matchedCount === 1 || update.modifiedCount === 1) {
      console.log(
        `Scan request with ID ${id} updated successfully to be scheduled on ${date_scheduled}.`
      );
    } else {
      console.log(`Scan request with ID ${id} not found or not updated.`);
    }
  } catch (error) {
    console.error("Error updating scan request:", error);
  }
}

/**
 * Retrieves all scheduled scans that are due to be run at or earlier than the current time from the db.
 *
 * @returns {Promise<Object[]>} An array of scheduled scan records from the 'scan_schedule' collection.
 *
 * @throws {Error} If database connection fails or query fails.
 */
async function getExpiredScans() {
  try {

    const schedule_collection = db.collection("scan_schedule");
    const request_collection = db.collection("scan_requests");
    const now = new Date();

    // Get all scans in scan_schedule that has a formattedTime at or earlier than current time
    const scheduledScans = await schedule_collection
      .find({ formattedTime: { $lte: now.toLocaleString() } })
      .toArray();

    // Append the device and urls fields to each entry in the scheduledScans array
    for (const scan of scheduledScans) {
      const scanRequest = await request_collection.findOne({ _id: scan.scanRequestId });

      if (scanRequest) {
        scan.urls = scanRequest.urls;
        scan.device = scanRequest.device;
      }
    }

    return scheduledScans;
  } catch (error) {
    console.error("Error running scheduled scans:", error);
  }
}

async function updateExpiredScan(scan) {
  try {

    const schedule_collection = db.collection("scan_schedule");
    const scan_collection = db.collection("scan_requests");
    const scanRequestId = scan.scanRequestId;
    console.log("Updating expired scan:", scanRequestId);

    // Remove the scheduled_time attribute from scan_requests
    await scan_collection.updateOne(
      { _id: scanRequestId },
      { $unset: { scheduled_time: "" } }
    );

    // Delete this scan from scan_schedule
    await schedule_collection.deleteOne({ scanRequestId });
  } catch (error) {
    console.error("Error running scheduled scans:", error);
  }
}

module.exports = {
  countBy,
  createScanRequest,
  completeScanRequest,
  saveScanResults,
  getScanResults,
  getScanResultsBy,
  editScan,
  editScanBy,
  deleteScan,
  deleteMultipleScans,
  deleteScansBy,
  deleteScanSchedulesBy,
  getURLs,
  getScanRequest,
  getScanRequestsBy,
  getScanRequestById,
  getRequest,
  deleteMultipleScans,
  scheduleScan,
  getExpiredScans,
  updateExpiredScan
};
