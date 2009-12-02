/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

"import core_test";
var SC = require('sproutcore/runtime').SC;
var bespin = require('bespin:index');
var EditorController = require('bespin:editor/controller').EditorController;
var editor_views_editor = require('bespin:editor/views/editor');

// Tests for the editor view.
module("editor");

test("Test editor view managed by standard controller", function() {
    var container = bespin._container;

    var editorController = EditorController.create();
    container.register('editor', editorController);

    editorController.model.insertDocument("Bespin test!");

    var mainPane = SC.MainPane.create({
        contentView: editorController.ui
    });
    ok(!SC.none(editorController.ui), "editorController.ui exists");
});

plan.run();

