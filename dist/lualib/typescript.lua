-- Ternary operator
function TS_ITE(condition, v1f, v2f)
    if condition then
        return v1f()
    else
        return v2f()
    end
end

function TS_forEach(list, func)
    for i, v in ipairs(list) do
        func(v, i-1, list)
    end
end

function TS_map(list, func)
    local out = {}
    for _, v in ipairs(list) do
        table.insert(out, func(v))
    end
    return out
end

function TS_filter(list, func)
    local out = {}
    for _, v in ipairs(list) do
        if func(v) then
            table.insert(out, v)
        end
    end
    return out
end

function TS_slice(list, startI, endI)
    if not endI or endI > #list then endI = #list end
    if startI < 0 then startI = math.max(#list + startI, 1) end
    if endI < 0 then endI = math.max(#list + endI, 1) end
    local out = {}
    for i = startI + 1, endI do
        table.insert(out, list[i])
    end
    return out
end

function TS_splice(list, start, deleteCount, ...)
    -- 1. 2.
    local len = #list

    local actualStart

    -- 4.
    if start <  0 then
        actualStart = math.max(len + start, 0)
    else
        actualStart = math.min(start, len)
    end

    -- 13.
    local items = {...}
    -- 14.
    local itemCount = #items

    -- 5. - 7.
    local actualDeleteCount

    if not start then
        actualDeleteCount = 0
    elseif not deleteCount then
        actualDeleteCount = len - actualStart
    else
        actualDeleteCount = math.min(math.max(deleteCount, 0), len - actualStart)
    end

    -- 8. ignored

    -- 9.
    local out = {}

    -- 10.
    local k

    k = 0

    -- 11.
    while k < actualDeleteCount do
        local from = actualStart + k

        if list[from + 1] then
            out[k + 1] = list[from + 1]
        end

        k = k + 1
    end

    -- 15.
    if itemCount < actualDeleteCount then
        -- a. b.
        k = actualStart
        while k < len - actualDeleteCount do
            local from = k + actualDeleteCount
            local to = k + itemCount

            if list[from + 1] then
                list[to + 1] = list[from + 1]
            else
                list[to + 1] = nil
            end

            k = k + 1
        end
        -- c. d.
        k = len
        while k > len - actualDeleteCount + itemCount do
            list[k] = nil
            k = k - 1
        end
    -- 16.
    elseif itemCount > actualDeleteCount then
        k = len - actualDeleteCount
        while k > actualStart do
            local from = k + actualDeleteCount
            local to = k + itemCount

            if list[from] then
                list[to] = list[from]
            else
                list[to] = nil
            end

            k = k - 1
        end
    end

    -- 17.
    k = actualStart

    -- 18.
    for _, e in pairs(items) do
        list[k + 1] = e
        k = k + 1
    end

    -- 19.
    k = #list
    while k > len - actualDeleteCount + itemCount do
        list[k] = nil
        k = k - 1
    end

    -- 20.
    return out
end

function TS_some(list, func)
    return #TS_filter(list, func) > 0
end

function TS_every(list, func)
    return #list == #TS_filter(list, func)
end

function TS_indexOf(list, object )
    for i = 1, #list do
        if object == list[i] then
            return i - 1
        end
    end
    return -1
end

function TS_replace(source, searchVal, newVal)
    local result = string.gsub(source, searchVal, newVal)
    return result
end

function TS_split(str, separator)
    local out = {}

    if separator == "" then
        string.gsub(str,".", function(c)
            table.insert(out, c)
        end)
        return out
    end

    if not string.find(str, separator) then
        return { str }
    end

    local fstr = str .. separator
    local fpat = "(.-)" .. separator
    local last_end = 1
    local s, e, cap = string.find(fstr, fpat, 1)
    while s do
        table.insert(out, cap)
        last_end = e+1
        s, e, cap = string.find(fstr, fpat, last_end)
    end
    if last_end <= #str then
        cap = string.sub(fstr, last_end)
        table.insert(out, cap)
    end
    return out
end

function TS_push(list, ...)
    for _, v in ipairs({...}) do
        list[#list + 1] = v
    end
end

function TS_instanceof(obj, class)
    while obj ~= nil do
        if obj.__index == class then
            return true
        end
        obj = obj.__base
    end
    return false
end

-- Set data structure implementation
Set = Set or {}
Set.__index = Set
function Set.new(construct, ...)
    local instance = setmetatable({}, Set)
    Set.constructor(instance, ...)
    return instance
end
function Set.constructor(self, other)
    self._items = {}
    self.size = 0
    if other then
        self.size = #other
        for _, a in pairs(other) do
            self._items[a] = true
        end
    end
end
function Set.add(self, item)
    self._items[item] = true
    self.size = self.size + 1
end
function Set.clear(self)
    self._items = {}
    self.size = 0
end
function Set.delete(self, item)
    local contains = Set.has(self, item)
    self._items[item] = nil
    self.size = self.size - 1
    return contains
end
function Set.entries(self)
    local out = {}
    for item, _ in pairs(self._items) do
        table.insert(out, {item, item})
    end
    return out
end
function Set.forEach(self, callbackFn)
    for k, v in pairs(self._items) do
        callbackFn(k, k, self)
    end
end
function Set.has(self, item) return self._items[item] ~= nil end
function Set.keys(self)
    return Set.values(self)
end
function Set.values(self)
    local out = {}
    for k, _ in pairs(self._items) do
        table.insert(out, k)
    end
    return out
end

-- Set data structure implementation
Map = Map or {}
Map.__index = Map
function Map.new(construct, ...)
    local instance = setmetatable({}, Map)
    Map.constructor(instance, ...)
    return instance
end
function Map.constructor(self, other)
    self._items = {}
    self.size = 0
    if other then
        self.size = #other
        for _, v in pairs(other) do
            self._items[v[1]] = v[2]
        end
    end
end
function Map.clear(self)
    self._items = {}
    self.size = 0
end
function Map.delete(self, key)
    local contains = self.has(self, key)
    self._items[key] = nil
    self.size = self.size - 1
    return contains
end
function Map.entries(self)
    local out = {}
    for k, v in pairs(self._items) do
        table.insert(out, {k, v})
    end
    return out
end
function Map.forEach(self, callbackFn)
    for k, v in pairs(self._items) do
        callbackFn(v, k, self)
    end
end
function Map.get(self, key) return self._items[key] end
function Map.has(self, key) return self._items[key] ~= nil end
function Map.keys(self)
    local out = {}
    for k, v in pairs(self._items) do
        table.insert(out, k)
    end
    return out
end
function Map.set(self, key, value)
    self._items[key] = value
    self.size = self.size + 1
    return self
end
function Map.values(self)
    local out = {}
    for k, v in pairs(self._items) do
        table.insert(out, v)
    end
    return out
end
