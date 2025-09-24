const { AxePuppeteer } = require("@axe-core/puppeteer");
const puppeteer = require("puppeteer");

const ScansRepo = require("../repository/ScansRepo");
const { request } = require("express");
const { countSlashes } = require("./ScanServiceHelpers");

// Sample step object that the JSON body request should follow
const sampleSteps = [
  {
    url: "url for auth params", // 1. if url = expected, go to auth params
    depth: "", // the url scanned should be on this depth
    type: "button", // Other possibilities: Input, Select, Button, Span, Div, Form
    findBy: "xpath",
    elementInput: "",
    findValue: "//*[@id='main-menu']/li[6]",
    stepAction: "click", // Other possibilities: inputText, click, selectValue, navigate, submit
    waitTime: 10, // In seconds
    runScan: true, // greyed out
    isActive: true,
    notes: "",
  },
];

async function getSteps() {
  const results = await StepsRepo.getSteps();
  return results;
}

async function runSteps(page, steps) {
  for (const step of steps) {
    console.log("-------------------------------------------------\n")
    console.log(`step.url: `, step.url)
    console.log(`page.url(): `, page.url())

    //Commented by Aman
    // if (page.url() === step.url) {
    //   if (step.isActive) {
    //     try {
    //       await performStep(step, page);
    //     } catch (error) {
    //       throw new Error(error);
    //     }
    //   }
    // }
    //Commented by Aman

    //Added by Aman//

      if (step.isActive) {
    try {
      if (page.url() !== step.url) {
        console.log(`Navigating to: ${step.url}`);
        await page.goto(step.url, { waitUntil: "domcontentloaded" });
      }

      //Added by Aman
      console.log("💡 typeof page:", typeof page);
      console.log("💡 page.$x available?", typeof page.$x );
      //Added by Aman
      await performStep(step, page);
    } catch (error) {
      throw new Error(error);
    }
  }

  //Added by Aman

  }
  console.log("-------------------------------------------------\n")
  console.log("Current page URL: ", page.url());
  console.log("All steps executed");
}

async function performStep(step, page) {
  // Set time limit for the actions on the page for each step
  page.setDefaultNavigationTimeout(step.waitTime * 1000);
  // findValue: the value of the element to search for in order to click/input it (e.g. username, email, submit)
  // elemInput: the data we want to input or select
  try {
    switch (step.stepAction) {
      //Commented by Aman//
      // case "Click":
      //   selector = await getSelector(page, step.findBy, step.findValue);
      //   await selector.click();
      //   await page.waitForNavigation({ waitUntil: "networkidle2" });
      //   console.log(`${step.findValue} clicked`);
      //   break;
      //Commented by Aman//
      // Added by Aman
case "Click":
  const element = await getSelector(page, step.findBy, step.findValue);
  
  // Manually trigger form submit if inside form
  const submitted = await page.evaluate((el) => {
    let form = el.closest('form');
    if (form) {
      form.submit();
      return true;
    } else {
      el.click();
      return false;
    }
  }, element);

  // await page.screenshot({ path: 'post-login.png', fullPage: true });
  // console.log("📸 Screenshot captured after login attempt");

  // Wait for change
  try {
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: step.waitTime * 1000 });
    await page.screenshot({ path: 'post-login.png', fullPage: true });
    console.log("📸 Screenshot captured after login attempt");
    console.log("✅ Navigation detected after form submission.");
  } catch (err) {
    console.warn("⚠️ No navigation detected.");
  }

  // Optional: Check for login failure message
  const errorText = await page.$eval('.messages--error', el => el.innerText).catch(() => '');
  if (errorText) {
    console.log("❌ Login failed. Error:", errorText);
  }

  break;


    // Added by Aman
  
      case "InputText":
        selector = await getSelector(page, step.findBy, step.findValue);
        // await page.waitForNavigation({ waitUntil: "networkidle2" });  // should be removed since we are not navigating to a new page
        await selector.type(String(step.elemInput)); // type step.elemInput into the input field
        console.log(`${step.elemInput} inputted`);

        break;
  
      case "SelectValue":
        await performSelect(page, step.findBy, step.findValue, step.elemInput);
        // await page.waitForNavigation({ waitUntil: "networkidle2" });  // should be removed since we are not navigating to a new page
        console.log(`${step.elemInput} selected`);
        break;
  
        case "Navigate":
          await page.goto(step.findValue, { waitUntil: "networkidle2" });
          console.log(`Navigated to ${step.findValue}`);
          break;
  
      default:
        throw new Error("Element type not found");
    }
  } catch (error) {
    console.error(`Error performing step: ${step.stepAction}, Error: ${error.message}`);
    throw error;
  }
  // Reset time limit
  page.setDefaultNavigationTimeout(0);
}

// Returns a selector object so that Puppeteer can perform an action on it
async function getSelector(page, selectorType, selectorValue) {
  try {
    switch (selectorType) { // find by 

      //Commented by Aman
      // case "XPath":
      //   await page.waitForXPath(selectorValue);
      //   const elementXPath = await page.$x(selectorValue);
      //   return elementXPath[0];

      // Commented by aman
      //Added By Aman
      case "XPath":
      let elementXPath;

      if (typeof page.$x === "function") {
        [elementXPath] = await page.$x(selectorValue);
      } else {
        elementXPath = await page.evaluateHandle((xpath) => {
          return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        }, selectorValue);
        elementXPath = elementXPath.asElement(); // ensure it's treated like an ElementHandle
      }

      if (!elementXPath) {
        throw new Error(`XPath not found: ${selectorValue}`);
      }
      console.log(`Found element with XPath '${selectorValue}'`);
      return elementXPath;

      // Added  by Aman

      case "Id":
        const formattedId = formatId(selectorValue);
        const elementId = await page.waitForSelector(formattedId);
        console.log(`Found element with id '${selectorValue}'`);
        return elementId;

      case "Name":
        const formattedName = formatName(selectorValue);
        const elementName = await page.waitForSelector(formattedName);
        console.log(`Found element with name '${selectorValue}'`);
        return elementName;

      case "ClassName":
        const formattedClassName = formatClassName(selectorValue);
        const elementClassName = await page.waitForSelector(formattedClassName);
        console.log(`Found element with class '${selectorValue}'`);
        return elementClassName;

      case "TagName":
        const elementTagName = await page.waitForSelector(selectorValue); // Tag name can be used directly
        console.log(`Found element with tag name '${selectorValue}'`);
        return elementTagName;

      case "CssSelector":
        const elementCSSSelector = await page.waitForSelector(selectorValue); // CSS selector can be used directly
        console.log(`Found element with CSS selector '${selectorValue}'`);
        return elementCSSSelector;

      default:
        throw new Error(`Unsupported selector type: ${selectorType}`);
    }
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error(`Timeout waiting for selector: ${selectorValue}`);
    } else {
      throw new Error(
        `Error with selector: ${selectorValue}, ${error.message}`,
      );
    }
  }
}

async function performSelect(page, selectorType, selectorValue, selectOption) {
  switch (selectorType) {
    case "Id":
      const formattedId = formatId(selectorValue);
      await page.select(formattedId, selectOption);
      break;

    case "Name":
      const formattedName = formatName(selectorValue);
      await page.select(formattedName, selectOption);
      break;

    case "ClassName":
      const formattedClassName = formatClassName(selectorValue);
      await page.select(formattedClassName, selectOption);
      break;

    case "TagName":
      await page.select(selectorValue, selectOption);
      break;

    case "XPath":
      const [elementHandle] = await page.$x(selectorValue);
      if (elementHandle) {
        await page.evaluate(
          (el, value) => (el.value = value),
          elementHandle,
          selectOption,
        );
      }
      break;

    case "CssSelector":
      await page.select(selectorValue, selectOption);
      break;

    default:
      throw new Error(`Unsupported selector type: ${selectorType}`);
  }
}

function formatName(name) {
  const formattedString = `[name="${name}"]`;
  return formattedString;
}

function formatId(id) {
  const formattedString = `#${id}`;
  return formattedString;
}

function formatClassName(className) {
  return `.${className}`;
}



module.exports = { getSteps, runSteps };
