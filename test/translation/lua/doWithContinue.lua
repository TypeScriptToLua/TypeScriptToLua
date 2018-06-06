local e = 10

repeat
    do
        e=e-1
        if e>5 then
            goto __continue
        end
    end
    ::__continue::
until not (e>0)
