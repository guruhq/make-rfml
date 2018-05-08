const { makeTest, step } = global;

makeTest("basic-test", function() {
  // title: basic test case with no stubs
  // tags: login
  step(`Click on the "login" button.
        Do you see input fields for username and password?`);
  step(`Enter "{random.email}" as the username and "{random.password}" as the password and click Submit.
        Do you see a banner that says "Welcome"?`);
});
