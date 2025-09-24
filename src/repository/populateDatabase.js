const puppeteer = require('puppeteer');
const { client } = require('../dao/database');

const db = client.db();

// Define a constant for the MongoDB collection name to be used.
const COLLECTION_NAME = 'rules';


rule_ids = [
  "area-alt",
  "aria-allowed-attr",
  "aria-braille-equivalent",
  "aria-command-name",
  "aria-conditional-attr",
  "aria-deprecated-role",
  "aria-hidden-body",
  "aria-hidden-focus",
  "aria-input-field-name",
  "aria-meter-name",
  "aria-progressbar-name",
  "aria-prohibited-attr",
  "aria-required-attr",
  "aria-required-children",
  "aria-required-parent",
  "aria-roles",
  "aria-toggle-field-name",
  "aria-tooltip-name",
  "aria-valid-attr-value",
  "aria-valid-attr",
  "blink",
  "button-name",
  "bypass",
  "color-contrast",
  "definition-list",
  "dlitem",
  "document-title",
  "duplicate-id-aria",
  "form-field-multiple-labels",
  "frame-focusable-content",
  "frame-title-unique",
  "frame-title",
  "html-has-lang",
  "html-lang-valid",
  "html-xml-lang-mismatch",
  "image-alt",
  "input-button-name",
  "input-image-alt",
  "label",
  "link-in-text-block",
  "link-name",
  "list",
  "listitem",
  "marquee",
  "meta-refresh",
  "meta-viewport",
  "nested-interactive",
  "no-autoplay-audio",
  "object-alt",
  "role-img-alt",
  "scrollable-region-focusable",
  "select-name",
  "server-side-image-map",
  "svg-img-alt",
  "td-headers-attr",
  "th-has-data-cells",
  "valid-lang",
  "video-caption"
];
base_url = "https://dequeuniversity.com/rules/axe/4.8/";

async function scrapeAccessibilityInfo(url) {
  console.log(url);
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

async function processRules() {
  let i = 0;
  while (i < rule_ids.length) {
    url = base_url + rule_ids[i];
    const { disabilitiesAffected, howToFix, successCriteria, whyItMatters } = await scrapeAccessibilityInfo(url);
    rule = {
      "ruleId": rule_ids[i],
      "disabilitiesAffected": disabilitiesAffected,
      "whyItMatters": whyItMatters,
      "howToFix": howToFix,
      "successCriteria": [successCriteria]
    };
    await updateOrInsertRule(rule);
    i++;
  }

  console.log("All rules processed successfully");
}

async function updateOrInsertRule(rule) {
  const collection = db.collection(COLLECTION_NAME);

  const filter = { ruleId: rule.ruleId };
  const update = {
    $set: {
      disabilitiesAffected: rule.disabilitiesAffected,
      whyItMatters: rule.whyItMatters,
      howToFix: rule.howToFix,
      successCriteria: rule.successCriteria
    }
  };
  const options = { returnOriginal: false, upsert: true }; // Return the updated document instead of the original, create if not exists

  try {
    const result = await collection.findOneAndUpdate(filter, update, options);
    console.log('Updated document:', result.ruleId); // `result` contains the document after update if `returnOriginal` is false
  } catch (error) {
    console.error('Error updating document:', error);
  }
}

async function main() {

  await processRules();
}
main().catch(console.error);
