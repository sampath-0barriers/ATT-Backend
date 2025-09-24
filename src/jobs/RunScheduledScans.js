const cron = require('node-cron');
const ScheduledScans = require('../controllers/ScansController');

// Function to schedule and run scans
function runScheduledScans() {
  // runs on every hour. For testing purposes, you can use * * * * * for every minute
  cron.schedule('0 * * * *', async () => {
    console.log("Running scheduled scans...");
    try {
      ScheduledScans.runExpiredScans();
    } catch (error) {
      console.error('Error while running scheduled scans:', error);
    }
  });
}

module.exports = runScheduledScans;
