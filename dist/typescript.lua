-- Ternary operator
function TS_ITE(condition, v1f, v2f)
    if condition then
        return v1f()
    else
        return v2f()
    end
end
