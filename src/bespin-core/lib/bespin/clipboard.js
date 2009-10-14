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
 * Handle clipboard operations.
 */

var SC = require("sproutcore");
var bespin = require("bespin");
var util = require("bespin/util/util");
var cursor = require("bespin/cursor");

/**
 * The clipboard implementation currently in use
 */
var uses = null;

/**
 * Given a clipboard adapter implementation, save it, an call install() on it
 */
function install(editor, newImpl) {
    uninstall();
    uses = newImpl;
    uses.install(editor);
};

/**
 * Uninstalls the clipboard handler installed by install()
 */
function uninstall() {
    if (uses && typeof uses.uninstall == "function") {
        uses.uninstall();
    }

    // Clear uses, because we are no longer using anything.
    uses = undefined;
};

/**
 * Do the first setup. Right now checks for WebKit and inits a DOMEvents
 * solution if that is true else install the default.
 * <p>If using WebKit (I know, feature detection would be nicer, but
 * e.clipboardData is deep) use DOMEvents. Else try the bad tricks.
 * The factory that is used to install, and setup the adapter that does the work
 */
exports.setup = function(editor) {
    install(editor, new HiddenWorld());

    // setData appears to be working again, if you go through certain steps
    // (you have to stop the event properly...)
    if (util.isWebKit) {
        install(editor, new DOMEvents());
    } else {
        install(editor, new HiddenWorld());
    }
};

/**
 * Create a hidden text area so we can adjust the destination of the copy event
 * just before it happens.
 */
function createHiddenTextarea() {
    var textarea = document.createElement("textarea");
    textarea.tabIndex = -1;
    textarea.style.position = "absolute";
    textarea.style.zIndex = "999";
    textarea.style.top = "-10000px";
    textarea.style.width = 0;
    textarea.style.height = 0;
    document.body.appendChild(textarea);
    return textarea;
};

// Defensively stop doing copy/cut/paste magic if you are in the command line
var isCommandLine = function(e) {
    return e.target.id == "command";
};

var editorHasFocus = function() {
    return editor.focus;
};

/**
 * This adapter configures the DOMEvents that only WebKit seems to do well right
 * now. There is trickery involved here. The before event changes focus to the
 * hidden copynpaster text input, and then the real event does its thing and we
 * focus back
 */
var DOMEvents = SC.Object.extend({
    install: function(editor) {
        var focuser = createHiddenTextarea();
        this.focuser = focuser;
        var onfocuser = false;

        // Copy
        this.beforecopyHandle = dojo.connect(document.body, "onbeforecopy", function(e) {
            if ((!editorHasFocus() && !onfocuser) || isCommandLine(e)) {
                return;
            }
            // a full stop, because we _are_ handling the event
            util.stopEvent(e);

            // have to show that there is something to copy
            focuser.value = "Hello";
            focuser.focus();
            focuser.select();

            // and we are now on focuser
            onfocuser = true;
        });

        this.copyHandle = dojo.connect(document.body, "oncopy", function(e) {
            if (!editorHasFocus() && !onfocuser) {
                return;
            }
            if (isCommandLine(e)) {
                return;
            }

            var selectionText = editor.getSelectionAsText();
            if (selectionText && selectionText != '') {
                e.clipboardData.setData('text/plain', selectionText);
                // stop event, otherwise someone else will try to set copy data.
                util.stopEvent(e);
            }

            editor.canvas.focus();
            onfocuser = false;
        });

        // Cut
        this.beforecutHandle = dojo.connect(document, "beforecut", function(e) {
            if ((!editorHasFocus() && !onfocuser) || isCommandLine(e)) {
                return;
            }
            // a full stop, because we _are_ handling the event
            util.stopEvent(e);

            // have to show that there is something to copy
            focuser.value = "Hello";
            focuser.focus();
            focuser.select();

            // and we are now on focuser
            onfocuser = true;
        });

        this.cutHandle = dojo.connect(document, "cut", function(e) {
            if (!editorHasFocus() && !onfocuser) {
                return;
            }
            if (isCommandLine(e)) {
                return;
            }

            var selectionObject = editor.getSelection();

            if (selectionObject) {
                var selectionText = editor.model.getChunk(selectionObject);

                if (selectionText && selectionText != '') {
                    e.preventDefault();
                    e.clipboardData.setData('text/plain', selectionText);
                    editor.ui.actions.beginEdit('cut');
                    editor.ui.actions.deleteSelection(selectionObject);
                    editor.ui.actions.endEdit();
                }
            }

            editor.canvas.focus();
            onfocuser = false;
        });

        // Paste
        this.beforepasteHandle = dojo.connect(document, "beforepaste", function(e) {
            if (!editorHasFocus()) {
                return;
            }
            if (isCommandLine(e)) {
                return;
            }
            // a full stop, because we _are_ handling the event
            util.stopEvent(e);
        });

        this.pasteHandle = dojo.connect(document, "paste", function(e) {
            if (!editorHasFocus() || isCommandLine(e)) {
                return;
            }
            // a full stop, because we _are_ handling the event
            util.stopEvent(e);

            var args = cursor.buildArgs();
            args.chunk = e.clipboardData.getData('text/plain');
            if (args.chunk) {
                editor.ui.actions.beginEdit('paste');
                editor.ui.actions.insertChunk(args);
                editor.ui.actions.endEdit();
            }

            document.getElementById('canvas').focus();
        });

        // and this line makes it work immediately (otherwise you'd have to copy
        // something from somewhere else on the page)
        // I'm not sure why this happens...
        document.body.focus();
    },

    uninstall: function() {
        dojo.disconnect(this.beforepasteHandle);
        dojo.disconnect(this.pasteHandle);
        dojo.disconnect(this.beforecutHandle);
        dojo.disconnect(this.cutHandle);
        dojo.disconnect(this.beforecopyHandle);
        dojo.disconnect(this.copyHandle);

        document.body.removeChild(this.focuser);
    }
});

/**
 * Exclusively grab the C, X, and V key combos and use a hidden input to move
 * data around
 */
var HiddenWorld = SC.Object.extend({
    install: function(editor) {

        // Configure the hidden copynpaster element, if it doesn't already exist
        // save in a var for later use
        var copynpaster = createHiddenTextarea();

        var copyToClipboard = function(text) {
            copynpaster.value = text;
            copynpaster.select();
            copynpaster.focus();
            setTimeout(function() { editor.setFocus(true); }, 10);
        };

        var pasteFromClipboard = function() {
            copynpaster.select(); // select and hope that the paste goes in here

            setTimeout(function() {
                var args = cursor.buildArgs();
                args.chunk = copynpaster.value;
                if (args.chunk) {
                    editor.ui.actions.beginEdit('paste');
                    editor.ui.actions.insertChunk(args);
                    editor.ui.actions.endEdit();
                }
                editor.setFocus(true);
            }, 0);
        };

        this.keyDown = dojo.connect(document, "keydown", function(e) {
            if (!bespin.get('editor').focus) {
                return;
            }
            var selectionText;

            if ((util.isMac && e.metaKey) || e.ctrlKey) {
                // Copy
                if (e.keyCode == 67 /*c*/) {
                    // place the selection into the input
                    selectionText = editor.getSelectionAsText();
                    if (selectionText && selectionText != '') {
                        copyToClipboard(selectionText);
                    }
                } else if (e.keyCode == 88 /*x*/) {
                    // Cut
                    // place the selection into the input
                    var selectionObject = editor.getSelection();

                    if (selectionObject) {
                        selectionText = editor.model.getChunk(selectionObject);

                        if (selectionText && selectionText != '') {
                            copyToClipboard(selectionText);
                            editor.ui.actions.beginEdit('cut');
                            editor.ui.actions.deleteSelection(selectionObject);
                            editor.ui.actions.endEdit();
                        }
                    }
                } else if (e.keyCode == 86 /*v*/) {
                    // Paste
                    if (e.target == document.getElementById("command")) {
                        // let the paste happen in the command
                        return;
                    }
                    pasteFromClipboard();
                }
            }
        });
    },

    uninstall: function() {
        dojo.disconnect(this.keyDown);

        if (this.copynpaster) {
            document.body.removeChild(this.copynpaster);
        }

        this.copynpaster = undefined;
    }
});

/**
 * Turn on the key combinations to access the clipboard.manual class
 * which basically only works with the editor only. Not in favour.
 */
exports.EditorOnly = SC.Object.extend({
    install: function() {
        var editor = bespin.get('editor');

        editor.bindKey("copySelection", "CMD C");
        editor.bindKey("pasteFromClipboard", "CMD V");
        editor.bindKey("cutSelection", "CMD X");
    }
});

/**
 * The ugly hack that tries to use XUL to get work done, but will probably fall
 * through to in-app copy/paste only
 */
exports.manual = function() {
    var clipdata;
    var privMan = window.netscape ? netscape.security.PrivilegeManager : null;

    return {
        copy: function(copytext) {
            try {
                if (privMan.enablePrivilege) {
                    privMan.enablePrivilege("UniversalXPConnect");
                } else {
                    clipdata = copytext;
                    return;
                }
            } catch (ex) {
                clipdata = copytext;
                return;
            }

            var str = Components.classes["@mozilla.org/supports-string;1"]
                    .createInstance(Components.interfaces.nsISupportsString);
            str.data = copytext;

            var trans = Components.classes["@mozilla.org/widget/transferable;1"]
                    .createInstance(Components.interfaces.nsITransferable);
            if (!trans) {
                return false;
            }

            trans.addDataFlavor("text/unicode");
            trans.setTransferData("text/unicode", str, copytext.length * 2);

            var clipid = Components.interfaces.nsIClipboard;
            var clip = Components.classes["@mozilla.org/widget/clipboard;1"]
                    .getService(clipid);
            if (!clip) {
                return false;
            }

            clip.setData(trans, null, clipid.kGlobalClipboard);

            /*
            // Flash doesn't work anymore :(
            if (inElement.createTextRange) {
                var range = inElement.createTextRange();
                if (range && BodyLoaded==1)
                    range.execCommand('Copy');
            } else {
                var flashcopier = document.getElementById('flashcopier');
                if (!flashcopier) {
                    flashcopier = document.createElement('div');
                    flashcopier.id = 'flashcopier';
                    document.body.appendChild(flashcopier);
                }
                flashcopier.innerHTML = '';

                var divinfo = '<embed src="_clipboard.swf" FlashVars="clipboard='+escape(inElement.value)+'" width="0" height="0" type="application/x-shockwave-flash"></embed>';
                flashcopier.innerHTML = divinfo;
            }
            */
        },

        data: function() {
            try {
                if (privilegeManager.enablePrivilege) {
                    privilegeManager.enablePrivilege("UniversalXPConnect");
                } else {
                    return clipdata;
                }
            } catch (ex) {
                return clipdata;
            }

            var clip = Components.classes["@mozilla.org/widget/clipboard;1"]
                    .getService(Components.interfaces.nsIClipboard);
            if (!clip) {
                return false;
            }

            var trans = Components.classes["@mozilla.org/widget/transferable;1"]
                    .createInstance(Components.interfaces.nsITransferable);
            if (!trans) {
                return false;
            }
            trans.addDataFlavor("text/unicode");

            clip.getData(trans, clip.kGlobalClipboard);

            var str = {};
            var strLength = {};
            var pastetext = "";

            trans.getTransferData("text/unicode", str, strLength);
            if (str) {
                str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
            }
            if (str) {
                pastetext = str.data.substring(0, strLength.value / 2);
            }
            return pastetext;
        }
    };
}();
