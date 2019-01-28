do
    pcall(function()
        local a;
        a = 42;
    end);
    do
        local b;
        b = "finally";
    end
end
