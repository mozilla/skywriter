"export package main";

var didRun = false;
var bespin = require("bespin:package");
var view = require("view");

main = function() {
    if (didRun) {
        return;
    }
    didRun = true;
    
    // TODO this is a temporary hack. Remove this once the bootstrap sequence 
    // for Tiki is straightened out
    SC._didBecomeReady();
    
    console.log("In main now!");
    bespin.subscribe("foo:bar", function() {
        console.log("Got my foobar");
    });
    
    bespin.publish("foo:bar", {});
    view.app.getPath("mainPage.mainPane").append();
};
