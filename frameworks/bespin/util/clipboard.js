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

var SC = require("sproutcore/runtime:package").SC;
var util = require("util/util");
var keys = require("util/keys");

/**
 * The clipboard implementation currently in use
 */
var implementation = null;

/**
 * Do the first setup.
 * <p>If using WebKit use DOMEvents, else try the bad tricks (HiddenWorld).
 */
exports.setup = function(editorWrapper) {
    if (implementation) {
        implementation.uninstall();
    }

    // Feature detection would be nicer, but ev.clipboardData only exists on
    // clipboard events, so we can't use that.
    // Also there is breakage in the WebKit impl right now, everything is
    // using HiddenWorld
    if (false && util.isWebKit) {
        implementation = DOMEvents.create({ editorWrapper:editorWrapper });
        implementation.install();
    } else {
        implementation = HiddenWorld.create({ editorWrapper:editorWrapper });
        implementation.install();
    }
};

/**
 * Create a hidden text area so we can adjust the destination of the copy event
 * just before it happens.
 */
var ClipboardProxy = SC.Object.extend({
    _hasFocus: false,

    /**
     * Create a textarea under the document body to handle our text
     */
    init: function() {
        this.textarea = document.createElement("textarea");
        this.textarea.className = "bespin-clipboardproxy";
        this.textarea.tabIndex = -1;
        this.textarea.style.position = "absolute";
        this.textarea.style.zIndex = "999";
        this.textarea.style.top = "-10000px";
        this.textarea.style.width = 0;
        this.textarea.style.height = 0;
        document.body.appendChild(this.textarea);
    },

    /**
     * Take focus and put the (optional) passed text into the internal textarea
     * and make sure that it is selected.
     */
    takeFocus: function(text) {
        // have to show that there is something to copy
        text = text || "Hello";

        this.textarea.value = text;
        this.textarea.focus();
        this.textarea.select();

        this._hasFocus = true;
    },

    /**
     * Focus tracking - do we have it?
     */
    hasFocus: function(text) {
        return this._hasFocus;
    },

    /**
     * Focus tracking - it's gone
     */
    focusLost: function() {
        this._hasFocus = false;
    },

    /**
     * What are the contents of the textarea?
     */
    getValue: function() {
        return this.textarea.value;
    },

    /**
     * Clean up
     */
    dispose: function() {
        document.body.removeChild(this.textarea);
    }
});

/**
 * This adapter configures the DOMEvents that only WebKit seems to do well right
 * now. There is trickery involved here. The before event changes focus to the
 * hidden textarea, and then the real event does its thing and we focus back
 */
var DOMEvents = SC.Object.extend({
    editorWrapper: null,

    install: function() {
        var proxy = ClipboardProxy.create();
        // Would like to attach events to this.editorWrapper.getFocusElement()
        // (i.e. the canvas element) except that this doesn't work, so we have
        // to attach to document.body and then check to see if we're it
        var element = document;

        // Safari calls this to see if there is anything to cut/copy, to detect
        // if we it grey out the copy menu item. Chrome calls this just before
        // calling cut/copy
        var primeMenu = function(ev) {
            if (!this.editorWrapper.hasFocus()) {
                return;
            }
            // Tell the system that we are going to handle the event
            ev.preventDefault();
            // Line up the fake element so Safari's checks work OK
            proxy.takeFocus();
        }.bind(this);

        element.addEventListener("beforecopy", primeMenu, false);
        element.addEventListener("beforecut", primeMenu, false);
        // SC.Event.add(element, "beforecopy", this, primeMenu, false);
        // SC.Event.add(element, "beforecut", this, primeMenu, false);

        // Called to actually do the copy
        var onCopy = function(ev) {
            if (!proxy.hasFocus()) {
                return;
            }

            var text = this.editorWrapper.getSelection();
            if (text && text != '') {
                ev.clipboardData.setData('text/plain', text);
            }
            console.log("onCopy", ev, text);

            this.editorWrapper.focus();
            proxy.focusLost();
            util.stopEvent(ev);
        }.bind(this);
        element.addEventListener("copy", onCopy);
        // SC.Event.add(element, "copy", this, onCopy, false);

        var onCut = function(ev) {
            if (!proxy.hasFocus()) {
                return;
            }

            var text = this.editorWrapper.removeSelection();
            if (text) {
                ev.clipboardData.setData('text/plain', text);
            }
            console.log("onCut", ev, text);

            this.editorWrapper.focus();
            proxy.focusLost();
            util.stopEvent(ev);
        }.bind(this);
        element.addEventListener("cut", onCut);
        // SC.Event.add(element, "cut", this, onCut, false);

        var onPaste = function(ev) {
            if (!this.editorWrapper.hasFocus()) {
                return;
            }

            var text = ev.clipboardData.getData('text/plain');
            this.editorWrapper.replaceSelection(text);
            console.log("onPaste", ev, text);

            this.editorWrapper.focus();
            proxy.focusLost();
            util.stopEvent(ev);
        }.bind(this);
        element.addEventListener("paste", onPaste);
        // SC.Event.add(element, "paste", this, onPaste);

        /**
         * re-write the uninstall function to clear up the resources that we
         * have created
         */
        this.uninstall = function() {
            element.removeEventListener("beforecopy", primeMenu, false);
            element.removeEventListener("beforecut", primeMenu, false);
            element.removeEventListener("beforepaste", primeMenu, false);

            element.removeEventListener("copy", onCopy, false);
            element.removeEventListener("cut", onCut, false);
            element.removeEventListener("paste", onPaste, false);

            // SC.Event.remove(element, "beforecopy", this, primeMenu, false);
            // SC.Event.remove(element, "beforecut", this, primeMenu, false);
            // SC.Event.remove(element, "beforepaste", this, primeMenu, false);

            // SC.Event.remove(element, "copy", this, onCopy, false);
            // SC.Event.remove(element, "cut", this, onCut, false);
            // SC.Event.remove(element, "paste", this, onPaste, false);

            proxy.dispose();
        };

        // and this line makes it work immediately (otherwise you'd have to copy
        // something from somewhere else on the page)
        // I'm not sure why this happens...
        //document.body.focus();
    },

    /**
     * This is dynamically re-written by the install function
     */
    uninstall: function() {
    }
});

/**
 * Exclusively grab the C, X, and V key combos and use a hidden input to move
 * data around
 */
var HiddenWorld = SC.Object.extend({
    editorWrapper: null,

    install: function() {
        this.proxy = ClipboardProxy.create();

        /**
         * Add a keydown handler to grab everything.
         * TODO: Hook into the editors keyboard handling
         */
        var onKeyDown = function(ev) {
            var text;
            if ((util.isMac && ev.metaKey) || ev.ctrlKey) {
                // Copy
                if (ev.keyCode == keys.Key.C) {
                    // place the selection into the input
                    text = this.editorWrapper.getSelection();
                    if (text && text != '') {
                        this.copyToClipboard(text);
                    }
                } else if (ev.keyCode == keys.Key.X) {
                    // Cut
                    text = this.editorWrapper.removeSelection();
                    this.copyToClipboard(text);
                } else if (ev.keyCode == keys.Key.V) {
                    this.pasteFromClipboard();
                }
            }
        }.bind(this);

        var element = this.editorWrapper.getFocusElement();
        element.addEventListener("keydown", onKeyDown, false);

        this.uninstall = function() {
            element.removeEventListener("keydown", onKeyDown, false);
            this.proxy.dispose();
        };
    },

    copyToClipboard: function(text) {
        this.proxy.takeFocus(text);
        setTimeout(function() {
            this.editorWrapper.focus();
        }.bind(this), 10);
    },

    pasteFromClipboard: function() {
        // Hope that the paste goes in here
        this.proxy.takeFocus();
        setTimeout(function() {
            var text = this.proxy.getValue();
            this.editorWrapper.replaceSelection(text);
            this.editorWrapper.focus();
        }.bind(this), 0);
    },

    /**
     * This is dynamically re-written by the install function
     */
    uninstall: function() {
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

                var divinfo = '<embed src="_clipboard.swf" FlashVars="clipboard=' +
                    escape(inElement.value) +
                    '" width="0" height="0" type="application/x-shockwave-flash"></embed>';
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
