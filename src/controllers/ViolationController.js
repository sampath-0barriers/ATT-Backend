const csv = require('csv-parse');
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const {
    storeCustomDescriptions,
    applyCustomDescriptions,
    getCustomDescriptions: getDescriptions
} = require('../repository/ViolationDescriptionRepo');

/**
 * Handles CSV upload and processes violation description updates
 */
async function uploadViolationDescriptions(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate file type
        if (!req.file.mimetype || !['text/csv', 'application/vnd.ms-excel'].includes(req.file.mimetype)) {
            await promisify(fs.unlink)(req.file.path);
            return res.status(400).json({ error: 'Invalid file type. Please upload a CSV file.' });
        }

        // Read and parse CSV file
        const readFile = promisify(fs.readFile);
        const parseCSV = promisify(csv.parse);

        const fileContent = await readFile(req.file.path);
        let records;
        try {
            records = await parseCSV(fileContent, {
                columns: true,
                skip_empty_lines: true
            });
        } catch (parseError) {
            await promisify(fs.unlink)(req.file.path);
            return res.status(400).json({ error: 'Invalid CSV format. Please check your file.' });
        }

        // Validate CSV structure
        if (!records.length || !records[0].hasOwnProperty('violation_id') || !records[0].hasOwnProperty('new_description')) {
            await promisify(fs.unlink)(req.file.path);
            return res.status(400).json({ error: 'CSV must contain violation_id and new_description columns' });
        }

        // Convert CSV records to description mapping
        const descriptions = {};
        records.forEach(record => {
            if (record.violation_id && record.new_description) {
                descriptions[record.violation_id] = record.new_description;
            }
        });

        if (Object.keys(descriptions).length === 0) {
            await promisify(fs.unlink)(req.file.path);
            return res.status(400).json({ error: 'No valid violation descriptions found in CSV' });
        }

        // Store custom descriptions for this admin
        const userId = req.user._id;
        await storeCustomDescriptions(userId, descriptions);

        // Clean up uploaded file
        await promisify(fs.unlink)(req.file.path);

        res.json({
            message: 'Violation descriptions updated successfully',
            updatedCount: Object.keys(descriptions).length
        });

    } catch (error) {
        console.error('Error processing violation descriptions:', error);
        // Cleanup file if it exists
        if (req.file && req.file.path) {
            try {
                await promisify(fs.unlink)(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        res.status(500).json({ error: 'Failed to process violation descriptions' });
    }
}

/**
 * Middleware to apply custom descriptions to scan results
 */
async function applyCustomViolationDescriptions(req, res, next) {
    try {
        // Check if the response contains scan results
        if (res.locals.scanResults) {
            // Update the results with custom descriptions for this admin
            const updatedResults = await applyCustomDescriptions(
                res.locals.scanResults,
                req.user._id
            );
            res.locals.scanResults = updatedResults;
        }
        next();
    } catch (error) {
        console.error('Error applying custom descriptions:', error);
        next(error);
    }
}

/**
 * Get custom descriptions for the current user
 */
async function getCustomDescriptions(req, res) {
    try {
        const authorId = req.user._id;
        const descriptions = await getDescriptions(authorId);
        res.json(descriptions);
    } catch (error) {
        console.error('Error fetching custom descriptions:', error);
        res.status(500).json({ error: 'Failed to fetch custom descriptions' });
    }
}

module.exports = {
    uploadViolationDescriptions,
    applyCustomViolationDescriptions,
    getCustomDescriptions
};