
var sys = require('sys');

/**
 *
 */
exports.inspect = function() {
  var output = '';
  for (var i = 0; i < arguments.length; i++) {
    if (i !== 0) {
      output += '\n';
    }
    output += exports.toDescriptiveString(arguments[i], 2);
  }
  sys.debug(output);
};

/**
 *
 */
exports.inspectDeep = function() {
  var output = '';
  for (var i = 0; i < arguments.length; i++) {
    if (i !== 0) {
      output += '\n';
    }
    output += exports.toDescriptiveString(arguments[i], 10);
  }
  sys.debug(output);
};

/**
 * This function pretty-prints simple data or whole object graphs, for example
 * as an aid in debugging.
 * @see http://getahead.org/dwr/browser/util/todescriptivestring
 */
exports.toDescriptiveString = function(data, showLevels, options) {
  if (showLevels === undefined) {
    showLevels = 1;
  }
  var opt = {};
  if (options && typeof options == "object") {
    opt = options;
  }
  var defaultoptions = {
    escapeHtml:false,
    baseIndent: "",
    childIndent: "\u00A0\u00A0",
    lineTerminator: "\n",
    oneLineMaxItems: 20,
    shortStringMaxLength: 13,
    longStringMaxLength: 53,
    propertyNameMaxLength: 30
  };
  for (var p in defaultoptions) {
    if (!(p in opt)) {
      opt[p] = defaultoptions[p];
    }
  }

  var skipDomProperties = {
    /*
    document:true, ownerDocument:true,
    all:true,
    parentElement:true, parentNode:true, offsetParent:true,
    children:true, firstChild:true, lastChild:true,
    previousSibling:true, nextSibling:true,
    innerHTML:true, outerHTML:true,
    innerText:true, outerText:true, textContent:true,
    attributes:true,
    style:true, currentStyle:true, runtimeStyle:true,
    parentTextEdit:true
    */
  };

  var shown = [];
  function isShown(obj) {
    for (var i = 0; i < shown.length; i++) {
      if (shown[i] === obj) {
        return true;
      }
    }
    return false;
  }

  function recursive(data, showLevels, indentDepth, options) {
    var reply = "";
    try {
      // string
      if (typeof data == "string") {
        var str = data;
        if (showLevels == 0 && str.length > options.shortStringMaxLength) {
            str = str.substring(0, options.shortStringMaxLength - 3) + "...";
        }
        else if (str.length > options.longStringMaxLength) {
            str = str.substring(0, options.longStringMaxLength - 3) + "...";
        }
        if (options.escapeHtml) {
          // Do the escape separately for every line as escapeHtml() on some
          // browsers (IE) will strip line breaks and we want to preserve them
          var lines = str.split("\n");
          for (var i = 0; i < lines.length; i++) {
            lines[i] = lines[i].
              replace(/&/g,'&amp;').
              replace(/</g,'&lt;').
              replace(/>/g,'&gt;');
          }
          str = lines.join("\n");
        }
        if (showLevels == 0) { // Short format
          str = str.replace(/\n|\r|\t/g, function(ch) {
            switch (ch) {
              case "\n": return "\\n";
              case "\r": return "";
              case "\t": return "\\t";
              default: throw new Error('logic error');
            }
          });
        }
        else { // Long format
          str = str.replace(/\n|\r|\t/g, function(ch) {
            switch (ch) {
              case "\n":
                return options.lineTerminator + indent(indentDepth + 1, options);
              case "\r":
                return "";
              case "\t":
                return "\\t";
            }
          });
        }
        reply = '"' + str + '"';
      }

      // function
      else if (typeof data == "function") {
        reply = "function";
      }

      // Array
      else if (data && data.join) {
        if (showLevels == 0) {
          // Short format (don't show items)
          reply = (data.length > 0) ? "[...]" : "[]";
        }
        else {
          // Long format (show items)
          var strarr = [];
          strarr.push("[");
          var count = 0;
          for (i = 0; i < data.length; i++) {
            if (! (i in data)) {
              continue;
            }
            var itemvalue = data[i];
            if (count > 0) {
              strarr.push(", ");
            }
            if (isShown(itemvalue)) {
              strarr.push("^^^");
              continue;
            }
            shown.push(itemvalue);
            if (showLevels === 1) { // One-line format
              if (count == options.oneLineMaxItems) {
                strarr.push("...");
                break;
              }
            }
            else if (data.length === 1) {
              strarr.push(" ");
            }
            else { // Multi-line format
              strarr.push(options.lineTerminator + indent(indentDepth+1, options));
            }
            if (i != count) {
              strarr.push(i);
              strarr.push(":");
            }
            strarr.push(recursive(itemvalue, showLevels-1, indentDepth+1, options));
            count++;
          }
          if (data.length === 1) {
            strarr.push(" ");
          }
          else if (showLevels > 1) {
            strarr.push(options.lineTerminator + indent(indentDepth, options));
          }
          strarr.push("]");
          reply = strarr.join("");
        }
      }

      // Objects except Date
      else if ((data && typeof data == "object") && !((data && data.toUTCString) ? true : false)) {
        if (showLevels == 0) { // Short format (don't show properties)
          reply = _detailedTypeOf(data);
        }
        else { // Long format (show properties)
          strarr = [];
          var detailType = _detailedTypeOf(data);
          if (detailType != "Object") {
            strarr.push(detailType);
            if (data.valueOf && typeof data.valueOf() != "object") {
              strarr.push(":");
              strarr.push(recursive(data.valueOf(), 1, indentDepth, options));
            }
          }
          strarr.push("{");
          var isDomObject = (data !== null && typeof data === "object" && data.nodeName !== null);
          count = 0;
          var props = [];
          for (var prop in data) {
              props.push(prop);
          }
          props.sort();
          var skipped = false;
          for (i = 0; i < props.length; i++) {
            prop = props[i];
            try {
              var propvalue = data[prop];
              if (isDomObject) {
                if (!propvalue) {
                  continue;
                }
                if (typeof propvalue == "function") {
                  skipped = true;
                  continue;
                }
                if (skipDomProperties[prop]) {
                  skipped = true;
                  continue;
                }
                if (prop.toUpperCase() == prop) {
                  skipped = true;
                  continue;
                }
              }

              if (count === 0) {
                strarr.push(" ");
              }
              if (count > 0) {
                strarr.push(", ");
              }

              if (showLevels === 1 || props.length === 1) {
                // One-line format
                if (count == options.oneLineMaxItems) {
                  strarr.push("...");
                  break;
                }
              }
              else {
                // Multi-line format
                strarr.push(options.lineTerminator + indent(indentDepth+1, options));
              }

              strarr.push(prop.length > options.propertyNameMaxLength ? prop.substring(0, options.propertyNameMaxLength-3) + "..." : prop);
              strarr.push(":");
              if (isShown(propvalue)) {
                strarr.push("^^^");
                continue;
              } else {
                shown.push(propvalue);
                strarr.push(recursive(propvalue, showLevels-1, indentDepth+1, options));
              }
              count++;
            }
            catch (ex) {
              if (count > 0) {
                strarr.push(", ");
              }
              strarr.push(prop + ":err");
            }
          }
          if (skipped) {
            strarr.push(",...");
          }
          if (props.length === 1) {
            strarr.push(" ");
          }
          else if (count > 0) {
            if (showLevels > 1) {
              strarr.push(options.lineTerminator + indent(indentDepth, options));
            }
            else {
              strarr.push(" ");
            }
          }
          strarr.push("}");
          reply = strarr.join("");
        }
      }

      // undefined, null, number, boolean, Date
      else {
        reply = "" + data;
      }

      return reply;
    }
    catch(err) {
      return (err.message ? err.message : "" + err);
    }
  }

  function indent(count, options) {
    var strarr = [];
    strarr.push(options.baseIndent);
    for (var i=0; i<count; i++) {
      strarr.push(options.childIndent);
    }
    return strarr.join("");
  };

  return recursive(data, showLevels, 0, opt);
};

var _detailedTypeOf = function(x) {
  var reply = typeof x;
  if (reply == "object") {
    reply = Object.prototype.toString.apply(x);  // Returns "[object class]"
    reply = reply.substring(8, reply.length-1);  // Just get the class bit
  }
  return reply;
};
