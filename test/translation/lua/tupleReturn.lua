local tupleReturn;
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
local tupleReturnFromVar;
tupleReturnFromVar = function()
    local r = {1, "baz"};
    return table.unpack(r);
end;
local tupleReturnForward;
tupleReturnForward = function()
    return tupleReturn();
end;
local tupleNoForward;
tupleNoForward = function()
    return ({tupleReturn()});
end;
local tupleReturnUnpack;
tupleReturnUnpack = function()
    return table.unpack(tupleNoForward());
end;
