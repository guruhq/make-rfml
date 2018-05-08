const { makeTest, step } = global;
const stubs = require("./stubs");

// this test calls a stub defined in stubs.js
makeTest("stubs-example-1", function() {
  // title: simple test with one stub
  // tags: login, news-feed
  stubs.signIn();
  step(`Click on the tab that says "News Feed".
        Do you see a box labelled "Test News Item"?`);
});

// if opening the news feed is used throughout this file, we can make
// a function for it here so it can be reused.
// the code below here rewrites the first test using this separate function.
function openNewsFeed() {
  step(`Click on the tab that says "News Feed".
        Do you see a box labelled "Test News Item"?`);
}

makeTest("stubs-example-2", function() {
  // title: simple test with multiple stubs
  // tags: login, news-feed
  stubs.signIn();
  openNewsFeed();
});
