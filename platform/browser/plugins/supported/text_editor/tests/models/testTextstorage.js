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
var TextStorage = require('models/textstorage').TextStorage;

exports.testCharacterMutators = function() {
    var storage = TextStorage.create({});
    storage.insertCharacters({ row: 0, col: 0 }, 'foo\nbar\nbaz\n');
    t.equal(storage.getValue(), 'foo\nbar\nbaz\n',
        'characters inserted into an empty text storage object and the ' +
            'original characters');
    var lines = storage.lines;
    t.equal(lines[0].length, 3, 'length of first row and 3');
    t.equal(lines[1].length, 3, 'length of second row and 3');
    t.equal(lines[2].length, 3, 'length of third row and 3');
    t.equal(lines[3].length, 0, 'length of last row and 0');

    storage.deleteCharacters({
        start: { row: 1, col: 1 },
        end:   { row: 2, col: 2 }
    });
    t.equal(storage.getValue(), 'foo\nbz\n',
        'the result of deleting characters from a text storage object and ' +
            'the expected string');
    t.equal(lines[0].length, 3, 'length of first row and 3');
    t.equal(lines[1].length, 2, 'length of second row and 2');
    t.equal(lines[2].length, 0, 'length of last row and 0');

    storage.replaceCharacters({
        start: { row: 0, col: 2 },
        end:   { row: 1, col: 1 }
    }, 'obarba');
    t.equal(storage.getValue(), 'foobarbaz\n',
        'the result of replacing characters in a text storage object and ' +
            'the expected string');
    t.equal(lines[0].length, 9, 'length of first row and 9');
};

exports.testClampPosition = function() {
    var storage = TextStorage.create({});
    storage.insertCharacters({ row: 0, col: 0 }, 'foo\nbar\nbaz\n');

    t.deepEqual(storage.clampPosition({ row: 1, col: 1 }),
        { row: 1, col: 1 },
        '(1,1) clamped to the text boundaries and (1,1)');

    t.deepEqual(storage.clampPosition({ row: -1, col: -1 }),
        { row: 0, col: 0 },
        '(-1,-1) clamped to the text boundaries and (0,0)');
    t.deepEqual(storage.clampPosition({ row: -1, col: 1 }),
        { row: 0, col: 0 },
        '(-1,1) clamped to the text boundaries and (0,0)');
    t.deepEqual(storage.clampPosition({ row: -1, col: 4 }),
        { row: 0, col: 0 },
        '(-1,4) clamped to the text boundaries and (0,0)');

    t.deepEqual(storage.clampPosition({ row: 1, col: -1 }),
        { row: 1, col: 0 },
        '(1,-1) clamped to the text boundaries and (1,0)');
    t.deepEqual(storage.clampPosition({ row: 1, col: 1 }),
        { row: 1, col: 1 },
        '(1,1) clamped to the text boundaries and (1,1)');
    t.deepEqual(storage.clampPosition({ row: 1, col: 4 }),
        { row: 1, col: 3 },
        '(1,4) clamped to the text boundaries and (1,3)');

    t.deepEqual(storage.clampPosition({ row: 4, col: -1 }),
        { row: 3, col: 0 },
        '(4,-1) clamped to the text boundaries and (3,0)');
    t.deepEqual(storage.clampPosition({ row: 4, col: 2 }),
        { row: 3, col: 0 },
        '(4,2) clamped to the text boundaries and (3,0)');
    t.deepEqual(storage.clampPosition({ row: 4, col: 4 }),
        { row: 3, col: 0 },
        '(4,4) clamped to the text boundaries and (3,0)');
};

exports.testClampRange = function() {
    var storage = TextStorage.create({});
    storage.insertCharacters({ row: 0, col: 0 }, 'foo\nbar\nbaz\n');

    var range = { start: { row: 0, col: 0 }, end: { row: 3, col: 0 } };

    t.deepEqual(storage.clampRange(range), range,
        '(0,0) (3,0) clamped to the text boundaries and (0,0) (3,0)');
    t.deepEqual(storage.clampRange({
            start:  { row: -1, col: -1 },
            end:    { row: 4, col: 4 }
        }), range,
        '(-1,-1) (4,4) clamped to the text boundaries and (0,0) (3,0)');
};

exports.testDisplacePosition = function() {
    var storage = TextStorage.create({});
    storage.insertCharacters({ row: 0, col: 0 }, 'foo\nbar\nbaz\n');

    t.deepEqual(storage.displacePosition({ row: 1, col: 1 }, -1),
        { row: 1, col: 0 }, '(1,1) displaced by -1 and (1,0)');
    t.deepEqual(storage.displacePosition({ row: 1, col: 0 }, -1),
        { row: 0, col: 3 }, '(1,0) displaced by -1 and (0,3)');
    t.deepEqual(storage.displacePosition({ row: 0, col: 0 }, -1),
        { row: 0, col: 0 }, '(0,0) displaced by -1 and (0,0)');

    t.deepEqual(storage.displacePosition({ row: 1, col: 1 }, 1),
        { row: 1, col: 2 }, '(1,1) displaced by 1 and (1,2)');
    t.deepEqual(storage.displacePosition({ row: 1, col: 3 }, 1),
        { row: 2, col: 0 }, '(1,3) displaced by 1 and (2,0)');
    t.deepEqual(storage.displacePosition({ row: 3, col: 0 }, 1),
        { row: 3, col: 0 }, '(3,0) displaced by 1 and (3,0)');
};

exports.testGetCharacters = function() {
    var storage = TextStorage.create();
    storage.setValue('foo\nbar\nbaz\n');

    t.equal(storage.getCharacters({
            start:  { row: 0, col: 1 },
            end:    { row: 1, col: 2 }
        }), 'oo\nba', 'the characters in the range (0,1 1,2) and \"oo\\nba\"');
    t.equal(storage.getCharacters({
            start:  { row: 2, col: 0 },
            end:    { row: 2, col: 3 }
        }), 'baz', 'the characters in the range (2,0 2,3) and \"baz\"');
    t.equal(storage.getCharacters({
            start:  { row: 2, col: 3 },
            end:    { row: 3, col: 0 }
        }), '\n', 'the characters in the range (2,3 3,0) and \"\\n\"');
};

exports.testObserving = function() {
    var storage = TextStorage.create({});
    storage.insertCharacters({ row: 0, col: 0 }, 'foo\nbar\nbaz\n');

    var called = false;
    var delegate = {
        textStorageEdited: function(storage, oldRange, newRange) {
            called = true;
            // t.deepEqual(oldRange, deletionRange, 'the old range passed in ' +
            //     'to textStorageEdited and the actual range deleted');
            t.deepEqual(newRange, {
                start:  deletionRange.start,
                end:    deletionRange.start
            }, 'the new range passed in to textStorageEdited and a zero-' +
                'length range located at the start of the deleted range');
        }
    };
    storage.addDelegate(delegate);

    var deletionRange = {
        start: { row: 0, col: 1 },
        end:   { row: 2, col: 2 }
    };

    storage.deleteCharacters(deletionRange);
    t.ok(called, 'textStorageEdited() was called');
};

exports.testRange = function() {
    var storage = TextStorage.create({});
    storage.insertCharacters({ row: 0, col: 0 }, 'foo\nbar\nbaz\n');
    t.deepEqual(storage.range, {
        start:  { row: 0, col: 0 },
        end:    { row: 3, col: 0 }
    }, 'the character range and [ 0,0 3,0 ]');

    storage.deleteCharacters({
        start:  { row: 2, col: 3 },
        end:    { row: 3, col: 0 }
    });
    t.deepEqual(storage.range, {
        start:  { row: 0, col: 0 },
        end:    { row: 2, col: 3 }
    }, 'the character range and [ 0,0 2,3 ]');
};
