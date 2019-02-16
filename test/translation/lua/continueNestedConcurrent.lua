for i = 0, 5 - 1 do
    do
        if (i % 2) == 0 then
            goto __continue1;
        end
        for j = 0, 2 - 1 do
            do
                if j == 1 then
                    goto __continue3;
                end
            end
            ::__continue3::
        end
        if i == 4 then
            goto __continue1;
        end
    end
    ::__continue1::
end
