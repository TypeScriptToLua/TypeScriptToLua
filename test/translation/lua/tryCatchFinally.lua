local a, b, c;
do
    local ____TS_try, er = pcall(function()
        a = 42;
    end);
    if not ____TS_try then
        b = "fail";
    end
    do
        c = "finally";
    end
end
