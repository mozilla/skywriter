/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
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

var mobwrite = require("bespin/mobwrite");

/**
 * Constructor of shared object representing a text field.
 * @param {Node} shareNode A Bespin shared node
 * @constructor
 */
mobwrite.shareBespinObj = function(shareNode) {
    this.shareNode = shareNode;
    this.shareNode.setShareObj(this);
    // Call our prototype's constructor.
    mobwrite.shareObj.apply(this, [ shareNode.id ]);
};

// The bespin shared object's parent is a mobwrite shareObj.
mobwrite.shareBespinObj.prototype = new mobwrite.shareObj('');

/**
 * Retrieve the user's text.
 * @return {string} Plaintext content.
 */
mobwrite.shareBespinObj.prototype.getClientText = function(allowUnsynced) {
    return this.shareNode.getClientText(allowUnsynced);
};

/**
 * Set the user's text.
 * @param {string} text New text
 */
mobwrite.shareBespinObj.prototype.setClientText = function(text) {
    // console.log('shareBespinObj.setClientText(... ' + text.length + ' chars)');
    this.shareNode.setClientText(text);
};

/**
 * Modify the user's plaintext by applying a series of patches against it.
 * @param {Array<patch_obj>} patches Array of Patch objects
 */
mobwrite.shareBespinObj.prototype.patchClientText = function(patches) {
    this.shareNode.patchClientText(patches);
};

/**
 * We've done a sync and didn't need to make any changes, but bespin might
 * want to call onSuccess
 */
mobwrite.shareBespinObj.prototype.syncWithoutChange = function() {
    this.shareNode.syncWithoutChange();
};

/**
 * Display an updated list of collaborators
 */
mobwrite.shareBespinObj.prototype.reportCollaborators = function(userEntries) {
    this.shareNode.reportCollaborators(userEntries);
};

/**
 * Pass on error information
 */
mobwrite.shareBespinObj.prototype.raiseError = function(text, recoverable) {
    this.shareNode.raiseError(text, recoverable);
};

/**
 * Should we be readonly?
 */
mobwrite.shareBespinObj.prototype.setReadOnly = function(readonly) {
    this.shareNode.setReadOnly(readonly);
};

/**
 * Should we be readonly?
 */
mobwrite.shareBespinObj.prototype.getMetaData = function() {
    return this.shareNode.getMetaData();
};

/**
 * Handler to accept text fields as elements that can be shared.
 * If the element is a bespin share node, create a new sharing object.
 * @param {*} node Object or ID of object to share
 * @return {Object?} A sharing object or null.
 */
mobwrite.shareBespinObj.shareHandler = function(node) {
    if (node.isShareNode === true) {
        node.shareHandler = new mobwrite.shareBespinObj(node);
        return node.shareHandler;
    } else {
        return null;
    }
};

// Register this shareHandler with MobWrite.
mobwrite.shareHandlers.push(mobwrite.shareBespinObj.shareHandler);

