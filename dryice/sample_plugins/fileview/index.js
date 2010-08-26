
var files = require('skywriter:plugins').catalog.getObject('files');
var templates = require('fileview:templates');

exports.FileView = function() {
    templates.tree({ fileView: this });

    goog.ui.tree.TreeControl.defaultConfig.cleardotPath =
        '/closure/closure/goog/images/tree/cleardot.gif';
    this.tree = new goog.ui.tree.TreeControl('root');
    this.tree.setShowRootNode(false);

    this._load();
};

exports.FileView.prototype = {
    elementAppended: function() {
        this.tree.render(this.treeElement);
    },

    _load: function() {
        files.listAll().then(function(filelist) {
            // Turn a list of filenames into a tree of objects. That is:
            // [ 'a/b/c', 'a/b/d', 'e/f' ] is converted into
            // { a:{ b:{ c:{}, d:{} } }, e:{ f:{} } }
            this.tempNodes = {};
            filelist.forEach(function(file) {
                var tempNode = this.tempNodes;
                file.split('/').forEach(function(part) {
                    if (!tempNode[part]) {
                        tempNode[part] = {};
                    }
                    tempNode = tempNode[part];
                });
            }.bind(this));
            // Create closure nodes from our temp nodes
            this._treeToClosure(this.tree, this.tempNodes);
        }.bind(this));
    },

    _treeToClosure: function(closureNode, parentNode) {
        for (var nodeName in parentNode) {
            var childNode = closureNode.getTree().createNode(nodeName);
            closureNode.add(childNode);
            this._treeToClosure(childNode, parentNode[nodeName]);
        }
    }
};
