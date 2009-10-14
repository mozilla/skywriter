var server = require("narwhal/server");
var sprintf = require("printf").sprintf;
var Jack = require("jack");
var Path = require("file").Path;
var system = require("system");

exports.app = function(env) {
    var page = sprintf("<html><head><script>%s</script></head><body>Hi <script></script></body></html>", env.script.require("hello"));
    return {
        status : 200,
        headers : { "Content-Type" : "text/html", "Content-Length" : String(page.length) },
        body : [page]
    };
};

var options = {debug:true};

exports.app = Jack.ContentLength(Jack.ShowExceptions(server.App(exports.app, options)));

