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
 *   Scott Ellis (mail@scottellis.com.au)
 *
 * ***** END LICENSE BLOCK ***** */

// = Python Syntax Highlighting Implementation =
//
// Module for syntax highlighting Python.

dojo.provide("bespin.syntax.simple.python");

// ** {{{ bespin.syntax.simple.Python }}} **
//
// Tracks syntax highlighting data on a per-line basis. This is a quick-and-dirty implementation that
// supports five basic highlights: keywords, punctuation, strings, comments, and "everything else", all
// lumped into one last bucket.

bespin.syntax.PythonConstants = {
   LINE_COMMENT: "comment",
   STRING: "string",
   KEYWORD: "keyword",
   PUNCTUATION: "punctuation",
   OTHER: "plain"
};

dojo.declare("bespin.syntax.simple.Python", null, {
   keywords: 'and as assert break class continue def del elif else except exec finally for from global ' +
       'if import in is lambda not or pass print raise return try while with yield'.split(" "),

   punctuation: '# { } > < / + - % * . , ; ( ) [ ] ? : = " \''.split(" "),

   highlight: function(line, meta) {
       if (!meta) meta = {};

       var K = bespin.syntax.PythonConstants;    // aliasing the constants for shorter reference ;-)

       // contains the individual style types as keys, with array of start/stop positions as value
       var regions = {};

       // current state, maintained as we parse through each character in the line; values at any time should be consistent
       var currentStyle = (meta.inTriquoteString) ? K.STRING : undefined;
       var currentRegion = {}; // should always have a start property for a non-blank buffer
       var buffer = "";

       // these properties are related to the parser state above but are special cases
       var stringChar = (meta.inTriquoteString && meta.stringChar) ? meta.stringChar : "";    // the characters used to start the current string
       var triquote = meta.inTriquoteString;

       for (var i = 0; i < line.length; i++) {
           var c = line.charAt(i);

           // check if we're in a string, and if this char ends it
           if (currentStyle == K.STRING) {
               if ((triquote && i >= 2
                             && c == stringChar
                             && line.charAt(i - 1) == stringChar
                             && line.charAt(i - 2) == stringChar
                             && (i == 2 || line.charAt(i - 3) != '\\'))
                               || (!triquote && c == stringChar && (i == 0 || line.charAt(i - 1) != '\\')))
               {
                   currentRegion.stop = i + 1;
                   this.addRegion(regions, currentStyle, currentRegion);
                   currentRegion = {};
                   currentStyle = undefined;
                   triquote = false;
                   buffer = "";
                   stringChar = "";
               } else {
                   if (buffer == "") currentRegion = { start: i };
                   buffer += c;
               }
               continue;
           }

           if (this.isWhiteSpaceOrPunctuation(c)) {
               // if the buffer is full, add it to the regions
               if (buffer != "") {
                   currentRegion.stop = i;

                   if (this.keywords.indexOf(buffer) != -1) {
                       // the buffer contains a keyword
                       currentStyle = K.KEYWORD;
                   } else {
                       currentStyle = K.OTHER;
                   }

                   this.addRegion(regions, currentStyle, currentRegion);
                   currentRegion = {};
                   stringChar = "";
                   buffer = "";
                   currentStyle = undefined;
               }

               if (this.isPunctuation(c)) {
                   // check for a line comment; this ends the parsing for the rest of the line
                   if (c == '#') {
                       currentRegion = { start: i, stop: line.length };
                       currentStyle = K.LINE_COMMENT;
                       this.addRegion(regions, currentStyle, currentRegion);
                       buffer = "";
                       currentStyle = undefined;
                       currentRegion = {};
                       break;      // once we get a line comment, we're done!
                   } else

                   if (c == "'" || c == '"') {
                       currentRegion = { start: i };
                       currentStyle = K.STRING;
                       stringChar = c;
                       if (i + 2 < line.length && line.charAt(i + 1) == c
&& line.charAt(i + 2) == c) {
                               triquote = true;
                               i+=2; // skip to after tripple quotes - dont want to prematurely detect end
                       }
                       buffer += c;
                       continue;
                   }

                   // add an ad-hoc region for just this one punctuation character
                   this.addRegion(regions, K.PUNCTUATION, { start: i, stop: i + 1 });
               }

               continue;
           }

           if (buffer == "") currentRegion = { start: i };
           buffer += c;
       }

       // check for a trailing character inside of a string
       if (buffer != "") {
           if (!currentStyle) currentStyle = K.OTHER;
           currentRegion.stop = line.length;
           this.addRegion(regions, currentStyle, currentRegion);
       }

       return { regions: regions, meta: { inTriquoteString: triquote, stringChar: stringChar } };
   },

   addRegion: function(regions, type, data) {
       if (!regions[type]) regions[type] = [];
       regions[type].push(data);
   },

   isWhiteSpaceOrPunctuation: function(ch) {
       return this.isPunctuation(ch) || this.isWhiteSpace(ch);
   },

   isPunctuation: function(ch) {
       return this.punctuation.indexOf(ch) != -1;
   },

   isWhiteSpace: function(ch) {
       return ch == " " || ch == "\t";
   }
});