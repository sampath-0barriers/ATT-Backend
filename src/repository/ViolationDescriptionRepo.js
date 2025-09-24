const { client } = require('../dao/database');

const db = client.db();

/**
 * Stores custom violation descriptions for a specific admin
 * @param {string} authorId - The admin's user ID
 * @param {Object} descriptions - Object mapping violation IDs to new descriptions
 */
async function storeCustomDescriptions(authorId, descriptions) {
    const customDescriptions = db.collection('custom_violation_descriptions');

    // Upsert the custom descriptions for this admin
    await customDescriptions.updateOne(
        { authorId },
        {
            $set: {
                descriptions: descriptions,
                lastUpdated: new Date()
            }
        },
        { upsert: true }
    );
}

/**
 * Gets custom violation descriptions for a specific admin
 * @param {string} authorId - The admin's user ID
 * @returns {Object} - Mapping of violation IDs to custom descriptions
 */
async function getCustomDescriptions(authorId) {
    const customDescriptions = db.collection('custom_violation_descriptions');

    const result = await customDescriptions.findOne({ authorId });
    return result ? result.descriptions : {};
}

/**
 * Updates scan results with custom descriptions for a specific admin
 * @param {Array} results - The original scan results
 * @param {string} authorId - The admin's user ID
 * @returns {Promise<Array>} - Updated scan results with custom descriptions
 */
async function applyCustomDescriptions(results, authorId) {
    const customDescriptions = await getCustomDescriptions(authorId);

    // If no custom descriptions exist for this admin, return original results
    if (!customDescriptions || Object.keys(customDescriptions).length === 0) {
        return results;
    }

    // Deep clone the results to avoid modifying the original
    const updatedResults = JSON.parse(JSON.stringify(results));

    // Update descriptions for each result
    updatedResults.forEach(result => {
        if (result.violations) {
            result.violations.forEach(violation => {
                if (customDescriptions[violation.id]) {
                    violation.description = customDescriptions[violation.id];
                }
            });
        }
    });

    return updatedResults;
}

module.exports = {
    storeCustomDescriptions,
    getCustomDescriptions,
    applyCustomDescriptions
};