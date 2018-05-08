
const fs = require("fs");
const path = require("path");

let config;

try {
  config = require("./rfconfig");
} catch (e) {
  config = {
    "defaultBrowsers": ["chrome"],
    "sites": {}
  };
}

const Q_COLON = /^\s*(q[:.]\s*)+/i;
const SITE_NAMES = Object.keys(config.sites);

// this keeps track of the current test object so calls to `step`
// know what test to associate the instructions with.
var currentTest = {};
var tests = [], testLookupById = {}, testLookupByTitle = {};
var successfulBuild;

/**
 * Convert a short name like "chrome" or "ie10" to the value rainforest expects.
 * @param {String} browser 
 */
function browserLookup(browser) {
  if (/(mac|osx)/i.test(browser)) {
    if (/chrome/i.test(browser)) {
      return "osx_chrome_1440_900";
    } else if (/ff|firefox/i.test(browser)) {
      return "osx_firefox_1440_900";
    }
  }

  if (/android/i.test(browser)) {
    var device = /tablet/i.test(browser) ? "tablet" : "phone";
    var orientation = /landscape/i.test(browser) ? "landscape" : "portrait";
    return "android_" + device + "_" + orientation;
  }

  if (/chrome/i.test(browser)) {
    return "chrome_1440_900";
  } else if (/firefox/i.test(browser)) {
    return "firefox_1440_900";
  } else if (/safari/i.test(browser)) {
    return "safari_1440_900";
  } else if (/ie8/i.test(browser)) {
    return "ie8_1440_900";
  } else if (/ie9/i.test(browser)) {
    return "ie9_1440_900";
  } else if (/ie10/i.test(browser)) {
    return "ie10_1440_900";
  } else if (/ie/i.test(browser)) {
    return "ie11_1440_900";
  } else if (/edge/i.test(browser)) {
    return "windows10_edge";
  }

  return browser;
}

function resolveBrowsers(browsers) {
  return browsers.map(browser => browserLookup(browser));
}

/**
 * Replace references to screenshots by converting `{{file.png}}` to Rainforest's format: `{{file.screenshot(../file.png)}}`
 * @param {String} text 
 */
function fixFiles(text) {
  return text.replace(/{{([^}]+)}}/gi, function(text, filename) {
    if (!filename.includes("/")) { return text; }
    if (/(png|gif|jpg|jpeg)$/i.test(filename)) {
      return "{{file.screenshot(../" + filename + ")}}";
    } else {
      return "{{file.download(../" + filename + ")}}";
    }
  });
}

function formatStep(text) {
  if (Array.isArray(text)) {
    text = text.join(" ");
  }
  return fixFiles(text).replace(/\s+/g, " ").trim();
}

/**
 * convert a test object to an RFML string.
 */
function toRFML(test) {
  var lines = [];

  lines.push("#! " + test.id);
  lines.push("# title: " + test.title);
  lines.push("# site_id: " + test.siteId);
  lines.push("# start_uri: " + test.path);
  lines.push("# tags: " + test.tags.join(", "));
  lines.push("# browsers: " + test.browsers);
  if (test.disabled) {
    lines.push("# state: disabled");
  }
  lines.push("#");
  lines.push("");

  test.steps.forEach(step => {
    lines.push(step.instruction);
    lines.push(step.question);
    lines.push("");
  });
  
  return lines.join("\n");
}

/**
 * takes an anonymous function that calls `step()` to define
 * the steps of the test. calls to `step()` may come from nested
 * calls so code can be reused effectively across tests.
 */
function makeTest(id, func) {
  if (!id || typeof id !== "string") {
    throw "test case is missing an ID";
  }

  if (testLookupById.hasOwnProperty(id)) {
    throw "duplicate test ID: " + id;
  }

  currentTest = {
    id: id,
    steps: [],
    title: "unnamed test",
    browsers: [],
    tags: []
  };

  testLookupById[id] = currentTest;

  // the function should contain comments that define the title
  // and tags for the test, so we need to extract those.
  var settings = {};
  func.toString().replace(/\n\s*\/\/\s*(([^:\n\r]+):\s*(.*)|([^:\n\r]*))/g, function(line, pair, name, value, single) {
    if (single) {
      settings[single.trim()] = true;
    } else {
      settings[name] = value.trim().split(/,\s*/);
    }
  });

  currentTest.tags = settings.tags || [];
  currentTest.browsers = resolveBrowsers(settings.browser || settings.browsers || config.defaultBrowsers || ["chrome"]);
  currentTest.path = settings.path || "/";
  currentTest.disabled = settings.disabled || false;
  currentTest.siteId = settings.site_id;
  currentTest.title = (settings.title && settings.title.join(", ")) || "unnamed test";

  // some tags are added as suffixes onto the end of the test's title.
  if (config.tagsAsSuffix) {
    var tags = currentTest.tags.filter(tag => config.tagsAsSuffix.includes(tag));

    if (tags.length) {
      currentTest.title += " (" + tags.join("/") + ")";
    }
  }

  if (testLookupByTitle.hasOwnProperty(currentTest.title)) {
    throw "duplicate test title: " + currentTest.title;
  }
  testLookupByTitle[currentTest.title] = currentTest;

  // infer the site_id based on what tags the test has.
  if (!currentTest.siteId && config.sites) {
    for (var site in config.sites) {
      if (currentTest.tags.includes(site)) {
        currentTest.siteId = config.sites[site].site_id;
        break;
      }
    }
  }

  // the config file has a list of tags that should be added to all tests.
  if (config.addTags) {
    config.addTags.forEach(tag => {
      if (!currentTest.tags.includes(tag)) {
        currentTest.tags.push(tag);
      }
    });
  }  

  try {
    func();
    
    // check/normalize all the steps.
    currentTest.steps.forEach(step => {
      // insert a space when questions end with quoted terms.
      // Do you see "DELETE"?  =>  Do you see "DELETE" ?
      step.question = formatStep(step.question).replace(/"\?$/, "\" ?");
      step.instruction = formatStep(step.instruction);

      if (!/\?$/.test(step.question)) {
        throw currentTest.id + ": question does not end with a question mark: " + step.question;
      }
    });

    tests.push(currentTest);
  } catch (err) {
    console.error(currentTest.id + ": " + err);
    successfulBuild = false;
  }

  return currentTest;
}

/**
 * Adds a step to the current test. The argument is a single string that contains both the instruction and the question.
 * The question is assumed to be the last line of the string. If a line starts with "Q:" then that starts the question so you can have multiline questions.
 * 
 * ```
 * step(`Click on the "Save" button.
 *   Q: Do you see a popup warning you that changes won't
 *      be published until they've been approved?`);
 * step(`Click on the "Ok" button.
 *      Did the popup disappear`);
 * ```
 */
function step(text) {
  var lines = text.trim().split("\n");
  var questionIndex = lines.findIndex(line => Q_COLON.test(line));
  questionIndex = (questionIndex >= 0) ? questionIndex : lines.length - 1;
  
  for (var i = 0; i < lines.length; i++) {
    if (Q_COLON.test(lines[i])) {
      lines[i] = lines[i].replace(Q_COLON, "");
      questionIndex = i;
    }
  }

  var instruction = lines.slice(0, questionIndex).join(" ");
  var question = lines.slice(questionIndex).join(" ");
  currentTest.steps.push({instruction, question});
}

/**
 * Adds to the instruction part of a step. If you call `step()` then `step.instruction()`,
 * it'll make a second step and set its instruction. If you call it agian, it'll append
 * to the second step's question.
 * 
 * This is useful when the same instruction may be followed by different questions based
 * on the value of some variable. You don't have to repeat the instruction in each place
 * or create a temporary variable and dynamically set the 'question' string.
 * 
 * @param {String} instruction
 */
step.instruction = function(instruction) {
  // if there are no steps or the previous step has a question, insert a new one.
  // append to the instruction for the latest question.
  var last = currentTest.steps[currentTest.steps.length - 1];
  if (!last || last.question) {
    currentTest.steps.push(last = {instruction: "", question: ""});
  }
  last.instruction += " " + instruction;
};

/**
 * Sets the question for a step that was started by calling `step.instruction()`.
 * If no step was started or if the current step has a question, this'll throw an
 * error.
 * 
 * @param {String} question 
 */
step.question = function(question) {
  // if there are no steps or the previous step doesn't have an instruction, error out.
  // append to the question for the last question.
  var last = currentTest.steps[currentTest.steps.length - 1];
  if (!last) {
    throw "there are no steps to add a question to";
  } else if (!last.instruction) {
    throw "can't add a question until the step has an instruction.";
  } else if (last.question) {
    throw "the last step already has a question.";
  }

  last.question += question.replace(Q_COLON, "");
};

function hasBrowser(browser) {
  if (!currentTest || !currentTest.browsers) {
    return false;
  }

  return currentTest.browsers.join(" ").includes(browser);
}

function hasTag(tag) {
  if (!currentTest || !currentTest.tags) {
    return false;
  }

  return currentTest.tags.includes(tag);
}

function saveTests(dir="output") {
  tests.forEach(function(test) {
    var filename = path.join(dir, test.id + ".rfml");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFile(filename, toRFML(test), function(err) {
      if (err) {
        return console.log(err);
      }
      // this output is needed so we can pipe the list of filenames to the upload script.
      console.log(filename);
    });
  });
}

function buildFiles(files) {
  var successfulBuild = true;

  files.forEach(function(file) {
    // requiring the file will make it register its test cases.
    try {
      // eslint-disable-next-line import/no-dynamic-require
      require(file);
    } catch (err) {
      console.error(err);
      successfulBuild = false;
    }
  });

  return successfulBuild;
}

function getConfig() {
  return config;
}

// these are exports because they're used in index.js.
exports.saveTests = saveTests;
exports.buildFiles = buildFiles;
exports.getConfig = getConfig;

// these are global because they will be used by test cases.
global.makeTest = makeTest;
global.step = step;
global.hasBrowser = hasBrowser;
global.hasTag = hasTag;
