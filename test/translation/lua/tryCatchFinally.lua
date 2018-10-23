do
    local __TS_try, er = pcall(function()
        local a = 42;
    end);
    if not __TS_try then
        local b = "fail";
    end
    do
        local c = "finally";
    end
end
