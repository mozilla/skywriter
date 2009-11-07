// From Narwhal
Function.prototype.bind = function () {
    var args = Array.prototype.slice.call(arguments);
    var self = this;
    var bound = function () {
        return self.call.apply(
            self,
            args.concat(
                Array.prototype.slice.call(arguments)
            )
        );
    };
    bound.name = this.name;
    bound.displayName = this.displayName;
    bound.length = this.length;
    bound.unbound = self;
    return bound;
};

