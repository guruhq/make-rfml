const { makeTest, step } = global;
const stubs = require("./stubs");

function search(options) {
  // the step() function adds a full step (instruction *and* question) to the current test.
  // calling step.instruction() begins a new step but just adds the instruction so we can
  // branch and have different possible questions without having to repeat the question.
  step.instruction(`Type "${options.search}" in the search bar and press Enter.`);
  if (options.number) {
    step.question(`Do you see exactly ${options.number} search results?`);
  } else if (options.title) {
    step.question(`Do you see a search result labelled "${options.title}"?`);
  }
}

makeTest("search-example-1", function() {
  // title: search and open something
  // tags: search, view-content
  stubs.signIn();
  search({
    search: "started",
    title: "Getting Started"
  });
  step(`Click on the box that says "Getting Started".
        Do you see a popup that shows the Getting Started article?`);
});

makeTest("search-example-2", function() {
  // title: search and delete something
  // tags: search, delete-content
  stubs.signIn();
  search({
    search: "data",
    number: 3
  });
  step(`Click on the delete icon next to one of the search results.
        Did the result disappear?`);
});
