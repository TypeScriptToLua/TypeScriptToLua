function tupleReturn()
    return 0,"foobar"
end
tupleReturn();
noTupleReturn();
local a,b=tupleReturn();
local c,d=table.unpack(noTupleReturn());
a,b = tupleReturn();
c,d = table.unpack(noTupleReturn());
local e = ({ tupleReturn() });
local f = noTupleReturn();
e = ({ tupleReturn() });
f = noTupleReturn();
foo(({ tupleReturn() }));
foo(noTupleReturn());
function tupleReturnFromVar()
    local r = {1,"baz"};
    return table.unpack(r)
end
function tupleReturnForward()
    return tupleReturn()
end
function tupleNoForward()
    return ({ tupleReturn() })
end
function tupleReturnUnpack()
    return table.unpack(tupleNoForward())
end
