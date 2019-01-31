do
    local ____TS_try, er = pcall(function()
        local a = 42;
    end);
    if not ____TS_try then
        local b = "fail";
    end
end
