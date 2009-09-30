(function() {
    // -- Load Script
    var loadScript = function(src, onload) {
        var embedscript = document.createElement("script");
        embedscript.type = "text/javascript";
        embedscript.src = src;
        embedscript.onload = onload;
        document.getElementsByTagName("head")[0].appendChild(embedscript);
    };
    // -- If Dojo hasn't been installed yet, get to it
    if (typeof window.dojo == "undefined") {
        loadScript("../../js/dojo/dojo.js", function() {
            dojo.require("bespin.editor.component");
        });
    } else {
        // -- Load up the embeddable editor component
        dojo.require("bespin.editor.component");
    }
})();