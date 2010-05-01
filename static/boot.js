bespin.tiki.require.ensurePackage("::bespin", function() {
    var require = bespin.tiki.require;
    var plugins = require("bespin:plugins");
    var pr = plugins.catalog.loadMetadataFromURL("plugin/register/defaults");
    pr.then(function() {
        console.log("metadata loaded. woot!");
    }, function(error) {
        console.log("Unable to load metadata: ", error);
    });
});
