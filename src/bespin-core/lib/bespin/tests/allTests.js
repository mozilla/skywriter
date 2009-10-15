var qunit = require("qunit");

qunit.init();


console.log("Starting the test suite");

qunit.test("Sanity", function() {
    qunit.ok(true, "Sanity is not looking good.")
});

qunit.start();