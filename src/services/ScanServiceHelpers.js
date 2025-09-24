const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// Function to fetch the website content
async function getWebsiteContent(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: ["load", "domcontentloaded"], timeout: 0 });
  const websiteContent = await page.content();
  await browser.close();
  return websiteContent;
}

function isSameDomain(baseDomain, url) {
  const urlDomain = new URL(url).hostname;
  const base = new URL(baseDomain).hostname;
  return base === urlDomain;
}

function extractChildURLs(websiteContent, baseUrl) {
  const childURLs = [];
  const $ = cheerio.load(websiteContent);

  $('a').each((index, element) => {
    const href = $(element).attr('href');
    if (href) {
      const absoluteURL = new URL(href, baseUrl).toString();
      childURLs.push(absoluteURL);
    }
  });
  return childURLs;
}

function countSlashes(str) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '/') {
      count++;
    }
  }
  return count;
}

function extractBaseUrl(fullUrl) {
  // Parse the URL
  const parsedUrl = new URL(fullUrl);

  // Construct the base URL
  // return `${parsedUrl.protocol}//${parsedUrl.host}`;
  return parsedUrl.origin;
}

module.exports = {
  extractChildURLs,
  isSameDomain,
  getWebsiteContent,
  countSlashes,
  extractBaseUrl,
};
