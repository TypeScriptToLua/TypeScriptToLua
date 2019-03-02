tupleReturn = function(self)
    return 0, "foobar";
end;
tupleReturn(_G);
noTupleReturn(_G);
local a, b = tupleReturn(_G);
local c, d = table.unpack(noTupleReturn(_G));
a, b = tupleReturn(_G);
c, d = table.unpack(noTupleReturn(_G));
local e = ({tupleReturn(_G)});
local f = noTupleReturn(_G);
e = ({tupleReturn(_G)});
f = noTupleReturn(_G);
foo(_G, ({tupleReturn(_G)}));
foo(_G, noTupleReturn(_G));
tupleReturnFromVar = function(self)
    local r = {1, "baz"};
    return table.unpack(r);
end;
tupleReturnForward = function(self)
    return tupleReturn(_G);
end;
tupleNoForward = function(self)
    return ({tupleReturn(_G)});
end;
tupleReturnUnpack = function(self)
    return table.unpack(tupleNoForward(_G));
end;
