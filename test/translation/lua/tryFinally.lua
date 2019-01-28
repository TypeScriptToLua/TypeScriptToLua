local a, b;
do
    pcall(function()
        a = 42;
    end);
    do
        b = "finally";
    end
end
