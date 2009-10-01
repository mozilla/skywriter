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

/**
 *
 */
exports.API = SC.Object.extend({
    init: function() {
        this.serachTimeout = null;

        this.scene = new th.WindowScene( {
            canvasOrId: document.getElementById("filesearch"),
            isVisible: false,
            isDraggable: true,
            title: "Find Files"
        });

        this.focusManager = new th.FocusManager(th.global_event_bus, th.byId('filesearch_input_first'), th.byId('filesearch_input_last'));
        var focusManager = this.focusManager;
        this.scene.focusManager = this.focusManager;
        this.focusManager.relateTo(this.scene);

        this.inputSearch = this.scene.byId('filesearch_find');
        var inputSearch = this.inputSearch;
        this.inputReplace = this.scene.byId('filesearch_replace');
        var inputReplace = this.inputReplace;

        focusManager.subscribe(inputSearch);
        focusManager.subscribe(inputReplace);

        this.scene.render();
        this.scene.center();
    },

    toggle: function() {
        this.scene.toggle();

        if (!this.scene.isVisible) {
            this.focusManager.removeFocus();
        } else {
            this.focusManager.focus(this.inputSearch);
            // this.input.setText('');
        }
    },

    // the button's onClick functions. They get wrapped here to bespin.editor.actions functions

    performReplace: function() {
        alert('ToBeDone!');
    },

    performReplaceAll: function() {
        alert('ToBeDone');
    },

    performReplaceAndFind: function() {
        alert('ToBeDone!');
    },

    performPrevious: function() {
        alert('ToBeDone');
    },

    performNext: function() {
        alert('ToBeDone');
    }
});
