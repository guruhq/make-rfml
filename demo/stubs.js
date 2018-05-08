const { step, } = global;

exports.signIn = function(username, password) {
  username = username || "{random.email}";
  password = password || "{random.password}";
  step(`Click on the "login" button.
        Do you see input fields for username and password?`);
  step(`Enter "${username}" as the username and "${password}" as the password and click Submit.
        Do you see a banner that says "Welcome"?`);
};