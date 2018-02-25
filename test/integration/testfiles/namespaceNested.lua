myNamespace = myNamespace or {}
do
    myNestedNamespace = myNestedNamespace or {}
    myNamespace.myNestedNamespace = myNestedNamespace or {}
    do
        function nsMember()
        end
        myNamespace.myNestedNamespace.nsMember = nsMember
    end
end
