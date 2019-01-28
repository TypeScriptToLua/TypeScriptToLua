do
    local ____TS_try, er = pcall(function()
        local a;
        a = 42;
    end);
    if not ____TS_try then
        local b;
        b = "fail";
    end
    do
        local c;
        c = "finally";
    end
end
