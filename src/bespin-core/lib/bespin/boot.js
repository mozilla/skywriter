var _editorComponent;

console.log("hi 1");

var component = require("bespin/editor/component");

setTimeout(function() {
    console.log("hi 3");
    _editorComponent = new component.Component('editor', {
        language: "js",
        loadfromdiv: true,
        set: { strictlines: 'off' }
    });
}, 2000);

function copyToTextarea() {
    dojo.byId('inandout').value = _editorComponent.getContent();
}
function copyToEditor() {
    _editorComponent.setContent(dojo.byId('inandout').value);
}
function setSyntax(value) {
    bespin.publish("settings:language", { language: value });
}
