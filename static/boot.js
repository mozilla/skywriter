// Load up Bespin's boot code (the plugin system, basically)
bespin.tiki.require.ensurePackage("::bespin", function() {
    var require = bespin.tiki.require;
    var plugins = require("bespin:plugins");
    var pr = plugins.catalog.loadMetadataFromURL("plugin/register/defaults");
    pr.then(function() {
        // The "hosted" plugin sets up the environment
        bespin.tiki.require.ensurePackage("::hosted", function() {
            require("hosted");
        });
    }, function(error) {
        console.log("Unable to load metadata: ", error);
    });
});
