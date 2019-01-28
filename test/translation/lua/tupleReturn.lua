local a, b, c, d, e, f;
tupleReturn = function()
    return 0, "foobar";
end;
tupleReturnFromVar = function()
    local r;
    r = {1, "baz"};
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
tupleReturn();
noTupleReturn();
a, b = tupleReturn();
c, d = table.unpack(noTupleReturn());
a, b = tupleReturn();
c, d = table.unpack(noTupleReturn());
e = ({tupleReturn()});
f = noTupleReturn();
e = ({tupleReturn()});
f = noTupleReturn();
foo(({tupleReturn()}));
foo(noTupleReturn());
