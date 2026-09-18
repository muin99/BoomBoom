// Passenger/cPanel startup file. Keep the application root outside public_html.
process.chdir(__dirname);
require("./dist/main.js");
