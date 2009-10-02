window.SC = require("sproutcore");
var plugins = require("bespin/plugins");
var builtins = require("bespin/builtins");
var bespin = require("bespin");

var catalog = plugins.Catalog.create();
catalog.load(builtins.metadata);
bespin.register("plugins", catalog);

var ep = catalog.getExtensionPoint("mypoint");
var ext = ep.extensions[0];
ext.load(function(myfunc) {
    myfunc("yo");
});


// var component = require("bespin/editor/component");
// var _editorComponent;
// 
// _editorComponent = component.Component.create({
//     container: 'editor',
//     language: "js",
//     loadFromDiv: true,
//     setOptions: { strictlines: 'off' }
// });
// 
// function copyToTextarea() {
//     dojo.byId('inandout').value = _editorComponent.getContent();
// }
// function copyToEditor() {
//     _editorComponent.setContent(dojo.byId('inandout').value);
// }
// function setSyntax(value) {
//     bespin.publish("settings:language", { language: value });
// }

window.FS = SC.Object.create({
    store: SC.Store.create()
});

FS.Project = SC.Object.extend({
   contents: null,
   name: "",
   rootDirectory: null,
   
   init: function() {
       this.set('contents', []);
   }
});

FS.File = SC.Object.extend({
   name: "",

   // MIME-type, perhaps?
   type: "",
   
   directory: null
});

FS.Directory = SC.Object.extend({
    path: "",
    contents: null,
    
    init: function() {
        this.set('contents', []);
    },
    
    _fileAdded: function(length) {
        var contents = this.get('contents'),
            lastItem = contents.objectAt(length - 1);
            
        lastItem.set('directory', this);
    }.observes('contents.[]')
})


window.QuickOpen = {};

QuickOpen.controller = SC.Object.create({
   project: null,
   
   searchKey: "",
   
   matchingFiles: function() {
       var project = this.get('project');       
       var rootDir = project.get('rootDirectory');       
       var results = [], searchKey = this.get('searchKey').toLowerCase();
       
       function traverse(directory, results, searchKey) {
           var contents = directory.get('contents');
           for (var i = 0, file, name; i < contents.get('length'); i++) {
               file = contents.objectAt(i);
               if (SC.instanceOf(FS.Directory)) {
                   traverse(file, results, searchKey);
               } else {
                    // Check against the search key
                    name = file.get('name');
                    if (name.toLowerCase().indexOf(searchKey) > -1) {
                        results.pushObject(file);
                    } else {
                      console.log(name + ' didn\'t match');
                    }
               }
           }
       }
       
       traverse(rootDir, results, searchKey);
       return results;
   }.property('searchKey', 'project')   
});


// Fixtures

var dir1 = FS.Directory.create({
    path: '/Users/andrew/Code/foo'
});

var file1 = FS.File.create({
   name: 'foo.txt',
   type: 'text/plain',
   directory: dir1 
});

dir1.get('contents').pushObject(file1);

var project1 = FS.Project.create({
    name: 'Sample Project',
    rootDirectory: dir1
});

QuickOpen.controller.set('project', project1);

window.project1 = project1;
window.dir1 = dir1;
window.file1 = file1;
