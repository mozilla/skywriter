var _editorComponent;

SC = require("sproutcore");
var component = require("bespin/editor/component");
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
