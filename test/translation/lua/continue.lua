do
    local i = 0;
    while i < 10 do
        do
            if i < 5 then
                goto __continue1;
            end
        end
        ::__continue1::
        i = i + 1;
    end
end
