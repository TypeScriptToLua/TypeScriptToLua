local i = 0
while (i<5) do
    do
        if (i%2)==0 then
            goto __continue0
        end
        local j = 0
        while (j<2) do
            do
                if j==1 then
                    goto __continue1
                end
            end
            ::__continue1::
            j = (j+1)
        end
        if i==4 then
            goto __continue0
        end
    end
    ::__continue0::
    i = (i+1)
end
