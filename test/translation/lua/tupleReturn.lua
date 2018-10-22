function tupleReturn(self)
    return 0,"foobar"
end
tupleReturn(_G);
noTupleReturn(_G);
local a,b=tupleReturn(_G);
local c,d=table.unpack(noTupleReturn(_G));
do local __TS_tmp0,__TS_tmp1 = tupleReturn(_G); a,b = __TS_tmp0,__TS_tmp1 end;
do local __TS_tmp0,__TS_tmp1 = table.unpack(noTupleReturn(_G)); c,d = __TS_tmp0,__TS_tmp1 end;
local e = ({ tupleReturn(_G) });
local f = noTupleReturn(_G);
e = ({ tupleReturn(_G) });
f = noTupleReturn(_G);
foo(_G,({ tupleReturn(_G) }));
foo(_G,noTupleReturn(_G));
function tupleReturnFromVar(self)
    local r = {1,"baz"};
    return table.unpack(r)
end
function tupleReturnForward(self)
    return tupleReturn(_G)
end
function tupleNoForward(self)
    return ({ tupleReturn(_G) })
end
function tupleReturnUnpack(self)
    return table.unpack(tupleNoForward(_G))
end
