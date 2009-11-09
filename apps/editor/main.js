"export package main";

var didRun = false;
var bespin = require("bespin:package");
var EditorController = require("bespin:editor/controller").EditorController;
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
    var plugins = require("bespin:plugins");
    var builtins = require("bespin:builtins");
    
    var catalog = plugins.Catalog.create();
    catalog.load(builtins.metadata);
    bespin.register("plugins", catalog);
    
    view.app.getPath("mainPage.mainPane").append();
    
    // TODO: the stuff that follows is messy. in SC terms, an EditorView should actually
    // be created in the mainPane directly via a "design" call, not created by 
    // the controller.
    
    var controller = EditorController.create({ container: view.app.getPath("mainPage.mainPane.layer") });
    bespin.register("editor", controller);
    controller.model.insertDocument("Welcome to Bespin.");
    view.app.getPath("mainPage.mainPane").appendChild(controller.ui);
};
