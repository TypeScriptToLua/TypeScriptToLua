--[[ Generated with https://github.com/Perryvw/TypescriptToLua ]]
-- Lua Library inline imports
__TS__ArrayForEach = function(arr, callbackFn)
    do
        local i = 0;
        while i < (#arr) do
            callbackFn(arr[i + 1], i, arr);
            i = i + 1;
        end
    end
end;

local ____logError;
____logError = print;
local ____runAtNextTick;
____runAtNextTick = function(func)
    return func();
end;
____PromiseState = {};
____PromiseState.PENDING = 0;
____PromiseState[0] = "PENDING";
____PromiseState.FULFILLED = 1;
____PromiseState[1] = "FULFILLED";
____PromiseState.REJECTED = 2;
____PromiseState[2] = "REJECTED";
PromiseImpl = PromiseImpl or {};
PromiseImpl.__index = PromiseImpl;
PromiseImpl.prototype = PromiseImpl.prototype or {};
PromiseImpl.prototype.__index = PromiseImpl.prototype;
PromiseImpl.prototype.constructor = PromiseImpl;
PromiseImpl.new = function(...)
    local self = setmetatable({}, PromiseImpl.prototype);
    self:____constructor(...);
    return self;
end;
PromiseImpl.prototype.____constructor = function(self, executor)
    self.state = ____PromiseState.PENDING;
    self.queue = {};
    if executor then
        do
            local ____TS_try, err = pcall(function()
                executor(function(value)
                    self:fulfill(value);
                end, function(reason)
                    self:reject(reason);
                end);
            end);
            if not ____TS_try then
                self:reject(err);
            end
        end
    end
end;
PromiseImpl.resolve = function(self, value)
    local p = PromiseImpl.new();
    PromiseImpl:PromiseResolutionProcedure(p, value);
    return p;
end;
PromiseImpl.reject = function(self, reason)
    local p = PromiseImpl.new();
    p:reject(reason);
    return p;
end;
PromiseImpl.all = function(self, promises)
    local p = PromiseImpl.new();
    if (#promises) == 0 then
        p:resolve({});
    else
        local pending = #promises;
        local result = {};
        local rejected = false;
        local synchronizer;
        synchronizer = function(idx, success)
            return function(value)
                pending = pending - 1;
                result[idx] = value;
                if not success then
                    rejected = true;
                end
                if pending == 0 then
                    local res = {};
                    do
                        local i = 0;
                        while i < (#promises) do
                            __TS__ArrayPush(res, result[i]);
                            i = i + 1;
                        end
                    end
                    if rejected then
                        p:reject(res);
                    else
                        p:resolve(res);
                    end
                end
            end;
        end;
        __TS__ArrayForEach(promises, function(promise, i)
            promise:__TS__then(synchronizer(i, true), synchronizer(i, false));
        end);
    end
    return p;
end;
PromiseImpl.race = function(self, promises)
    local p = PromiseImpl.new();
    if (#promises) == 0 then
        p:reject("no promises passed");
    else
        for ____TS_index = 1, #promises do
            local promise = promises[____TS_index];
            promise:__TS__then(function(value)
                return p:resolve(value);
            end, function(reason)
                return p:reject(reason);
            end);
        end
    end
    return p;
end;
PromiseImpl.PromiseResolutionProcedure = function(self, promise, x)
    if promise == x then
        PromiseImpl:reject("TypeError: resolving promise with itself");
        return promise;
    end
    if (((type(x) == "table") and "object") or type(x)) ~= "object" then
        return promise:fulfill(x);
    end
    local xthen;
    do
        local ____TS_try, err = pcall(function()
            xthen = (x).__TS__then;
        end);
        if not ____TS_try then
            PromiseImpl:reject(err);
            return promise;
        end
    end
    local called = false;
    local resolvePromise;
    resolvePromise = function(y)
        if called then
            return;
        end
        called = true;
        PromiseImpl:PromiseResolutionProcedure(promise, y);
    end;
    local rejectPromise;
    rejectPromise = function(err)
        if called then
            return;
        end
        called = true;
        PromiseImpl:reject(err);
    end;
    if (((type(xthen) == "table") and "object") or type(xthen)) == "function" then
        do
            local ____TS_try, err = pcall(function()
                xthen(x, resolvePromise, rejectPromise);
            end);
            if not ____TS_try then
                rejectPromise(err);
            end
        end
    else
        promise:fulfill(x);
    end
    return promise;
end;
PromiseImpl.prototype.__TS__then = function(self, onFulfilled, onRejected)
    local promise = PromiseImpl.new();
    if self.state == ____PromiseState.PENDING then
        __TS__ArrayPush(self.queue, {promise = promise, onFulfilled = onFulfilled, onRejected = onRejected});
    elseif self.state == ____PromiseState.FULFILLED then
        if onFulfilled then
            ____runAtNextTick(function()
                do
                    local ____TS_try, err = pcall(function()
                        PromiseImpl:PromiseResolutionProcedure(promise, onFulfilled(self.value));
                    end);
                    if not ____TS_try then
                        PromiseImpl:reject(err);
                    end
                end
            end);
        else
            return self;
        end
    elseif self.state == ____PromiseState.REJECTED then
        self.handledError = true;
        if onRejected then
            ____runAtNextTick(function()
                do
                    local ____TS_try, err = pcall(function()
                        PromiseImpl:PromiseResolutionProcedure(promise, onRejected(self.reason));
                    end);
                    if not ____TS_try then
                        PromiseImpl:reject(err);
                    end
                end
            end);
        else
            return self;
        end
    end
    return promise;
end;
PromiseImpl.prototype.catch = function(self, onRejected)
    return self:__TS__then(nil, onRejected);
end;
PromiseImpl.prototype.finally = function(self, onFinally)
    return self:__TS__then(function(v)
        onFinally();
        return v;
    end, function(err)
        onFinally();
        return error(err);
    end);
end;
PromiseImpl.prototype.resolve = function(self, value)
    PromiseImpl:PromiseResolutionProcedure(self, value);
end;
PromiseImpl.prototype.reject = function(self, reason)
    if self.state ~= ____PromiseState.PENDING then
        return;
    end
    self.state = ____PromiseState.REJECTED;
    self.reason = reason;
    __TS__ArrayForEach(self.queue, function(d)
        if (((type(d.onRejected) == "table") and "object") or type(d.onRejected)) ~= "function" then
            d.promise:reject(self.reason);
        else
            ____runAtNextTick(function()
                do
                    local ____TS_try, err = pcall(function()
                        local val = (d.onRejected)(reason);
                        PromiseImpl:PromiseResolutionProcedure(d.promise, val);
                    end);
                    if not ____TS_try then
                        d.promise:reject(err);
                    end
                end
            end);
        end
    end);
end;
PromiseImpl.prototype.__gc = function(self)
    if (self.state == ____PromiseState.REJECTED) and (not self.handledError) then
        local ____TS_array = self.queue;
        for ____TS_index = 1, #____TS_array do
            local d = ____TS_array[____TS_index];
            if d.onRejected then
                return;
            end
        end
        ____logError("Unhandled rejected promise ", self.reason);
    end
end;
PromiseImpl.prototype.fulfill = function(self, value)
    if self.state ~= ____PromiseState.PENDING then
        return self;
    end
    self.state = ____PromiseState.FULFILLED;
    self.value = value;
    __TS__ArrayForEach(self.queue, function(d)
        if (((type(d.onFulfilled) == "table") and "object") or type(d.onFulfilled)) ~= "function" then
            d.promise:fulfill(self.value);
        else
            ____runAtNextTick(function()
                do
                    local ____TS_try, err = pcall(function()
                        local val = (d.onFulfilled)(value);
                        PromiseImpl:PromiseResolutionProcedure(d.promise, val);
                    end);
                    if not ____TS_try then
                        d.promise:reject(err);
                    end
                end
            end);
        end
    end);
    return self;
end;
Promise = PromiseImpl;

__TS__Async = function(f)
    return function(...)
        local args = ({...});
        local co = coroutine.create(f);
        local handleError;
        handleError = function(reason)
            return error(reason, 0);
        end;
        local handleNext;
        handleNext = function(...)
            local args = ({...});
            local state, value = coroutine.resume(co, unpack(args));
            if state then
                if coroutine.status(co) == "dead" then
                    return value;
                end
                if ((((type(value) == "table") and "object") or type(value)) == "object") and value.__TS__then then
                    return value:__TS__then(handleNext, handleError);
                else
                    return value;
                end
            else
                return handleError(value);
            end
        end;
        return Promise:resolve():__TS__then(function()
            return handleNext(unpack(args));
        end);
    end;
end;

__TS__Await = function(value)
    if (type(value) == "table") and value.__TS__then then
        local s = false;
        local err;
        local result = coroutine.yield(value:__TS__then(nil, function(value)
            s = true;
            err = value;
        end));
        if s then
            return error(err, 0);
        end
        return result;
    else
        return value;
    end
end;

do
    local ____TS_try, err = pcall(function()
        async_func = __TS__Async(function(i)
            return i;
        end);
        local test;
        test = __TS__Async(function()
            print(__TS__Await(1));
            print(__TS__Await(2));
            print(__TS__Await(async_func(4)));
            return 5;
        end);
        test():__TS__then(print, print);
    end);
    if not ____TS_try then
        print(err);
    end
end
