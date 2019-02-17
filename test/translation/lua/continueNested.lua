do
    local i = 0;
    while i < 5 do
        do
            if (i % 2) == 0 then
                goto __continue1;
            end
            do
                local j = 0;
                while j < 2 do
                    do
                        if j == 1 then
                            goto __continue3;
                        end
                    end
                    ::__continue3::
                    j = j + 1;
                end
            end
        end
        ::__continue1::
        i = i + 1;
    end
end
