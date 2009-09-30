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

// = C Syntax Highlighting Implementation =
//
// Module for syntax highlighting C Sharp based off of the Geshi Sytax Highlighter.

dojo.provide("bespin.syntax.simple.csharp");

// ** {{{ bespin.syntax.simple.CSharp }}} **
//
// Tracks syntax highlighting data on a per-line basis. This is a quick-and-dirty implementation that
// supports five basic highlights: keywords, punctuation, strings, comments, and "everything else", all
// lumped into one last bucket.

bespin.syntax.CSharpConstants = {
    C_STYLE_COMMENT: "c-comment",
    LINE_COMMENT: "comment",
    STRING: "string",
    KEYWORD: "keyword",
    PUNCTUATION: "punctuation",
    OTHER: "plain"
};

dojo.declare("bespin.syntax.simple.CSharp", null, {
    keywords: 'break case continue default do else for goto if return' +
'switch throw while' +
'NULL false true enum errno EDOM' +
'ERANGE FLT_RADIX FLT_ROUNDS FLT_DIG DBL_DIG LDBL_DIG' +
'FLT_EPSILON DBL_EPSILON LDBL_EPSILON FLT_MANT_DIG DBL_MANT_DIG' +
'LDBL_MANT_DIG FLT_MAX DBL_MAX LDBL_MAX FLT_MAX_EXP DBL_MAX_EXP' +
'LDBL_MAX_EXP FLT_MIN DBL_MIN LDBL_MIN FLT_MIN_EXP DBL_MIN_EXP' +
'LDBL_MIN_EXP CHAR_BIT CHAR_MAX CHAR_MIN SCHAR_MAX SCHAR_MIN' +
'UCHAR_MAX SHRT_MAX SHRT_MIN USHRT_MAX INT_MAX INT_MIN' +
'UINT_MAX LONG_MAX LONG_MIN ULONG_MAX HUGE_VAL SIGABRT' +
'SIGFPE SIGILL SIGINT SIGSEGV SIGTERM SIG_DFL SIG_ERR' +
'SIG_IGN BUFSIZ EOF FILENAME_MAX FOPEN_MAX L_tmpnam' +
'SEEK_CUR SEEK_END SEEK_SET TMP_MAX stdin stdout stderr' +
'EXIT_FAILURE EXIT_SUCCESS RAND_MAX CLOCKS_PER_SEC' +
'virtual public private protected template using namespace' +
'try catch inline dynamic_cast const_cast reinterpret_cast' +
'static_cast explicit friend wchar_t typename typeid class' +
'cin cerr clog cout delete new this' +
'printf fprintf snprintf sprintf assert' +
'isalnum isalpha isdigit iscntrl isgraph islower isprint' +
'ispunct isspace isupper isxdigit tolower toupper' +
'exp log log10 pow sqrt ceil floor fabs ldexp' +
'frexp modf fmod sin cos tan asin acos atan atan2' +
'sinh cosh tanh setjmp longjmp' +
'va_start va_arg va_end offsetof sizeof fopen freopen' +
'fflush fclose remove rename tmpfile tmpname setvbuf' +
'setbuf vfprintf vprintf vsprintf fscanf scanf sscanf' +
'fgetc fgets fputc fputs getc getchar gets putc' +
'putchar puts ungetc fread fwrite fseek ftell rewind' +
'fgetpos fsetpos clearerr feof ferror perror abs labs' +
'div ldiv atof atoi atol strtod strtol strtoul calloc' +
'malloc realloc free abort exit atexit system getenv' +
'bsearch qsort rand srand strcpy strncpy strcat strncat' +
'strcmp strncmp strcoll strchr strrchr strspn strcspn' +
'strpbrk strstr strlen strerror strtok strxfrm memcpy' +
'memmove memcmp memchr memset clock time difftime mktime' +
'auto bool char const double float int long longint' +
'register short shortint signed static struct' +
'typedef union unsigned void volatile extern jmp_buf' +
'signal raise va_list ptrdiff_t size_t FILE fpos_t' +
'div_t ldiv_t clock_t time_t tm'.split(" "),

    punctuation: '{ } # > < / + - % * . , ; ( ) ? : = " \''.split(" "),

    highlight: function(line, meta) {
        if (!meta) meta = {};

        var K = bespin.syntax.CSharpConstants;    // aliasing the constants for shorter reference ;-)

        var regions = {};                               // contains the individual style types as keys, with array of start/stop positions as value

        // current state, maintained as we parse through each character in the line; values at any time should be consistent
        var currentStyle = (meta.inMultilineComment) ? K.C_STYLE_COMMENT : undefined;
        var currentRegion = {}; // should always have a start property for a non-blank buffer
        var buffer = "";

        // these properties are related to the parser state above but are special cases
        var stringChar = "";    // the character used to start the current string
        var multiline = meta.inMultilineComment;

        for (var i = 0; i < line.length; i++) {
            var c = line.charAt(i);

            // check if we're in a comment and whether this character ends the comment
            if (currentStyle == K.C_STYLE_COMMENT) {
                if (c == "/" && /\*$/.test(buffer)) { // has the c-style comment just ended?
                    currentRegion.stop = i + 1;
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    currentStyle = undefined;
                    multiline = false;
                    buffer = "";
                } else {
                    if (buffer == "") currentRegion = { start: i };
                    buffer += c;
                }

                continue;
            }

            if (this.isWhiteSpaceOrPunctuation(c)) {
                // check if we're in a string
                if (currentStyle == K.STRING) {
                    // if this is not an unescaped end quote (either a single quote or double quote to match how the string started) then keep going
                    if ( ! (c == stringChar && !/\\$/.test(buffer))) {
                        if (buffer == "") currentRegion = { start: i };
                        buffer += c;
                        continue;
                    }
                }

                // if the buffer is full, add it to the regions
                if (buffer != "") {
                    currentRegion.stop = i;

                    if (currentStyle != K.STRING) {   // if this is a string, we're all set to add it; if not, figure out if its a keyword
                        if (this.keywords.indexOf(buffer) != -1) {
                            // the buffer contains a keyword
                            currentStyle = K.KEYWORD;
                        } else {
                            currentStyle = K.OTHER;
                        }
                    }
                    this.addRegion(regions, currentStyle, currentRegion);
                    currentRegion = {};
                    stringChar = "";
                    buffer = "";
                    // i don't clear the current style here so I can check if it was a string below
                }

                if (this.isPunctuation(c)) {
                    if (c == "*" && i > 0 && (line.charAt(i - 1) == "/")) {
                        // remove the previous region in the punctuation bucket, which is a forward slash
                        regions[K.PUNCTUATION].pop();

                        // we are in a c-style comment
                        multiline = true;
                        currentStyle = K.C_STYLE_COMMENT;
                        currentRegion = { start: i - 1 };
                        buffer = "/*";
                        continue;
                    }

                    // check for a line comment; this ends the parsing for the rest of the line
                    if (c == '/' && i > 0 && (line.charAt(i - 1) == '/')) {
                        currentRegion = { start: i - 1, stop: line.length };
                        currentStyle = K.LINE_COMMENT;
                        this.addRegion(regions, currentStyle, currentRegion);
                        buffer = "";
                        currentStyle = undefined;
                        currentRegion = {};
                        break;      // once we get a line comment, we're done!
                    }

                    // add an ad-hoc region for just this one punctuation character
                    this.addRegion(regions, K.PUNCTUATION, { start: i, stop: i + 1 });
                }

                // find out if the current quote is the end or the beginning of the string
                if ((c == "'" || c == '"') && (currentStyle != K.STRING)) {
                    currentStyle = K.STRING;
                    stringChar = c;
                } else {
                    currentStyle = undefined;
                }

                continue;
            }

            if (buffer == "") currentRegion = { start: i };
            buffer += c;
        }

        // check for a trailing character inside of a string or a comment
        if (buffer != "") {
            if (!currentStyle) currentStyle = K.OTHER;
            currentRegion.stop = line.length;
            this.addRegion(regions, currentStyle, currentRegion);
        }

        return { regions: regions, meta: { inMultilineComment: multiline } };
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
        return ch == " ";
    }
});
