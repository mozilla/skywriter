"export package main";

var didRun = false;
var bespin = require("bespin:package");

main = function() {
    if (didRun) {
        return;
    }
    didRun = true;
    
    console.log("In main now!");
    bespin.subscribe("foo:bar", function() {
        console.log("Got my foobar");
    });
    
    bespin.publish("foo:bar", {});
};
