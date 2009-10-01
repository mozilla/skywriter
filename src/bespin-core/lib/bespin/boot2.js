window.SC = require("sproutcore");
var plugins = require("bespin/plugins");
var builtins = require("bespin/builtins");
var bespin = require("bespin");

var catalog = plugins.Catalog.create();
catalog.activate(builtins.metadata);
bespin.register("plugins", catalog);

var ep = catalog.getExtensionPoint("mypoint");
var ext = ep.extensions[0];
ext.load(function(myfunc) {
    myfunc("yo");
});

/*
var component = re_quire("bespin/editor/component");
var _editorComponent;
_editorComponent = new component.Component('editor', {
    language: "js",
    loadfromdiv: true,
    set: { strictlines: 'off' }
});

function copyToTextarea() {
    dojo.byId('inandout').value = _editorComponent.getContent();
}
function copyToEditor() {
    _editorComponent.setContent(dojo.byId('inandout').value);
}
function setSyntax(value) {
    bespin.publish("settings:language", { language: value });
}
*/