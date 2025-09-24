
const puppeteer = require('puppeteer');
const { getResults } = require('./ScansService');


// Assume these utilities are implemented to generate reports in various formats
const htmlReportGenerator = require('../utils/htmlReportGenerator.js');
const csvReportGenerator = require('../utils/csvReportGenerator');
const pdfReportGenerator = require('../utils/pdfReportGenerator');
const RulesRepo = require("../repository/RulesRepo");
const AuditsRepo = require("../repository/AuditRepo.js");
const ViolationDescriptionRepo = require('../repository/ViolationDescriptionRepo');

/**
 * Generates a report for accessibility scan results in the specified format. It retrieves the scan results
 * using the provided scan request ID, cleans and processes these results, and then generates a report in
 * the desired format (HTML, CSV, or PDF).
 *
 * @param {string} scanRequestId - The unique identifier for the scan request whose results will be used to generate the report.
 * @param {string} format - The desired format of the report ('html', 'csv', or 'pdf').
 * @returns {Promise<Object>} The generated report data in the specified format. The exact structure of this data
 *                            depends on the report format.
 */
async function generateReport(scanRequestId, format, authorId) {
  try {
    // Retrieve scan results for the given ID from the ScansService.
    const scanResults = await getResults(scanRequestId);

    // Throw an error if no results were found for the provided scan request ID.
    if (!scanResults || scanResults.length === 0) {
      throw new Error("No scan results found for the provided scanRequestId.");
    }
    console.log("Cleaning and analysing data");

    // Initialize a variable to hold the data for the report.
    let reportData;
    // Clean and process the scan results to prepare them for report generation.
    const cleanedData = await cleanData(scanResults, authorId);

    // Generate the report in the requested format using the appropriate generator.
    switch (format.toLowerCase()) {
      case 'html':
        // Generate an HTML report using the original scan results.
        console.log("Generating HTML report");
        reportData = await htmlReportGenerator.generate(cleanedData);
        break;
      case 'csv':
        // Generate a CSV report using the original scan results.
        console.log("Generating CSV report");
        reportData = await csvReportGenerator.generate(cleanedData);
        break;
      case 'pdf':
        // Generate a PDF report using the cleaned and processed data.
        console.log("Generating PDF report");
        reportData = await pdfReportGenerator.generate(cleanedData);
        break;
      default:
        // Throw an error if the requested report format is unsupported.
        throw new Error(`Unsupported report format: ${format}`);
    }

    // Return the generated report data.
    console.log("Report generated successfully!");
    return reportData;

  } catch (error) {
    // Log and rethrow any errors encountered during report generation.
    console.error("Error generating report:", error);
    throw error;
  }
}


/**
 * Processes and enriches scan results with detailed accessibility violation information.
 * It filters the results for the latest scan, calculates the average score of these results,
 * enriches each violation with details such as which disabilities are affected, why it matters,
 * how to fix it, and the success criteria. It also computes statistics about the impact of violations
 * and organizes data for table presentation.
 * 
 * @param {Array} scanResults - An array of scan result objects, each containing a timestamp, score, and violations.
 * @returns {Object} An object containing the average score of the latest scan results, detailed information
 * about each violation, statistics on the impact of these violations, and data organized for table presentation.
 */
async function cleanData(scanResults, authorId) {
  // Step 1: Group entries by URL.
  const groupedByUrl = scanResults.reduce((acc, obj) => {
    if (!acc[obj.url]) {
      acc[obj.url] = [];
    }
    acc[obj.url].push(obj);
    return acc;
  }, {});

  // Step 2: Find the maximum timestamp entry for each URL.
  const maxTimestampEntries = Object.values(groupedByUrl).map(entries => {
    // Sort the entries by timestamp in ascending order and take the last one.
    return entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).pop();
  });

  // Step 3: Edit URLs
  const baseUrl = getBaseUrl(maxTimestampEntries[0].url);
  const results = maxTimestampEntries.map(entry => {
    // Use object spread to create a new object, modifying the url property if needed
    return {
      ...entry,
      url: entry.url !== baseUrl ? entry.url.replace(baseUrl, '') : entry.url
    };
  });

  // `results` now contains only the entries with the maximum timestamp for each URL.
  // Calculate the average score of the filtered results, rounded to two decimal places.
  const averageScore = parseFloat((results.reduce((acc, curr) => acc + curr.score, 0) / results.length).toFixed(2));

  // Initialize a Map to store unique violations and their details.
  const violationsMap = new Map();

  // Process each result item to enrich violation details.
  for (const item of results) {
    for (const violation of item.violations) {
      // Check if the violation has already been processed to avoid duplicate work.
      if (!violationsMap.has(violation.id)) {
        try {
          // Attempt to retrieve the rule details from a repository; if unavailable, scrape from the help URL.
          let rule = await RulesRepo.getRule(violation.id);
          if (!rule) {
            // Scrape violation details and create a new rule in the repository.
            const { disabilitiesAffected, howToFix, successCriteria, whyItMatters } = await scrapeAccessibilityInfo(violation.helpUrl);
            rule = {
              "ruleId": violation.id,
              "disabilitiesAffected": disabilitiesAffected,
              "whyItMatters": whyItMatters,
              "howToFix": howToFix,
              "successCriteria": successCriteria
            };
            await RulesRepo.create(rule);
          }
          // Augment the violation object with detailed information.
          violation['disabilities'] = rule.disabilitiesAffected;
          violation['whyItMatters'] = rule.whyItMatters;
          violation['howToFix'] = rule.howToFix;
          violation['successCriteria'] = rule.successCriteria;

          violationsMap.set(violation.id, violation);
        } catch (error) {
          // Handle errors in fetching or scraping violation details.
          console.error(`Error fetching accessibility info for violation ${violation.id}: ${error}`);
          violation['disabilities'] = 'Error fetching data';
        }
      }
    }
  }
  ///////////////////////////////////////////////////////////////////////////
  // CHANGE THE ARGUMENT ONCE AUDIT SCHEMA IS CONNECTED TO REPORTS
  //////////////////////////////////////////////////////////////////////////
  let audit_data = await AuditsRepo.get("");

  // Convert the Map of violations to an array for further processing.
  const violationsObject = Array.from(violationsMap.values());

  // Customize the violation description based on user's custom descriptions
  try {
    const customViolations = await ViolationDescriptionRepo.getCustomDescriptions(authorId);
    violationsObject.forEach(violation => {
      if (customViolations[violation.id]) {
        violation.description = customViolations[violation.id];
      }
    });
  } catch (error) {
    console.error("Error applying custom descriptions:", error);
  }

  // Compute statistics on disabilities affected and the impact of violations.
  const [disabilitiesAffected, impactStats] = await violationsStats(violationsObject);

  // Organize the results and enriched violation data for table presentation.
  const tableData = cleanDataForTable(results);

  // Return the compiled and enriched data.
  return {
    averageScore,
    violations: violationsObject,
    scanResults: results,
    disabilitiesStats: disabilitiesAffected,
    impactStats: impactStats,
    tableData: tableData,
    baseUrl: baseUrl,
    audit: audit_data
  };
}


/**
 * Processes and organizes accessibility data for table display. It extracts unique rule IDs from the data, 
 * maps each rule to the URLs where it was violated, calculates scores based on the number of violations per rule, 
 * and extracts scores for each URL.
 * 
 * @param {Array} data - An array of objects, where each object represents a URL with its associated 
 *                       accessibility violations and potentially other data (like scores).
 * @returns {Object} An object containing structured data for table display, including a list of unique rule IDs, 
 *                   a mapping of rules to URLs where they were violated, a score for each rule based on its occurrence,
 *                   and a list of URLs with their scores.
 */
function cleanDataForTable(data) {

  // Extract unique rule IDs from the violations across all URLs.
  const uniqueRuleIds = [...new Set(data.flatMap(item => item.violations.map(rule => rule.id)))].sort();

  // Create a mapping of each rule ID to the URLs where it was violated.
  const ruleToUrlsMap = uniqueRuleIds.reduce((acc, ruleId) => {
    acc[ruleId] = data.filter(item => item.violations.some(violation => violation.id === ruleId))
      .map(item => item.url);
    return acc;
  }, {});
  let urls = data.map(item => item.url);
  let total = urls.length;

  // Calculate scores for each rule based on the number of URLs violated.
  const scores = uniqueRuleIds.reduce((acc, ruleId) => {
    const violatedUrls = ruleToUrlsMap[ruleId] || [];
    acc[ruleId] = parseFloat((total - violatedUrls.length) * 100 / total).toFixed(0); // The score is the count of violated URLs.
    return acc;

  }, {});

  // Extract scores for each URL, assuming each URL object has a 'score' property.
  const urlScores = data.map(item => ({ url: item.url, score: item.score }));

  // Return the cleaned and structured data.
  return {
    uniqueRuleIds: uniqueRuleIds,
    urls: urls, // List of all URLs in the input data.
    ruleToUrlsMap: ruleToUrlsMap, // Mapping of rule IDs to URLs where they were violated.
    scores: scores, // Scores for each rule based on occurrence across URLs.
    urlScores: urlScores // Scores for each URL.
  };
}



/**
 * Processes a list of accessibility violations to compute statistics about the impact on different disabilities
 * and the severity of the violations. It counts the occurrences of each disability affected by the violations
 * and categorizes the violations by their impact level: serious, critical, or needs review.
 * 
 * @param {Array} violations - An array of violation objects, where each object includes information about
 * the disabilities affected and the impact level of the violation.
 * @returns {Array} An array containing two elements: 
 * 1. An object mapping each disability to the number of times it's affected.
 * 2. An array of objects, each representing a category of violation impact (Critical, Serious, Needs review)
 *    with the corresponding count of violations in each category.
 */
async function violationsStats(violations) {
  // Initializes a Map to keep count of how many times each disability is affected.
  const disabilityCounts = new Map();

  // Initialize counters for each level of impact.
  let serious = 0;
  let review = 0;
  let critical = 0;
  const seriousIds = [];
  const reviewIds = [];
  const criticalIds = [];

  // Iterate over each violation to update disability counts and impact level counts.
  violations.forEach(violation => {
    // If the violation affects any disabilities, count the occurrences of each disability.
    if (violation.disabilities && violation.disabilities.length) {
      violation.disabilities.forEach(disability => {
        // Update the count for this disability, incrementing it if it already exists, or setting it to 1 if it doesn't.
        disabilityCounts.set(disability, (disabilityCounts.get(disability) || 0) + 1);
      });
    }

    // Count the violation based on its impact level.
    if (violation.impact === "serious") {
      serious++;
      seriousIds.push(violation.id);
    } else if (violation.impact == "critical") {
      critical++;
      criticalIds.push(violation.id);
    } else {
      review++;
      reviewIds.push(violation.id);
    }
  });

  // Convert the Map of disability counts to a plain object for easier consumption.
  const disabilityCountsObject = Object.fromEntries(disabilityCounts);

  // Return the disability counts and impact level counts as the function's output.
  return [
    disabilityCountsObject,
    [
      { category: "Critical", value: critical, ids: criticalIds },
      { category: "Serious", value: serious, ids: seriousIds },
      { category: "Needs review", value: review, ids: reviewIds }
    ]
  ];
}


/**
 * Scrapes accessibility information from a specified URL. It gathers data on the disabilities affected by accessibility
 * issues, how to fix these issues, specific success criteria, and the importance of addressing these issues.
 * 
 * @param url - The URL of the page to scrape accessibility information from. This should be a string.
 * @returns - Returns a Promise that resolves to an object containing the scraped information: disabilities affected, 
 * how to fix the issues, success criteria, and why addressing these issues is important.
 */
async function scrapeAccessibilityInfo(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: ["load", "domcontentloaded"], timeout: 0 });


  const disabilitiesAffected = await page.evaluate(() => {
    // Select the container with the class 'disabilityTypesAffectedData'
    // and then get the text from each list item
    const container = document.querySelector('.disabilityTypesAffectedData');
    const listItems = Array.from(container.querySelectorAll('li'));
    return listItems.map(li => li.textContent.trim()); // Getting the text content of each list item
  });

  const howToFix = await page.evaluate(() => {
    // Select the section with the class 'howToFix'
    const section = document.querySelector('section.howToFix');

    // Get all paragraph elements inside the 'howToFixData' container within the section
    const paragraphs = section ? section.querySelectorAll('.howToFixData p') : [];

    // Return the text content of the first two paragraphs, if they exist
    const firstTwoParagraphs = [];
    if (paragraphs.length > 0) firstTwoParagraphs.push(paragraphs[0].innerText.trim());
    if (paragraphs.length > 1) firstTwoParagraphs.push(paragraphs[1].innerText.trim());

    // Join the paragraphs into a single string separated by two newline characters for readability
    return firstTwoParagraphs.join('\n\n');
  });

  const successCriteria = await page.evaluate(() => {
    // Query all divs with the class ".m-card-body.next-card"
    const cardBodies = document.querySelectorAll(".m-card-body.next-card");

    if (cardBodies.length > 1) {
      // Get the second div
      const secondCardBody = cardBodies[1];

      // Now, specifically target the third <ul> within this div
      const uls = secondCardBody.querySelectorAll("ul");
      if (uls.length >= 3) { // Ensure there are at least three <ul> elements
        const thirdUl = uls[2]; // Get the third <ul> (zero-indexed)

        // Find the <li> element that contains the text "4.1.2" within this third <ul>
        const targetLi = thirdUl.querySelector("li");
        return targetLi ? targetLi.textContent.trim() : '';
      }
    }

    // Return an empty string if conditions are not met
    return '';
  });

  const whyItMatters = await page.evaluate(() => {
    // Select the section with the class 'whyImportant'
    const section = document.querySelector('section.whyImportant');

    // Get the first paragraph element inside the 'howToFixData' container within the section
    const paragraph = section ? section.querySelector('.howToFixData p') : null;

    // Return the text content of the first paragraph, if it exists
    return paragraph ? paragraph.innerText.trim() : '';
  });


  await browser.close();
  return {
    disabilitiesAffected,
    howToFix,
    successCriteria,
    whyItMatters
  };
}

// Helper function to get the base URL
function getBaseUrl(url) {
  const urlParts = new URL(url);
  return `${urlParts.protocol}//${urlParts.hostname}`;
}



module.exports = {
  generateReport,
  cleanData,
  cleanDataForTable,
  scrapeAccessibilityInfo,
  getBaseUrl
};