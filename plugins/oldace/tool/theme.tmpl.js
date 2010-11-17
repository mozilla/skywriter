require.def("ace/theme/%name%",
    ["ace/lib/dom"], function(domMod) {

    var cssText = %css%;
    
    // import CSS once
    domMod.dom.importCssString(cssText);
    
    return {
        cssClass: "%cssClass%"
    };
})