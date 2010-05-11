/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an 'AS IS' basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var userident = require("userident");

userident.showLogin();

exports.loggedIn = function() {
    require('jlayout_border');
    var $ = require('jquery').$;
    var util = require('bespin:util/util');
    var CliInputView = require('command_line:views/cli').CliInputView;

    var parent = document.createElement('div');
    parent.setAttribute('id', 'container');
    parent.setAttribute('style', 'width: 100%; height: 100%; margin: 0');
    document.body.appendChild(parent);

    parent.innerHTML = '<div id="editor" class="center">Editor goes here</div>';

    var cliInputView = new CliInputView();
    parent.appendChild(cliInputView.element);
    util.addClass(cliInputView.element, 'north');

    // We call this to tell the widget that it's geometry has changed (i.e.
    // we've attached to a side, which changes how it does height/width)
    // Perhaps this should be part of some bigger 'widget' spec/thing
    cliInputView.layout();

    var loading = document.getElementById('loading');
    document.body.removeChild(loading);

    var container = $('#container');

    function relayout() {
    	container.layout({
    	    type: 'border',
    	    resize: false,
    	    south__minSize: 300,
            south__resizable: true,
            south__spacing_open: 10,
            south__spacing_closed: 5
    	});
    }

    relayout();

    $(window).resize(relayout);

    // ---
    // Setup the editor:

    var env = require('canon:environment').global
    var bespin = require('appsupport:controllers/bespin').bespinController;
    var EditorView = require('text_editor:views/editor').EditorView;
    var m_editsession = require('edit_session').editSessionClasses;

    var editorView = new EditorView(document.getElementById('editor'));

    // TODO: This is a temporary hack.
    var session = new m_editsession.EditSession();
    var layoutManager = editorView.layoutManager;
    var textStorage = layoutManager.textStorage;
    var syntaxManager = layoutManager.syntaxManager;

    var buffer = m_editsession.makeBuffer(textStorage, syntaxManager);

    session.currentBuffer = buffer;
    session.currentView = editorView.textView;
    bespin.session = session;
};
