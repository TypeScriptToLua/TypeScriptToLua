tupleReturn = function()
    return 0, "foobar";
end;
tupleReturn();
noTupleReturn();
local a, b = tupleReturn();
local c, d = table.unpack(noTupleReturn());
a, b = tupleReturn();
c, d = table.unpack(noTupleReturn());
local e = ({tupleReturn()});
local f = noTupleReturn();
e = ({tupleReturn()});
f = noTupleReturn();
foo(({tupleReturn()}));
foo(noTupleReturn());
tupleReturnFromVar = function()
    local r = {1, "baz"};
    return table.unpack(r);
end;
tupleReturnForward = function()
    return tupleReturn();
end;
tupleNoForward = function()
    return ({tupleReturn()});
end;
tupleReturnUnpack = function()
    return table.unpack(tupleNoForward());
end;
