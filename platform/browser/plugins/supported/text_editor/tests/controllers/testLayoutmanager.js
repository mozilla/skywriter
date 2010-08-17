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

var t = require('plugindev');
var LayoutManager = require('controllers/layoutmanager').LayoutManager;

var PANGRAMS =
    'Cwm fjord bank glyphs vext quiz.\n' +
    'Squdgy fez, blank jimp crwth vox!\n' +
    'Jink cwm, zag veldt, fob qursh pyx.\n' +
    'Veldt jynx grimps waqf zho buck.\n' +
    'Junky qoph-flags vext crwd zimb.\n' +
    'Quartz glyph job vex\'d cwm finks.\n' +
    'Cwm fjord veg balks nth pyx quiz.\n' +
    'Vext cwm fly, zing, jabs kurd qoph.\n';

exports.testCharacterRectForPosition = function() {
    var layoutManager = new LayoutManager({
        margin: { left: 0, bottom: 0, top: 0, right: 0 }
    });
    layoutManager.textStorage.setValue(PANGRAMS);

    var characterWidth = layoutManager.characterWidth;
    var lineHeight = layoutManager.lineHeight;

    t.deepEqual(layoutManager.characterRectForPosition({ row: 3, col: 3 }), {
            x:      3 * characterWidth,
            y:      3 * lineHeight,
            width:  characterWidth,
            height: lineHeight
        }, 'the character rect and the expected rect for the character at ' +
        'position (3,3)');
};

exports.testDimensionsCalculation = function() {
    var layoutManager = new LayoutManager({
        margin: { left: 0, bottom: 0, top: 0, right: 0 }
    });

    var textStorage = layoutManager.textStorage;
    textStorage.setValue('Battlefield Earth\n' +
        'The Star Wars Holiday Special\n' +
        'Manos: The Hands of Fate\n' +
        'Santa Claus Conquers the Martians\n');

    var rect = layoutManager.boundingRect();
    t.equal(rect.height, layoutManager.lineHeight * 5,
        'the total height and the line height times the number of lines');
    t.equal(rect.width, layoutManager.characterWidth *
        'Santa Claus Conquers the Martians'.length, 'the width and the ' +
        'character width times the length of the longest line');

    textStorage.replaceCharacters({
        start:  { row: 2, col: 0 },
        end:    { row: 3, col: 'Santa Claus Conquers the Martians'.length }
    }, 'SuperBabies: Baby Geniuses 2');

    rect = layoutManager.boundingRect();
    t.equal(rect.height, layoutManager.lineHeight * 4,
        'the total and the line height times the new number of lines');
    t.equal(rect.width, layoutManager.characterWidth *
        'The Star Wars Holiday Special'.length, 'the width and the ' +
        'character width times the length of what is now the longest line');
};

exports.testInvalidRects = function() {
    var layoutManager = new LayoutManager({
        margin: { left: 0, bottom: 0, top: 0, right: 0 }
    });

    var textStorage = layoutManager.textStorage;
    textStorage.setValue('foo\nbar\nbaz\nboo\n');

    var characterWidth = layoutManager.characterWidth;
    var lineHeight = layoutManager.lineHeight;

    var returnedRects;
    layoutManager.addDelegate({
        layoutManagerInvalidatedRects: function(sender, rects) {
            returnedRects = rects;
        }
    });

    textStorage.insertCharacters({ row: 1, col: 1 }, 'aaa');
    t.deepEqual(returnedRects[0], {
            x:      characterWidth,
            y:      lineHeight,
            width:  Number.MAX_VALUE,
            height: lineHeight
        }, 'the returned rect and the expected rect after no lines changed');

    textStorage.deleteCharacters({
        start:  { row: 1, col: 0 },
        end:    { row: 2, col: 0 }
    });
    t.deepEqual(returnedRects[0], {
        x:      0,
        y:      lineHeight,
        width:  Number.MAX_VALUE,
        height: lineHeight
    }, 'the first returned rect and the expected rect after one line was ' +
        'deleted');
    t.deepEqual(returnedRects[1], {
        x:      0,
        y:      2 * lineHeight,
        width:  Number.MAX_VALUE,
        height: Number.MAX_VALUE
    }, 'the second returned rect and the expected rect after one line was ' +
        'deleted');

    textStorage.insertCharacters({ row: 1, col: 1 }, 'bar\n');
    t.deepEqual(returnedRects[0], {
        x:      characterWidth,
        y:      lineHeight,
        width:  Number.MAX_VALUE,
        height: lineHeight
    }, 'the first returned rect and the expected rect after one line was ' +
        'added');
    t.deepEqual(returnedRects[1], {
        x:      0,
        y:      2 * lineHeight,
        width:  Number.MAX_VALUE,
        height: Number.MAX_VALUE
    }, 'the second returned rect and the expected rect after one line was ' +
        'added');
};

exports.testPointToCharacterMapping = function() {
    var leftMargin = 3, topMargin = 5;
    var layoutManager = new LayoutManager({
        margin: { left: leftMargin, bottom: 4, top: topMargin, right: 6 }
    });
    var characterWidth = layoutManager.characterWidth;
    var lineHeight = layoutManager.lineHeight;

    layoutManager.textStorage.setValue(PANGRAMS);

    var pos = layoutManager.characterAtPoint({
        x: leftMargin + 5 * characterWidth,
        y: topMargin + 2 * lineHeight
    });
    t.deepEqual(pos, { col: 5, row: 2, partialFraction: 0.0 }, 'the ' +
        'reported character position and the expected character position');

    pos = layoutManager.characterAtPoint({
        x: 100000,
        y: topMargin + 4 * lineHeight
    });
    t.deepEqual(pos, { col: 32, row: 4, partialFraction: 0.0 }, 'the ' +
        'reported character position and the expected character ' +
        'position for a character off the right side of the text area');
};

exports.testRectsForRange = function() {
    var layoutManager = new LayoutManager({
        margin: { left: 0, bottom: 0, top: 0, right: 0 }
    });
    layoutManager.textStorage.setValue(PANGRAMS);

    var characterWidth = layoutManager.characterWidth;
    var lineHeight = layoutManager.lineHeight;
    var maximumWidth = layoutManager._maximumWidth;

    var rects = layoutManager.rectsForRange({
        start:  { row: 2, col: 2 },
        end:    { row: 5, col: 2 }
    });
    t.equal(rects.length, 3, 'the length of the rects returned for a ' +
        'complex range and 3');
    t.deepEqual(rects[0], {
            x:      2 * characterWidth,
            y:      2 * lineHeight,
            width:  characterWidth * (maximumWidth - 2),
            height: lineHeight
        }, 'the first rect returned for a complex range and the expected ' +
            'rect');
    t.deepEqual(rects[1], {
            x:      0,
            y:      5 * lineHeight,
            width:  characterWidth * 2,
            height: lineHeight
        }, 'the second rect returned for a complex range and the expected ' +
            'rect');
    t.deepEqual(rects[2], {
            x:      0,
            y:      3 * lineHeight,
            width:  characterWidth * maximumWidth,
            height: 2 * lineHeight
        }, 'the third rect returned for a complex range and the expected ' +
            'rect');

    rects = layoutManager.rectsForRange({
        start:  { row: 2, col: 0 },
        end:    { row: 5, col: 0 }
    });
    t.equal(rects.length, 1, 'the length of the rects returned for a ' +
        'line-spanning range and 1');
    t.deepEqual(rects[0], {
            x:      0,
            y:      2 * lineHeight,
            width:  characterWidth * maximumWidth,
            height: 3 * lineHeight
        }, 'the rect returned for a line-spanning range and the expected ' +
            'rect');

    rects = layoutManager.rectsForRange({
        start:  { row: 2, col: 3 },
        end:    { row: 2, col: 10 }
    });
    t.equal(rects.length, 1, 'the length of the rects returned for a ' +
        'single-line range and 1');
    t.deepEqual(rects[0], {
            x:      3 * characterWidth,
            y:      2 * lineHeight,
            width:  characterWidth * 7,
            height: lineHeight
        }, 'the rect returned for a single-line range and the expected rect');
};

