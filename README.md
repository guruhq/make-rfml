# make-rfml
`make-rfml` is a utility that turns JavaScript code into [Rainforest](https://rainforestqa.com/) UI tests. The JS code is converted to RFML files, which is Rainforest's text file format that can be used with their [DevX](https://help.rainforestqa.com/developer-tools/cli-docs/developer-experience) CLI tool to push your changes to Rainforest.

## How to use it
To install, run this:
```
npm install -g https://github.com/guruhq/make-rfml.git
```
Then to build tests, run this command:
```
make-rfml my-tests.js
```
This assumes you have a file called `my-tests.js` which contains your test cases. Each test case in that file will be converted to an `.rfml` file and written to an output folder. You can then use [Rainforest's CLI](https://help.rainforestqa.com/developer-tools/cli-docs/developer-experience) to upload the tests:
```
rainforest upload output/*.rfml
```
You can check out the demo folder in this repo for some examples. If you clone this repo you can run `make-rfml` on the examples here to see how it works.

## Why to use it
Writing test cases as JS code means you can leverage functions, variables, and if statements to avoid repetition as much as possible. Rainforest lets you use stubs (embedding one test inside another) but you'll likely end up with a lot of very similar stubs.

Think about a feature like search. If tests always have users search for the same exact thing then you only need one stub, but if some tests have you search for "this" and some have you search for "that", now you've got two stubs. You may also have different questions that follow the search --- are there any results at all? is there a result matching a specific name? is there a specific number of results? Now you'll need stubs for all different combinations of inputs and outputs.

Instead you can write this as JS code:

```
function search(input, result) {
    step(`Click on the search bar at the top, type "${input}" and press Enter.
          Do you see a result called "${result}"?`);
}
```

That covers all possible searches that check for a specific result. If you want to also consider checking for a number of results, we can modify this same function:

```
function search(input, result, number) {
    step.instruction(`Click on the search bar at the top, type "${input}" and press Enter.`);
    if (result) {
        step.question(`Do you see a result called "${result}"?`);
    } else {
        step.question(`Do you see exactly ${number} results?`);
    }
}
```

When your application changes and search doesn't behave the same way, this function is the only thing you need to update.
