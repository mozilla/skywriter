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
 *   Jacques Belissent (jacques@zembly.com)
 *
 * ***** END LICENSE BLOCK ***** */

var bespin = require("bespin");
var command = require("bespin/command");

/**
 * Basic code indentation utility.
 * Supported:<ul>
 * <li>html<ul>
 *   <li>handling empty html tags (img, br)
 *   <li>scriptlet markup <% ..... %></ul>
 * <li>javascript and other C-style languages
 * <li>css (treated as C)
 * <li>indentation of subset
 * </ul>
 * Not supported:<ul>
 * <li>line wrapping and splitting
 * <li>spacing normalization
 * </ul>
 */

/**
 * Register the 'format' command.
 */
command.store.addCommand({
    name: 'format',
    withKey: "CMD SHIFT F",
    preview: 'format source code or selection',
    description: 'Use this to indent the selected fragment of your code.  The entire source is indented if nothing is selected.',
    execute: function(self) {
        bespin.get("editor").ui.actions.formatCode();
    }
});

/**
 *
 */
exports.API = SC.Object.extend({
    setLanguage: function(language) {
        if (dojo.isString(language)) {
            language = language.toLowerCase();
        }
        switch (language) {
        case 'css':
        case 'javascript':
        case 'js':
        case 'java':
        case 'ecmascript':
            this.implementation = new exports.C();
            break;

        case 'html':
        case 'xhtml':
        case 'shtml':
        case 'xml':
        case 'fbml':
            this.implementation = new exports.ML();
            break;

        default:
            console.log("Error!!! unknown language type: " + language);
            this.implementation = new exports.Unknown();
            break;
        }
    },

    /**
     * @param source the entire source file
     * @param opt_pad the sequence of characters used for one indentation level
     * @param opt_section delimits a set of rows to indent. Supported properties
     * are start, the index of first row to indent, and end, the index following
     * that of the last row to indent
     */
    indent: function(source, pad, opt_section) {
        return this.implementation.indent(source, pad, opt_section);
    }
});

/**
 *
 */
bespin.subscribe("component:register:actions", function(e) {
    var actions = bespin.get('actions');

    actions.formatCode = dojo.hitch(actions, function(args) {
        var sel = this.editor.getSelection();
        var formatted;
        var section = null;
        var cursorPos = this.editor.cursorManager.getCursorPosition();

        // todo reposition cursor
        var code = this.editor.model.getDocument();
        if (sel) {
            // make these full lines
            sel.startPos.col = 0;
            if (sel.endPos.col > 0) {
                sel.endPos.row += 1;
                sel.endPos.col = 0;
            }
            this.editor.setSelection(sel);
            section = {
                start: sel.startPos.row,
                end: sel.endPos.row
            };
        }

        var formatter = bespin.get('formatter') || (function() {
            return bespin.register('formatter', new exports.API());
        })();

        formatter.setLanguage(this.editor.language);

        var padding = (function(tabSize) {
            var result = "";
            for (var x = 0; x < tabSize; x++) {
                result += " ";
            }
            return result;
        })(this.editor.getTabSize());

        formatted = formatter.indent(code, padding, section);

        if (!sel) {
            this.selectAll({});
        }

        this.insertChunk({
            chunk: formatted
        });

        if (!sel) {
            this.editor.setSelection(undefined);
            this.editor.cursorManager.moveCursor(cursorPos);
            this.repaint();
        }
    });
});

/**
 * Formatter base
 */
var Base = SC.Object.extend({
    calculateOffset: function(lines, currentLine) {
        if (!currentLine){currentLine = lines.length - 1;}
        var result = {
            row: 0,
            offset: ''
        };
        var offsetPattern = /(^\s*)(\S+)\s*/;
        for (var i = currentLine-1; i > 0; i--) {
            var m = offsetPattern.exec(lines[i]);
            if (m) {
                result.offset = m[1];
                result.row = i;
                break;
            }
        }
        return result;
    },

    /**
     * Indents a C-style syntax, such as java, javascript or C.
     * The initial offset, if not provided, is based on the indentation of
     * the first non-whitespace-only line.
     * @param pad intentation, e.g, a string containing tabs and/or spaces
     * @param offset base offset (optional)
     * @param source code fragment to indent
     */
    indent: function(source, pad, section) {
        var lines = source.split('\n');
        var saveStart = 0;

		// calculate offset based on first non empty line preceeding the section
		// to indent
		var baseOffset = '';
        var formatAll = false;
        if (!section) {
            formatAll = true;
            section = {
                start: 0,
                end: lines.length-1
            };
		} else {
            saveStart = section.start;
            var r = this.calculateOffset(lines, section.start);
            baseOffset = r.offset;
            section.start = r.row;
            formatAll = section.end >= lines.length - 1;
		}

        var scope = {
            level:     0,        // level to use for this line
            nextLevel: 0,        // level for next line after processing this
            comment:   false    // true if in multiline comment
        };

        //var pads = [offset];
        var currentOffset = baseOffset;
        for (var i = section.start; i < section.end; i++) {
            // first, remove all existing indentation
            lines[i] = lines[i].replace(/^\s+/, '').replace(/\s+$/, '');

            if (this.processLine(lines[i], scope) != 0) {
                var pads = [baseOffset];
                for (var j = 0; j < scope.level; j++) {
                    pads.push(pad);
                }
                currentOffset = pads.join('');
            }

            lines[i] = currentOffset + lines[i];
        }

        if (section.end < (lines.length - 1)) {
            lines.splice(section.end, lines.length-1);
        }
        if (saveStart > 0) {
            lines.splice(0, saveStart);
        }

        // compensate for lost new line in the selection formatting case
        if (!formatAll) {
            lines.push('');
        }
        return lines.join('\n');
    }
});

/**
 *
 */
exports.C = Base.extend({
    scopeChanges: {
        '{': 1,
        '(': 1,
        '[': 1,
        ']': -1,
        '}': -1,
        ')': -1
    },

    COND_START: '$',
    ML_COMMENT_START: '%',
    ML_COMMENT_END: '@',
    COMMENT: '#',
    CASE_START: '<',
    CASE_END: '>',

    calculateOffset: function(lines, currentLine) {
        var l = lines.slice(0, currentLine);

        // todo see if this could be avoided by doing the normalization before
        // calculating the offset.
        // remove multiline comments as they should not impact offset calculation
        var inComment = false;
        var i = 0;
        while (i < currentLine) {
            var pos;
            if (inComment) {
                pos = l[i].indexOf('*/');
                if (pos >= 0) {
                    l[i] = l[i].substr(pos + 2);
                    inComment = false;
                    i--;
                }
            } else {
                pos = l[i].indexOf('/*');
                if (pos >= 0) {
                    var s = l[i].substr(0, pos);
                    var pos1 = l[i].indexOf('*/', pos + 2);
                    if (pos1 >= 0) {
                        s += l[i].substr(pos + 2);
                        inComment = false;
                        l[i] = s;
                        i--;
                    } else {
                        inComment = true;
                        l[i] = s;
                    }
                }
            }
            i++;
        }

        var copyArgs = [l, currentLine];
        copyArgs.callee = arguments.callee;
        return this.inherited(copyArgs);
    },

    processLine: function(line, scope) {
        var change = 0;
        var previousLevel = scope.level;
        var lowWaterMark = 0;
        line = this.normalize(line, 0, scope.comment);
        scope.condLevel = scope.condLevel || 0;
        scope.condState = scope.condState || 0;

        for (var i = 0; i < line.length; i++) {
            switch (line[i]) {
            case '{':
                change += 1;
                if (scope.condState == 3) {
                    // good.  curlies are used.  turn off next line indent.
                    scope.condState = 0;
                }
                if (scope.inCase) {
                    // need to keep track of this to detect end of switch
                    scope.caseLevel++;
                }
                break;

            case this.CASE_START:
                if (!scope.inCase) {
                    change += 1;
                } else {
                    lowWaterMark -= 1; // fallthrough scenario
                }
                scope.inCase = true;
                scope.caseLevel = 0;
                break;

            case '}':
                change -= 1;
                if (scope.inCase) {
                    if (scope.caseLevel > 0) {
                        scope.caseLevel -= 1;
                    } else {
                        // end of switch statement without break.  scope goes
                        // down one more.
                        change -= 1;
                        scope.inCase = false;
                    }
                }
                lowWaterMark = (lowWaterMark < change) ? lowWaterMark : change;
                break;

            case this.CASE_END:
                change -= 1;
                lowWaterMark = (lowWaterMark < change) ? lowWaterMark : change;
                scope.inCase = false;
                break;

            case '[':
                change += 1;
                break;

            case ']':
                change -= 1;
                lowWaterMark = (lowWaterMark < change) ? lowWaterMark : change;
                break;

            case '(':
                switch (scope.condState) {
                    case 1:
                        // now we are inside the condition
                        scope.condState = 2;
                        break;
                    case 2:
                        // need to do this in order to detect end of condition
                        scope.parentInCondition++;
                        break;
                    default: break;
                }
                change += 1;
                break;

            case ')':
                change -= 1;
                if (scope.condState == 2) {
                    if (scope.parenInCondition > 0) {
                        scope.parentInCondition--;
                    } else {
                        // condition is done.  now the statement
                        scope.condState = 3;
                    }
                }
                lowWaterMark = (lowWaterMark < change) ? lowWaterMark : change;
                break;

            case this.ML_COMMENT_START:
                scope.comment = true;
                break;

            case this.ML_COMMENT_END:
                scope.comment = false;
                break;

            case this.COND_START:
                scope.condState = 1;
                scope.parenInCondition = 0;
                break;

            case ';':
                if (scope.condState == 3) {
                    // no need to indent next line
                    scope.condState = 0;
                }
                break;

            default:
                break;
            }
        }

        scope.level = scope.nextLevel + lowWaterMark;

        // scope.condState is used to support evil non-bracketed condition or
        // loop statements.  state values are as follows:
        //
        // 0: not in a condition or loop, or curly brackets are used
        // 1: condition of loop keyword detected
        // 2: in condition
        // 3: after condition on the same line
        // 4: on line following condition (the one that needs indentation)

        var condLevelChange = 0;
        if (scope.condState == 3) {
            scope.condLevel++;
            scope.condState = 4;
            condLevelChange = 1;
        } else if (scope.condState == 4) {
            condLevelChange = -scope.condLevel;
            scope.condLevel = 0;
            scope.condState = 0;
        }
        scope.nextLevel += change + condLevelChange;

        // avoid overflattening in case of mistakes or selection
        if (scope.nextLevel < 0) {
            scope.nextLevel = 0;
        }

        return (previousLevel != scope.level) || lowWaterMark;
    },

    /**
     * Replaces all quoted or commented sections of a line with a character
     * that will not interfere with indentation.
     * @param s input string
     * @param offset where to start looking in the string
     * @param inComment true if beginning of the line is included in a multiline
     *        comment.
     * @return an object containing the modified string and the updated inComment
     * state.
     */
    normalize: function(s, offset, inMultilineComment) {
        // remove escaped quotes
        if (!s) {
            return {
                escaped: s,
                comment: inMultilineComment
            };
        }

        s = s.replace(/\\"/g, '')            // remove escaped quotations
            .replace(/\\'/g, '')
            .replace(/[@#$%<>]/g, '')        // these characters will be used later
            .replace(/\bif\b/g, this.COND_START)    // replace loop and conditional
            .replace(/\belse\b/g, this.COND_START)// operators with single characters
            .replace(/\bfor\b/g, this.COND_START) // (already stripped)
            .replace(/\bwhile\b/g, this.COND_START)
            .replace(/\bcase\b/g, this.CASE_START)
            .replace(/\bdefault\b/g, this.CASE_START)
            .replace(/\bbreak\b/g, this.CASE_END)
            .replace(/\/\*/g, this.ML_COMMENT_START)
            .replace(/\*\//g, this.ML_COMMENT_END)
            .replace(/\/\//g, this.COMMENT)
            .replace(/[\w\s]/g, '');    // none of these matter

        var out = [];

        // now remove anything which is either quoted or commented.
        var quoteChar = null;
        var inQuotes = false, inlineComment = false;
        for (var i = offset; i < s.length; i++) {
            var c = s[i];
            if (inlineComment) {
                continue;
            } else if (inMultilineComment) {
                if (s[i] == this.ML_COMMENT_END) {
                    inMultilineComment = false;
                } else {
                    continue;
                }
            } else if (inQuotes) {
                if (s[i] == quoteChar) {
                    inQuotes = false;
                    quoteChar = null;
                } else {
                    continue;
                }
            } else {
                if (s[i] == this.COMMENT) {
                    inlineComment = true;
                } else if (s[i] == "'" || s[i] == '"') {
                    inQuotes = true;
                    quoteChar = s[i];
                } else if (s[i] == this.ML_COMMENT_START) {
                    inMultilineComment = true;
                }
            }
            out.push(c);
        }

        s = out.join('');
        return s;
    }

});

/**
 *
 */
exports.ML = Base.extend({
    emptyElements: [
        'area',
        'base',
        'basefont',
        'br',
        'col',
        'frame',
        'hr',
        'img',
        'input',
        'isindex',
        'link',
        'meta',
        'param'
    ],

    indent: function(source, pad, section) {
        // before calling the generic _indent, fixup some usual suspects
        source = source
            .replace(/<BR>/, '<BR/>')
            .replace(/<br>/, '<br/>');
        var copyArgs = [source, pad, section];
        copyArgs.callee = arguments.callee;
        return this.inherited(copyArgs);
    },

    processLine: function(line, scope) {
        var s = line;
        var change = 0;
        var lowWaterMark = 0;
        var offset = 0;
        var previousLevel = scope.level;

        scope.lonelyCloser = false;
        var inScriptlet = scope.scriptlet;
        var inQuotes = false;
        var inOpenTag = scope.inTag;
        var inEmptyTag = scope.inEmptyTag;
        var inEndTag = false;
        var inComment = scope.comment;
        var quoteChar;

        for (var i = 0; i < line.length; i++) {
            if (inQuotes) {
                if (s[i] == quoteChar && (i == offset || s[i-1] != '\\')) {
                    inQuotes = false;
                }
            } else if (inScriptlet) {
                if (i > offset && s[i] == ">" && s[i-1] == '%') {
                    inScriptlet = false;
                    change -= 1;
                    lowWaterMark = (lowWaterMark < change) ? lowWaterMark : change;
                }
            } else if (inComment) {
                if (i > offset+1 && s[i] == ">" && s[i-1] == '-' && s[i-2] == '-') {
                    inComment = false;
                    change -= 1;
                    lowWaterMark = (lowWaterMark < change) ? lowWaterMark : change;
                }
            } else if (inOpenTag) {
                if (s[i] == ">") {
                    if (!inEmptyTag && i > offset && s[i-1] == '/') {
                        change -= 1;
                    }
                    inOpenTag = false;
                }
            } else if (inEndTag) {
                if (s[i] == ">") {
                    inEndTag = false;
                    if (!inEmptyTag) {
                        change -= 1;
                        lowWaterMark = (lowWaterMark < change) ? lowWaterMark : change;
                    }
                }
            } else {
                if (i < line.length-3 && s[i] == "<" && s[i+1] == '!' && s[i+2] == '-' && s[i+3] == '-') {
                    inComment = true;
                    change += 1;
                } else if (s[i] == "'" || s[i] == '"') {
                    quoteChar = s[i];
                    inQuotes = true;
                } else if (s[i] == '<') {
                    if (i < line.length-1 && s[i+1] == '/') {
                        inEmptyTag = this.isEmptyTag(line, i+2);
                        inEndTag = true;
                    } else if (i < line.length-1 && s[i+1] == '%') {
                        inScriptlet = true;
                        change += 1;
                    } else {
                        inEmptyTag = this.isEmptyTag(line, i+1);
                        if (!inEmptyTag) {
                            change += 1;
                        }
                        inOpenTag = true;
                    }
                }
            }
        }

        scope.level = scope.nextLevel + lowWaterMark;
        scope.nextLevel += change;
        scope.inTag = inOpenTag;
        scope.inEmptyTag = inEmptyTag;
        scope.comment = inComment;
        scope.scriptlet = inScriptlet;

        return (previousLevel != scope.level) || lowWaterMark;
    },

    isEmptyTag: function(line, offset) {
        var tagName = '';
        for (var j = offset; j < line.length; j++) {
            if (/[\s>]/.test(line[j])) {
                break;
            } else {
                tagName += line[j];
            }
        }
        tagName = tagName.toLowerCase();
        for (var i = 0; i < this.emptyElements.length; i++) {
            if (tagName == this.emptyElements[i]) {
                return true;
            }
        }
        return false;
    }

});

/**
 *
 */
exports.Unknown = Base.extend({
    indent: function(source, pad, section) {
        return source;
    }
});
