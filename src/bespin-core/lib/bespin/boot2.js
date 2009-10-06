console.log("loading boot2");

window.SC = require("sproutcore");
// Hack to allow us to call this.sc_super() in place of the global sc_super();
SC.Object.prototype.sc_super = function super_name() {
    super_name.caller.base.apply(this, super_name.caller.arguments);
};

var plugins = require("bespin/plugins");
var builtins = require("bespin/builtins");
var bespin = require("bespin");

// SC.LOG_BINDINGS = true;
// SC.LOG_OBSERVERS = true;

var catalog = plugins.Catalog.create();
catalog.load(builtins.metadata);
bespin.register("plugins", catalog);

var component = require("bespin/editor/component");
exports.editorComponent = component.Component.create({
    container: dojo.byId('editor'),
    language: "js",
    loadFromDiv: true,
    setOptions: { strictlines: 'on' }
});
