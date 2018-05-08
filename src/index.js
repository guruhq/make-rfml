#!/usr/bin/env node

const rfml = require("./rfml");
const uuidv4 = require("uuid/v4");
const path = require("path");

const JS_EXTENSION = /\.js$/i;

function printHelpMessage() {
  console.log("");
  console.log("COMMANDS:");
  console.log("");
  console.log("build <file>   generates RFML files for the input .js file.");
  console.log("               if you omit <file> it builds all tests.");
  console.log("");
  console.log("new            prints sample code for a new test that includes");
  console.log("               the test's UUID.");
  console.log("");
}

function printNewStubs(count, tag) {
  for (let i = 0; i < count; i++) {
    var id = uuidv4();
    console.log(`
makeTest("${id}", function() {
// title: new test ${i + 1}
// tags: ${tag}
});`);
  }
  console.log("");
}

if (require.main === module) {
  if (process.argv.includes("new")) {
    var config = rfml.getConfig();
    var count = parseInt(process.argv[process.argv.length - 1], 10) || 1;
    var tag = Object.keys(config.sites || {})[0] || "none";
    printNewStubs(count, tag);
  } else {
    // see if any input .js files were specified.
    var files = process.argv.slice(2)
      .filter(file => JS_EXTENSION.test(file))
      .map(file => path.resolve("./" + file.replace(JS_EXTENSION, "")));

    // if there are files to build, build them. otherwise print the help message.
    if (files.length) {
      if (!rfml.buildFiles(files)) {
        console.log("no tests were built because errors were encountered.");
      } else {
        rfml.saveTests();
      }
    } else {
      printHelpMessage();
    }
  }
}
