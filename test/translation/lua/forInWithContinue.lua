for i, _ in pairs({a = 1,b = 2,c = 3,d = 4}) do
    do
        if i=="a" then
            goto __continue
        end
    end
    ::__continue::
end
