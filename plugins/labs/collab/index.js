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

/*

I took out from package.json following extension points:

        {
            "ep": "appcomponent",
            "name": "social_view",
            "pointer": "view#SocialView"
        },

*/

/**
 * This session module provides functionality that both stores session
 * information and handle collaboration.
 */

var console = require('bespin:console').console;
var env = require('environment').env;
var project = require('project');
var server = require('bespin_server').server;

var mobwrite = require('collab:mobwrite/core').mobwrite;
var diff_match_patch = require('diff');

var m_view = require('collab:view');

/**
 * Mobwrite has a set of shareObjs which are designed to wrap DOM nodes.
 * This creates a fake DOM node to be wrapped in a Mobwrite ShareObj.
 * @param onFirstSync a function to call when the first sync has happened
 * This allows us to support onSuccess. onFirstSync should NOT be null or
 * some of the logic below might break.
 */
var ShareNode = function() {
	this.username = env.session.currentUser;
	this.fullPath = env.file.path;
	this.project = project.getProjectAndPath(this.fullPath);
	var projectname = this.project[0].name;
	if (projectname.indexOf('+') < 0) {
		// add username
		projectname = this.username + '+' + projectname;
	}
	mobwrite.shareObj.call(this, projectname + '/' + this.project[1]);
	this.onFirstSync = function() { };
};

ShareNode.prototype = {

    onFirstSync: null,
    errorRaised: false,
    pausedText: '',

    /**
     * What is the contents of the editor?
     */
    getClientText: function(allowUnsynced) {
        if (!allowUnsynced && this.onFirstSync) {
            console.trace();
            throw new Error('Attempt to getClientText() before onFirstSync() called.');
        }
		//return env.model.getValue();
		return env.editor.value;
    },

    /**
     * Called by mobwrite when it (correctly) assumes that we start blank and
     * that there are therefore no changes to make, however we need call
     * things like onSuccess.
     */
    syncWithoutChange: function() {
        this.syncDone();
    },

    /**
     * Nasty hack to allow the editor to know that something has changed.
     * In the first instance the use is restricted to calling the loaded
     * callback
     */
    syncDone: function() {
        if (this.onFirstSync) {
            this.onFirstSync();
            delete this.onFirstSync;
        }

        if (this.errorRaised) {
            if (!this.readOnlyStateBeforeError) {
                //this.editor.setReadOnly(false);
				env.editor.readOnly = false;
            }
            this.errorRaised = false;
        }
    },

    /**
     * Notification used by mobwrite to announce an update.
     * Used by startSession to detect when it is safe to fire onSuccess
     */
    setClientText: function(text) {
        var cursor = this.captureCursor();
		//env.model.setValue(text);
		env.editor.value = text;
        this.restoreCursor(cursor);

        this.syncDone();
    },

    /**
     * Set the read-only flag on the editor
     */
    setReadOnly: function(readonly) {
        //this.editor.setReadOnly(readonly);
		env.editor.readOnly = readonly;
    },

    /**
     * The session handles the collaborators side-bar
     */
    reportCollaborators: function(userEntries) {
        var social = m_view.social;
		if (social) {
			var list = social.getPath('topLeftView.contentView');
			var content = [];
			// we can have many "dead" sessions, which leads to duplication of users.
			var seen = {}, username = this.username;
			userEntries.forEach(function (user) {
				if (user.handle != username && !seen.hasOwnProperty(user.handle)) {
					seen[user.handle] = true;
					content.push(user.handle);
				}
			});
			content.sort();
			content.unshift(username); // we are #1!
			var old = list.get('content');
			if (old.length == content.length) {
				var same = old.every(function (username, i) {
						return username == content[i];
					});
				if (same) {
					// bail out
					return;
				}
			}
			list.set('content', content);
		}
    },

    /**
     * Something in mobwrite has died. Attempt to tell the user and go into
     * read-only mode if it's fatally broken
     */
    raiseError: function(text, recoverable) {
        text = text || '';
        var prefix = '<strong>' + (recoverable ? '' : 'Fatal ') + 'Collaboration Error</strong>: ';
        var suffix = '<br/><strong>Warning</strong>: Changes since the last sync could be lost';

        if (!this.errorRaised) {
            this.readOnlyStateBeforeError = env.editor.readOnly;
            //this.editor.setReadOnly(true);
			env.editor.readOnly = true;
            this.errorRaised = true;
        }
    },

    /**
     * Called by mobwrite to apply patches
     */
    patchClientText: function(patches) {
        // Set some constants which tweak the matching behavior.
        // Maximum distance to search from expected location.
        this.dmp.Match_Distance = 1000;
        // At what point is no match declared (0.0 = perfection, 1.0 = very loose)
        this.dmp.Match_Threshold = 0.6;

        var oldClientText = this.getClientText(true);
        var cursor = this.captureCursor();
        // Pack the cursor offsets into an array to be adjusted.
        // See http://neil.fraser.name/writing/cursor/
        var offsets = [];
        if (cursor) {
            offsets[0] = cursor.startOffset;
            if ('endOffset' in cursor) {
                offsets[1] = cursor.endOffset;
            }
        }

        var newClientText = this._patchApply(patches, oldClientText, offsets);
        // Set the new text only if there is a change to be made.
        if (oldClientText != newClientText) {
			//env.model.setValue(newClientText);
			env.editor.value = newClientText;
            if (cursor) {
                // Unpack the offset array.
                cursor.startOffset = offsets[0];
                if (offsets.length > 1) {
                    cursor.endOffset = offsets[1];
                    if (cursor.startOffset >= cursor.endOffset) {
                        cursor.collapsed = true;
                    }
                }
                this.restoreCursor(cursor);
            }
        }

        this.syncDone();
    },

    /**
     * Merge a set of patches onto the text. Return a patched text.
     * This is taken from mobwrite.shareTextareaObj.prototype.patch_apply_
     * and we should find a better way to share. Maybe shareBespinObj should
     * inherit from shareTextareaObj? In the mean time we need to take extra
     * care when doing merges
     * @param {Array.<patch_obj>} patches Array of patch objects.
     * @param {string} text Old text.
     * @param {Array.<number>} offsets Offset indices to adjust.
     * @return {string} New text.
     * @private
     */
    _patchApply: function(patches, text, offsets) {
        if (patches.length == 0) {
            return text;
        }

        // Deep copy the patches so that no changes are made to originals.
        patches = this.dmp.patch_deepCopy(patches);
        var nullPadding = this.dmp.patch_addPadding(patches);
        text = nullPadding + text + nullPadding;

        this.dmp.patch_splitMax(patches);

        // delta keeps track of the offset between the expected and actual
        // location of the previous patch.  If there are patches expected at
        // positions 10 and 20, but the first patch was found at 12, delta is 2
        // and the second patch has an effective expected position of 22.
        var delta = 0;
        for (var x = 0; x < patches.length; x++) {
            var expected_loc = patches[x].start2 + delta;
            var text1 = this.dmp.diff_text1(patches[x].diffs);
            var start_loc = this.dmp.match_main(text, text1, expected_loc);
            if (start_loc == -1) {
                // No match found.  :(
                if (mobwrite.debug) {
                    window.console.warn('Patch failed: ' + patches[x]);
                }
            } else {
                // Found a match.  :)
                delta = start_loc - expected_loc;
                var text2 = text.substring(start_loc, start_loc + text1.length);

                // Run a diff to get a framework of equivalent indices.
                var diffs = this.dmp.diff_main(text1, text2, false);
                var index1 = 0;
                var index2;
                var i;
                for (var y = 0; y < patches[x].diffs.length; y++) {
                    var mod = patches[x].diffs[y];
                    if (mod[0] !== diff_match_patch.DIFF_EQUAL) {
                        index2 = this.dmp.diff_xIndex(diffs, index1);
                    }
                    if (mod[0] === diff_match_patch.DIFF_INSERT) {
                        text = text.substring(0, start_loc + index2) + mod[1] +
                                     text.substring(start_loc + index2);
                        for (i = 0; i < offsets.length; i++) {
                            if (offsets[i] + nullPadding.length > start_loc + index2) {
                                offsets[i] += mod[1].length;
                            }
                        }
                    } else if (mod[0] === diff_match_patch.DIFF_DELETE) {
                        var del_start = start_loc + index2;
                        var del_end = start_loc + this.dmp.diff_xIndex(diffs,
                                index1 + mod[1].length);
                        text = text.substring(0, del_start) + text.substring(del_end);
                        for (i = 0; i < offsets.length; i++) {
                            if (offsets[i] + nullPadding.length > del_start) {
                                if (offsets[i] + nullPadding.length < del_end) {
                                    offsets[i] = del_start - nullPadding.length;
                                } else {
                                    offsets[i] -= del_end - del_start;
                                }
                            }
                        }
                    }
                    if (mod[0] !== diff_match_patch.DIFF_DELETE) {
                        index1 += mod[1].length;
                    }
                }
            }
        }

        // Strip the padding off.
        text = text.substring(nullPadding.length, text.length - nullPadding.length);
        return text;
    },

    /**
     * Return cursor information in the meta-data
     */
    getMetaData: function() {
        var cursor = this.captureSimpleCursor();
        var data = { c: { s: cursor.startOffset, e: cursor.endOffset } };
        return JSON.stringify(data);
    },

    /**
     * Record basic information regarding the current cursor.
     * @return {Object?} Context information on the cursor in the format
     * { startOffset:..., endOffset:... }
     * @private
     */
    captureSimpleCursor: function() {
		//var selection = env.view.getSelectedRange();
		var selection = env.editor.selection;
		return this._convertRangeToOffsets(selection);
    },

    /**
     * Record full information regarding the current cursor.
     * @return {Object?} Context information on the cursor that extends the
     * information from captureSimpleCursor with:
     * { start[Prefix|Suffix]:"...", collapsed:boolean, end[Prefix|Suffix]:"..." }
     * @private
     */
    captureCursor: function() {
        var padLength = this.dmp.Match_MaxBits / 2;  // Normally 16.
        var text = env.model.getValue();

        var cursor = this.captureSimpleCursor();

        cursor.startPrefix = text.substring(cursor.startOffset - padLength, cursor.startOffset);
        cursor.startSuffix = text.substring(cursor.startOffset, cursor.startOffset + padLength);
        cursor.collapsed = (cursor.startOffset == cursor.endOffset);
        if (!cursor.collapsed) {
            cursor.endPrefix = text.substring(cursor.endOffset - padLength, cursor.endOffset);
            cursor.endSuffix = text.substring(cursor.endOffset, cursor.endOffset + padLength);
        }

		// TODO: what to do with scroll bars?
        //var ui = this.editor.ui;
        // HTMLElement.scrollTop = editor.ui.yoffset
        // HTMLElement.scrollHeight = editor.ui.yscrollbar.extent
        // cursor.scroll[Top|Left] are decimals from 0 - 1
        //cursor.scrollTop = ui.yoffset / ui.yscrollbar.extent;
        // HTMLElement.scrollLeft = editor.ui.xoffset
        // HTMLElement.scrollWidth = editor.ui.xscrollbar.extent
        //cursor.scrollLeft = ui.xoffset / ui.xscrollbar.extent;

        return cursor;
    },

    /**
     * Attempt to restore the cursor's location.
     * @param {Object} cursor Context information of the cursor.
     * @private
     */
    restoreCursor: function(cursor) {
        // TODO: There are 2 ways to optimize this if we need to.
        // The first is to do simple checks like checking the current line is
        // the same before and after insert, and then skipping the whole thing
        // (We perhaps need to do something to avoid duplicate matches like
        // ignoring blank lines or matching 3 lines or similar)
        // OR we could make the restore use row/col positioning rather than
        // offset from start. The latter could be lots of work

        var dmp = this.dmp;
        // Set some constants which tweak the matching behavior.
        // Maximum distance to search from expected location.
        dmp.Match_Distance = 1000;
        // At what point is no match declared (0.0 = perfection, 1.0 = very loose)
        dmp.Match_Threshold = 0.9;

        var padLength = dmp.Match_MaxBits / 2; // Normally 16.
        //var newText = env.model.getValue();
        var newText = env.editor.value;

        // Find the start of the selection in the new text.
        var pattern1 = cursor.startPrefix + cursor.startSuffix;
        var pattern2, diff;
        var cursorStartPoint = dmp.match_main(newText, pattern1,
                cursor.startOffset - padLength);

        if (cursorStartPoint !== null) {
            pattern2 = newText.substring(cursorStartPoint, cursorStartPoint + pattern1.length);
            //alert(pattern1 + "\nvs\n" + pattern2);
            // Run a diff to get a framework of equivalent indices.
            diff = dmp.diff_main(pattern1, pattern2, false);
            cursorStartPoint += dmp.diff_xIndex(diff, cursor.startPrefix.length);
        }

        var cursorEndPoint = null;
        if (!cursor.collapsed) {
            // Find the end of the selection in the new text.
            pattern1 = cursor.endPrefix + cursor.endSuffix;

            cursorEndPoint = dmp.match_main(newText, pattern1,
                    cursor.endOffset - padLength);

            if (cursorEndPoint !== null) {
                pattern2 = newText.substring(cursorEndPoint, cursorEndPoint + pattern1.length);
                //alert(pattern1 + "\nvs\n" + pattern2);
                // Run a diff to get a framework of equivalent indices.
                diff = dmp.diff_main(pattern1, pattern2, false);
                cursorEndPoint += dmp.diff_xIndex(diff, cursor.endPrefix.length);
            }
        }

        // Deal with loose ends
        if (cursorStartPoint === null && cursorEndPoint !== null) {
            // Lost the start point of the selection, but we have the end point.
            // Collapse to end point.
            cursorStartPoint = cursorEndPoint;
        } else if (cursorStartPoint === null && cursorEndPoint === null) {
            // Lost both start and end points.
            // Jump to the offset of start.
            cursorStartPoint = cursor.startOffset;
        }
        if (cursorEndPoint === null) {
            // End not known, collapse to start.
            cursorEndPoint = cursorStartPoint;
        }

        // Cursor position
        var range = this._convertOffsetsToRange(cursorStartPoint, cursorEndPoint);
		env.editor.selection = range;
		
		/*
		var view = env.view;
		view.moveCursorTo(range.start);

        // Selection
        if (cursorEndPoint != cursorStartPoint) {
			view.moveCursorTo(range.end, true);
        }
		*/

		// TODO: what to do with scroll bars?
        // Scroll bars
        //var ui = this.editor.ui;
        //ui.yscrollbar.setValue(-(cursor.scrollTop * ui.yscrollbar.extent));
        //ui.xscrollbar.setValue(-(cursor.scrollLeft * ui.xscrollbar.extent));
    },
	
    /**
     * Convert range (two row-col pairs) to offsets.
     * @param {Object} range Normalized Range object {start: {row, col}, end: {row, col}}
     * @return {Object} Offsets object {startOffset, endOffset}
     * @private
     */
	_convertRangeToOffsets: function(range){
		var lines = env.model.lines;
		var startOffset = 0;
		var endOffset = 0;
		
		if (lines.length) {
			var offset = 0;
			var i = 0;
			var l = Math.min(range.start.row, lines.length);
			for (; i < l; ++i) {
				offset += lines[i].length + 1; // +1 for LF
			}
			startOffset = offset + Math.min(range.start.col, i < lines.length ? lines[i].length : 0);
			
			l = Math.min(range.end.row, lines.length);
			for (; i < l; ++i) {
				offset += lines[i].length + 1; // +1 for LF
			}
			endOffset = offset + Math.min(range.end.col, i < lines.length ? lines[i].length : 0);
		}
		
		return {startOffset: startOffset, endOffset: endOffset};
	},
	
    /**
     * Convert offsets to a normalized range.
     * @param {Number} startOffset Start offset
     * @param {Number?} endOffset End offset
     * @return {Object} Normalized Range object {start: {row, col}, end: {row, col}}
     * @private
     */
	_convertOffsetsToRange: function(startOffset, endOffset){
		var lines = env.model.lines;

		if (typeof endOffset != 'number') {
			endOffset = startOffset;
		} else if (endOffset < startOffset) {
			var temp = startOffset;
			startOffset = endOffset;
			endOffset = temp;
		}

		var offset = 0;
		var newOffset;
		for (var i = 0, l = lines.length; i < l; ++i) {
			newOffset = offset + lines[i].length + 1;
			if (startOffset < newOffset) {
				break;
			}
			offset = newOffset;
		}
		var startRow = i;
		var startCol = i < l ? startOffset - offset : 0;
		
		for (; i < l; ++i) {
			newOffset = offset + lines[i].length + 1;
			if (endOffset < newOffset) {
				break;
			}
			offset = newOffset;
		}
		var endRow = i;
		var endCol = i < l ? endOffset - offset : 0;

		return {start: {row: startRow, col: startCol}, end: {row: endRow, col: endCol}};
	}
};

// adding missing prototype functions
// TODO: find a non-hackish way to do the same
for (var name in mobwrite.shareObj.prototype) {
	if (!(name in ShareNode.prototype)) {
		ShareNode.prototype[name] = mobwrite.shareObj.prototype[name];
	}
}

function shareHandler(shareNode) {
	return shareNode;
}

// Register this shareHandler with MobWrite.
mobwrite.shareHandlers.push(shareHandler);

var shareNode = null;

exports.mobwriteFileChanged = function() {
	if (env.session && env.file) {
		if (shareNode) {
			if (shareNode.fullPath == env.file.path) {
				return;
			} else {
				mobwrite.unshare([shareNode]);
			}
		}
		shareNode = new ShareNode();
		mobwrite.share(shareNode);
	}else{
		if (shareNode) {
			mobwrite.unshare([shareNode]);
			shareNode = null;
		}
	}
};

exports.mobwriteMsg = function(msg) {
	//console.log('TO mobwrite:\n', msg.text);
	mobwrite.reflect(msg.text);
	server.schedulePoll(mobwrite.syncInterval);
};

exports.onAppLaunched = function() {
	//TODO: major hack: polling to detect when a file was set!
	var h = setInterval(function() {
			if (env.session && env.file) {
				clearInterval(h);
				exports.mobwriteFileChanged();
			}
		}, 100);
};
