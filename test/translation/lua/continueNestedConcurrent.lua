local i;
i = 0;
while i < 5 do
    do
        local j;
        if (i % 2) == 0 then
            goto __continue1;
        end
        j = 0;
        while j < 2 do
            do
                if j == 1 then
                    goto __continue3;
                end
            end
            ::__continue3::
            j = j + 1;
        end
        if i == 4 then
            goto __continue1;
        end
    end
    ::__continue1::
    i = i + 1;
end
