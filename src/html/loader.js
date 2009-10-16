// this is not a module.  it is a snippet of a script that will be sent by the
// client/browser module server defined in the narwhal/server module, or some
// similar mechanism.  this file is simply an anonymous function declaration.
// the server constructs an inline script to inject anywhere in an HTML page,
// along with its "path" argument (the base URL from which to download
// modules).  The function returns a module loader API function/object called
// "require" that can then be chained with .preload(ids), .when(id),
// .async(id), or other calls, depending on what services are needed to load
// this particular page.

(function (path) {

    // ultimately, we're exporting a "require" API to global scope, and
    // returning that same object.
    var require = this.require = function (id) {
        if (!require.require)
            throw new Error("require is not yet available");
        return require.require(id);
    };

    // the catalog is a lookup table of top level module identifiers to catalog
    // entries.  catalog entries include a module factory function and an array
    // of top level identifiers of each dependency.  this is populated by the
    // register function that is called by injected module and bundle scripts.
    require.catalog = {};
    require.requests = [];
    require.preloads = {};

    // this is an event handler for factory arrivals that will be replaced when
    // narwhal/client arrives.
    require.arrive = function (id) {
        // there's only one module we're particularly interested in at the
        // moment.  as soon as it comes down, load the client.  this will take
        // us to the next stage, getting the promise graph and sandbox set up.
        if (id == "narwhal/client")
            require.catalog[id].factory(require);
    };

    // this function gets called by injected scripts with a portion of the
    // module catalog, which includes factories and dependency lists.
    require.register = function (entries) {
        for (var id in entries) {
            if (Object.prototype.hasOwnProperty.call(entries, id)) {
                require.catalog[id] = entries[id];
                // make a note not to preload this module, even if it
                // was not preloaded in the first place.
                require.preloads[id] = true;
                // this function gets redefined at various stages to notice the
                // arrival of important modules for the bootstrapping process.
                // 1.) narwhal/client
                // 2.) ref-send and reactor
                // 3.) all identifiers
                require.arrive(id);
            }
        }
    };

    // this function injects script tags for modules or module bundles to
    // asynchronously load modules that have been wrapped with their metadata
    // for transport either by a build system or by a server-side component
    // like the narwhal/server module.
    require.preload = function (ids) {
        setTimeout(function () {
            var length = ids.length;
            for (var i = 0; i < length; i++) {
                // don't double preload; this check makes preload idempotent
                if (require.preloads[ids[i]])
                    continue;
                // make a note not to preload this module ever again.
                require.preloads[ids[i]] = true;

                // prepend instead of append to avoid KB917927
                // - Kean Tan <http://www.karmagination.com/>
                var script = document.createElement('script');
                script.src = path + ids[i] + '.js';
                document.documentElement.insertBefore(
                    script,
                    document.documentElement.firstChild
                );

            };
        }, 0);
        return require;
    };

    // this is the public API for requesting that a module be loaded as soon as
    // it's ready (as soon as it and its transitive dependencies have arrived
    // and been entered in the catalog).  unfortunately, we're not ready to
    // process requests at this stage, so we add them to a queue that will be
    // processed later, at which point this function will also be replaced.
    // all of these later steps occur toward the end of client.js
    require.async = function (id) {
        require.requests.push(id);
        return require;
    };

    // for convenience, if ever we opt to abolish the global require
    // variable, being able to call an arbitrary function while
    // maintaining the require object along the call chain.
    require.bridge = function (block) {
        block(require);
        return require;
    };

    // return the require object for chaining
    return require;
}).call(this,"/.js/");
