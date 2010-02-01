/**
 * Auto-completion for 'set'
 */
exports.setCompleter = function(query, callback) {
    var key = query.action[0];
    var val = settings.getValue(key);

    if (query.action.length == 1) {
        // Check if this is an exact match
        if (val) {
            query.hint = "Current value of " + key + " is '" + val + "'. Enter a new value, or press enter to display in the console.";
            callback(query);
            return;
        }

        // So no exact matches, we're looking for options
        var list = settings._list().map(function(entry) {
            return entry.key;
        });
        var matches = this.parent.filterOptionsByPrefix(list, key);

        if (matches.length == 1) {
            // Single match: go for autofill and hint
            query.autofill = "set " + matches[0];
            val = settings.getValue(matches[0]);
            query.hint = "Current value of " + matches[0] + " is '" + val + "'. Enter a new value, or press enter to display in the console.";
        } else if (matches.length === 0) {
            // No matches, cause an error
            query.error = "No matching settings";
        } else {
            // Multiple matches, present a list
            matches.sort(function(a, b) {
                return a.localeCompare(b);
            });
            query.options = matches;
        }

        callback(query);
        return;
    }

    if (val) {
        query.hint = "Current value of " + key + " is '" + val + "'. Enter a new value, or press enter to display in the console.";
        callback(query);
        return;
    }

    query.error = "No setting for '" + key + "'";
    callback(query);
    return;
};

/**
 * Auto-completion for 'unset'
 */
exports.unsetCompleter = function(query, callback) {
    var key = query.action[0];
    var val = settings.values[key];

    // Multiple params are an error
    if (query.action.length > 1) {
        query.error = "Can only unset one setting at a time";
        callback(query);
        return;
    }

    // Exact match
    if (val) {
        query.hint = "Current value of " + key + " is '" + val + "'. Press enter to remove the setting.";
        callback(query);
        return;
    }

    // So no exact matches, we're looking for options
    var list = settings._list().map(function(entry) {
        return entry.key;
    });
    var matches = this.parent.filterOptionsByPrefix(list, key);

    if (matches.length == 1) {
        // Single match: go for autofill and hint
        query.autofill = "set " + matches[0];
        val = settings.getValue(matches[0]);
        query.hint = "Current value of " + matches[0] + " is '" + val + "'. Press enter to remove the setting.";
    } else if (matches.length === 0) {
        // No matches, cause an error
        query.error = "No matching settings";
    } else {
        // Multiple matches, present a list
        matches.sort(function(a, b) {
            return a.localeCompare(b);
        });
        query.options = matches;
    }

    callback(query);
    return;
};
