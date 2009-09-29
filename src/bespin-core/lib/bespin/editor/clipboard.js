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

var bespin = require("bespin");

/**
 * Handle clipboard operations.
 * If using WebKit (I know, feature detection would be nicer,
 * but e.clipboardData is deep) use DOMEvents. Else try the bad tricks.
 * The factory that is used to install, and setup the adapter that does the work
 */
exports.clipboard = {
    /**
     * Given a clipboard adapter implementation, save it, an call install() on
     * it
     */
    install: function(editor, newImpl) {
        this.uninstall();
        this.uses = newImpl;
        this.uses.install(editor);
    },

    /**
     * Uninstalls the clipboard handler installed by install()
     */
    uninstall: function() {
        if (this.uses && typeof this.uses['uninstall'] == "function") this.uses.uninstall();

        //clear uses, because we are no longer using anything.
        this.uses = undefined;
    },

    createHiddenTextarea: function() {
        return dojo.create("textarea", {
            id: 'copynpaster',
            tabIndex: '-1',
            style: "position:absolute; z-index:999; top:-10000px; width:0px; height:0px; border:none;"
        }, dojo.body());
    },

    createHiddenIframe: function() {
        return dojo.create("iframe", {id: 'icopynpaster', style: "position:absolute; z-index:999; top:-10000px; width:0px; height:0px; border:none;"}, dojo.body());
    },

    /**
     * Do the first setup. Right now checks for WebKit and inits a DOMEvents
     * solution if that is true else install the default.
     */
    setup: function(editor) {
        this.install(editor, new bespin.editor.clipboard.HiddenWorld());

        // setData appears to be working again, if you go through certain steps (you have to stop the event properly...)
        if (dojo.isWebKit) {
            this.install(editor, new bespin.editor.clipboard.DOMEvents());
        } else {
            this.install(editor, new bespin.editor.clipboard.HiddenWorld());
        }
    }
};

/**
 * This adapter configures the DOMEvents that only WebKit seems to do well right
 * now. There is trickery involved here. The before event changes focus to the
 * hidden copynpaster text input, and then the real event does its thing and we
 * focus back
 */
exports.DOMEvents = SC.Object.extend({
    install: function(editor) {
        // * Defensively stop doing copy/cut/paste magic if you are in the command line
        var stopAction = function(e) {
            return e.target.id == "command";
        };
        var editorHasFocus = function() { 
            return editor.focus;
        };
        
        var focuser = this.focuser = bespin.editor.clipboard.createHiddenTextarea();
        var onfocuser = false;
        
        // Copy
        this.beforecopyHandle = dojo.connect(document.body, "onbeforecopy", function(e) {
            if ((!editorHasFocus() && !onfocuser) || stopAction(e)) return;
            dojo.stopEvent(e); // a full stop, because we _are_ handling the event
            
            // have to show that there is something to copy
            focuser.value = "Hello";
            focuser.focus();
            focuser.select();
            
            // and we are now on focuser
            onfocuser = true;
        });

        this.copyHandle = dojo.connect(document.body, "oncopy", function(e) {
            if (!editorHasFocus() && !onfocuser) return;
            if (stopAction(e)) return;
            
            var selectionText = editor.getSelectionAsText();
            if (selectionText && selectionText != '') {
                e.clipboardData.setData('text/plain', selectionText);
                dojo.stopEvent(e); // need a full stop, otherwise someone else will try to set copy data.
            }

            editor.canvas.focus();            
            onfocuser = false;
        });
        
        // Cut
        this.beforecutHandle = dojo.connect(document, "beforecut", function(e) {
            if ((!editorHasFocus() && !onfocuser) || stopAction(e)) return;
            dojo.stopEvent(e); // a full stop, because we _are_ handling the event
            
            // have to show that there is something to copy
            focuser.value = "Hello";
            focuser.focus();
            focuser.select();
            
            // and we are now on focuser
            onfocuser = true;
        });

        this.cutHandle = dojo.connect(document, "cut", function(e) {
            if (!editorHasFocus() && !onfocuser) return;
            if (stopAction(e)) return;

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
            if (!editorHasFocus()) return;
            if (stopAction(e)) return;
            dojo.stopEvent(e); // a full stop, because we _are_ handling the event
            e.preventDefault();
        });

        this.pasteHandle = dojo.connect(document, "paste", function(e) {
            if (!editorHasFocus() || stopAction(e)) return;
            dojo.stopEvent(e); // a full stop, because we _are_ handling the event

            e.preventDefault();
            var args = bespin.editor.utils.buildArgs();
            args.chunk = e.clipboardData.getData('text/plain');
            if (args.chunk) {
                editor.ui.actions.beginEdit('paste');
                editor.ui.actions.insertChunk(args);
                editor.ui.actions.endEdit();
            }

            dojo.byId('canvas').focus();
        });
        
        // and this line makes it work immediately (otherwise you'd have to copy something from somewhere else on the page)
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
exports.HiddenWorld = SC.Object.extend({
    install: function(editor) {

        // Configure the hidden copynpaster element, if it doesn't already exist
        // save in a var for later use
        var copynpaster;
        var copyToClipboard;
        var pasteFromClipboard;
        
        copynpaster = bespin.editor.clipboard.createHiddenTextarea();
        copyToClipboard = function(text) {
            copynpaster.value = text;
            copynpaster.select();
            copynpaster.focus();
            setTimeout(function() { editor.setFocus(true); }, 10);
        };
        
        pasteFromClipboard = function() {
            copynpaster.select(); // select and hope that the paste goes in here

            setTimeout(function() {
                var args = bespin.editor.utils.buildArgs();
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
            if (!bespin.get('editor').focus) return;
            if ((bespin.util.isMac() && e.metaKey) || e.ctrlKey) {
                // Copy
                if (e.keyCode == 67 /*c*/) {
                    // place the selection into the input
                    var selectionText = editor.getSelectionAsText();
                    if (selectionText && selectionText != '') {
                        copyToClipboard(selectionText);
                    }

                // Cut
                } else if (e.keyCode == 88 /*x*/) {
                    // place the selection into the input
                    var selectionObject = editor.getSelection();

                    if (selectionObject) {
                        var selectionText = editor.model.getChunk(selectionObject);

                        if (selectionText && selectionText != '') {
                            copyToClipboard(selectionText);
                            editor.ui.actions.beginEdit('cut');
                            editor.ui.actions.deleteSelection(selectionObject);
                            editor.ui.actions.endEdit();
                        }
                    }

                // Paste
                } else if (e.keyCode == 86 /*v*/) {
                    if (e.target == dojo.byId("command")) return; // let the paste happen in the command
                    pasteFromClipboard();
                }
            }
        });
    },

    uninstall: function() {
        dojo.disconnect(this.keyDown);

        if (this.copynpaster)
            document.body.removeChild(this.copynpaster);

        this.copynpaster = undefined;
    }
});

/**
 * Turn on the key combinations to access the Bespin.Clipboard.Manual class
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
exports.Manual = function() {
    var clipdata;

    return {
        copy: function(copytext) {
            try {
                if (netscape.security.PrivilegeManager.enablePrivilege) {
                    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
                } else {
                    clipdata = copytext;
                    return;
                }
            } catch (ex) {
                clipdata = copytext;
                return;
            }

            var str = Components.classes["@mozilla.org/supports-string;1"].
                                      createInstance(Components.interfaces.nsISupportsString);
            str.data = copytext;

            var trans = Components.classes["@mozilla.org/widget/transferable;1"].
                                   createInstance(Components.interfaces.nsITransferable);
            if (!trans) return false;

            trans.addDataFlavor("text/unicode");
            trans.setTransferData("text/unicode", str, copytext.length * 2);

            var clipid = Components.interfaces.nsIClipboard;
            var clip   = Components.classes["@mozilla.org/widget/clipboard;1"].getService(clipid);
            if (!clip) return false;

            clip.setData(trans, null, clipid.kGlobalClipboard);

            /*
            // Flash doesn't work anymore :(
            if (inElement.createTextRange) {
                var range = inElement.createTextRange();
                if (range && BodyLoaded==1)
                    range.execCommand('Copy');
            } else {
                var flashcopier = 'flashcopier';
                if (!document.getElementById(flashcopier)) {
                    var divholder = document.createElement('div');
                    divholder.id = flashcopier;
                    document.body.appendChild(divholder);
                }
                document.getElementById(flashcopier).innerHTML = '';

                var divinfo = '<embed src="_clipboard.swf" FlashVars="clipboard='+escape(inElement.value)+'" width="0" height="0" type="application/x-shockwave-flash"></embed>';
                document.getElementById(flashcopier).innerHTML = divinfo;
            }
            */
        },

        data: function() {
            try {
                if (netscape.security.PrivilegeManager.enablePrivilege) {
                    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
                } else {
                    return clipdata;
                }
            } catch (ex) {
                return clipdata;
            }

            var clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
            if (!clip) return false;

            var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
            if (!trans) return false;
            trans.addDataFlavor("text/unicode");

            clip.getData(trans, clip.kGlobalClipboard);

            var str       = {};
            var strLength = {};
            var pastetext = "";

            trans.getTransferData("text/unicode", str, strLength);
            if (str) str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
            if (str) pastetext = str.data.substring(0, strLength.value / 2);
            return pastetext;
        }
    };
}();
