do
    pcall(function()
        local a = 42;
    end);
    do
        local b = "finally";
    end
end
