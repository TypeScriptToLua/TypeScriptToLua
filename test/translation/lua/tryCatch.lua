xpcall(function()
    local a = 42;
end,
function(er)
    local b = "fail";
end)
