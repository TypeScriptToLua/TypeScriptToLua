local count01 = 0

count01 = count01+1
local count02 = (function()
    local count01_before = count01

    count01 = count01+1
    return count01_before
end
)()

count01 = (function()
    local count01_before = count01

    count01 = count01+1
    return count01_before
end
)()
count01 = (function()
    return count01
end
)()+(function()
    local count01_before = count01

    count01 = count01+1
    return count01_before
end
)()
local count03 = 0

count03 = count03-1
local count04 = (function()
    count03 = count03-1
    return count03
end
)()

count03 = (function()
    count03 = count03-1
    return count03
end
)()
count03 = (function()
    return count03
end
)()+(function()
    count03 = count03-1
    return count03
end
)()
