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

var SC = require('sproutcore/runtime').SC;
var t = require('PluginDev');
var LayoutManager = require('controllers/layoutmanager').LayoutManager;

var MockCatalog, MockExtension;

var setup = function() {
    MockCatalog = SC.Object.extend({
        _extensions: null,
        getExtensions: function(name) {
            if (name !== 'layoutannotations') {
                throw "only 'layoutannotations' is supported by this mock " +
                    "object";
            }
            return this._extensions;
        }
    });

    MockExtension = SC.Object.extend({
        _annotation: null,
        load: function(callback) {
            callback(this._annotation);
        }
    });
};

exports.testLayoutAnnotations = function() {
    setup();

    var annotationResults = [];

    var MockAnnotation = SC.Object.extend({
        _index: null,
        annotateLayout: function(textLines, range) {
            annotationResults[this._index] = {
                textLines:  textLines,
                range:      range
            };
            return range;
        }
    });

    var layoutManager = LayoutManager.create({
        pluginCatalog: MockCatalog.create({
            _extensions: [ 0, 1, 2 ].map(function(index) {
                return MockExtension.create({
                    _annotation: MockAnnotation.create({ _index: index })
                });
            })
        })
    });

    t.equal(annotationResults.length, 3, "the number of annotations that " +
        "were run and 3");

    var textLines = annotationResults[1].textLines;
    t.ok(!SC.none(textLines), "the text lines passed into the second " +
        "annotation are not null");
    t.equal(textLines.length, 1, "the number of text lines passed into the " +
        "second annotation and 1");
    t.equal(textLines[0].characters, "", "the characters passed into the " +
        "second annotation and the empty string");

    t.deepEqual(annotationResults[1].range, {
        start:  { row: 0, column: 0 },
        end:    { row: 0, column: 0 }
    }, "the range passed into the second annotation and [ 0 0, 0 0 ]");
};

exports.testLayoutComputation = function() {
    setup();

    var receivedTextLines, receivedRange;
    var layoutManager = LayoutManager.create({
        pluginCatalog: MockCatalog.create({
            _extensions: [
                MockExtension.create({
                    _annotation: SC.Object.create({
                        annotateLayout: function(textLines, range) {
                            receivedTextLines = textLines;
                            receivedRange = range;
                        }
                    })
                })
            ]
        })
    });

    var textStorage = layoutManager.get('textStorage');
    textStorage.set('value', "foo\nbar\nbaz\nboo\n");

    receivedTextLines = null;
    receivedRange = null;
    textStorage.replaceCharacters({
        start:  { row: 1, column: 1 },
        end:    { row: 2, column: 2 }
    }, "i");

    t.equal(textStorage.get('value'), "foo\nbiz\nboo\n",
        "the text storage value and \"foo\\nbiz\\nboo\\n\"");
    t.deepEqual(receivedRange, {
        start:  { row: 1, column: 1 },
        end:    { row: 1, column: 3 }
    }, "the range received by the annotation and [ 1 1, 1 3 ]");
    t.equal(receivedTextLines.length, 4, "the number of lines received by " +
        "the annotation and 4");
    t.equal(receivedTextLines[0].characters, "foo", "the characters in the " +
        "first line received by the annotation and \"foo\"");
    t.equal(receivedTextLines[1].characters, "biz", "the characters in the " +
        "second line received by the annotation and \"biz\"");
    t.equal(receivedTextLines[2].characters, "boo", "the characters in the " +
        "third line received by the annotation and \"boo\"");
    t.equal(receivedTextLines[3].characters, "", "the characters in the " +
        "fourth line received by the annotation and the empty string");
};

exports.testDimensionsCalculation = function() {
    setup();

    var layoutManager = LayoutManager.create({
        margin: { left: 0, bottom: 0, top: 0, right: 0 },
        pluginCatalog: MockCatalog.create({ _extensions: [] })
    });

    var textStorage = layoutManager.get('textStorage');
    textStorage.set('value',
        "Battlefield Earth\n" +
        "The Star Wars Holiday Special\n" +
        "Manos: The Hands of Fate\n" +
        "Santa Claus Conquers the Martians\n");

    var rect = layoutManager.boundingRect();
    t.equal(rect.height, layoutManager._lineHeight * 5,
        "the total height and the line height times the number of lines");
    t.equal(rect.width, layoutManager._characterWidth *
        "Santa Claus Conquers the Martians".length, "the width and the " +
        "character width times the length of the longest line");

    textStorage.replaceCharacters({
        start:  { row: 2, column: 0 },
        end:    { row: 3, column: "Santa Claus Conquers the Martians".length }
    }, "SuperBabies: Baby Geniuses 2");

    rect = layoutManager.boundingRect();
    t.equal(rect.height, layoutManager._lineHeight * 4,
        "the total and the line height times the new number of lines");
    t.equal(rect.width, layoutManager._characterWidth *
        "The Star Wars Holiday Special".length, "the width and the " +
        "character width times the length of what is now the longest line");
};

exports.testPointToCharacterMapping = function() {
    setup();

    var leftMargin = 3, topMargin = 5;
    var layoutManager = LayoutManager.create({
        margin: { left: leftMargin, bottom: 4, top: topMargin, right: 6 }
    });
    var characterWidth = layoutManager._characterWidth;
    var lineHeight = layoutManager._lineHeight;

    var textStorage = layoutManager.get('textStorage');
    textStorage.set('value',
        "Cwm fjord bank glyphs vext quiz.\n" +
        "Squdgy fez, blank jimp crwth vox!\n" +
        "Jink cwm, zag veldt, fob qursh pyx.\n" +
        "Veldt jynx grimps waqf zho buck.\n" +
        "Junky qoph-flags vext crwd zimb.\n" +
        "Quartz glyph job vex'd cwm finks.\n" +
        "Cwm fjord veg balks nth pyx quiz.\n" +
        "Vext cwm fly, zing, jabs kurd qoph.\n");

    var pos = layoutManager.characterAtPoint({
        x: leftMargin + 5 * characterWidth,
        y: topMargin + 2 * lineHeight
    });
    t.deepEqual(pos, { column: 5, row: 2, partialFraction: 0.0 }, "the " +
        "reported character position and the expected character position");

    pos = layoutManager.characterAtPoint({
        x: 100000,
        y: topMargin + 4 * lineHeight
    });
    t.deepEqual(pos, { column: 32, row: 4, partialFraction: 0.0 }, "the " +
        "reported character position and the expected character " +
        "position for a character off the right side of the text area");
};

