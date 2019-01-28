myNamespace = myNamespace or {};
do
    local myNestedNamespace;
    myNamespace.myNestedNamespace = myNamespace.myNestedNamespace or {};
    myNestedNamespace = myNamespace.myNestedNamespace;
    do
        local nsMember;
        nsMember = function()
        end;
    end
end
