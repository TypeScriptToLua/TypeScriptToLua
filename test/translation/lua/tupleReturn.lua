function tupleReturn()
    return 0,"foobar"
end
tupleReturn();
noTupleReturn();
local a,b=tupleReturn();
local c,d=table.unpack(noTupleReturn());
do local __TS_tmp0,__TS_tmp1 = tupleReturn(); a,b = __TS_tmp0,__TS_tmp1 end;
do local __TS_tmp0,__TS_tmp1 = table.unpack(noTupleReturn()); c,d = __TS_tmp0,__TS_tmp1 end;
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
