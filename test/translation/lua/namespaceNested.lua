myNamespace = myNamespace or {}
do
    local myNestedNamespace = myNestedNamespace or {}
    myNamespace.myNestedNamespace = myNestedNamespace or {}
    do
        local function nsMember()
        end
        myNamespace.myNestedNamespace.nsMember = nsMember
    end
end
