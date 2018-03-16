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
    endI = endI or #list
    if startI < 0 then startI = #list + startI end
    if endI < 0 then endI = #list + endI end
    local out = {}
    for i = startI + 1, endI do
        table.insert(out, list[i])
    end
    return out
end

function TS_splice(list, startI, deleteCount, ...)
    if not deleteCount or deleteCount > #list - startI then
        deleteCount = #list - startI
    end
    startI = startI + 1
    local newElements = {...}
    local out = {}
    local outPtr = deleteCount
    local newElementsCount = #newElements
    for i = startI + deleteCount - 1, startI, -1 do
        out[outPtr] = list[i]
        outPtr = outPtr -1
        if newElements[k] then
            list[i] = newElements[k]
            newElementsCount = newElementsCount - 1
        else
            table.remove(list, i)
        end
    end
    while newElements[newElementsCount] do
        table.insert(list, startI, newElements[newElementsCount])
        newElementsCount = newElementsCount - 1
    end
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
    for _, v in pairs({...}) do
        list[#list + 1] = v
    end
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
    if other then
        for a, _ in pairs(other) do
            self._items[a] = true
        end
    end
end
function Set.add(self, item) self._items[item] = true end
function Set.contains(self, item) return self._items[item] ~= nil end
function Set.remove(self, item)
    local contains = Set.contains(self, item)
    self._items[item] = nil
    return contains
end
function Set.items(self)
    local out = {}
    for item, _ in pairs(self._items) do
        table.insert(out, item)
    end
    return out
end
function Set.count(self)
    local count = 0
    for item, _ in pairs(self._items) do
        count = count + 1
    end
    return count
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
    if other then
        for k, v in pairs(other) do
            self._items[k] = v
        end
    end
end
function Map.put(self, key, value) self._items[key] = value end
function Map.containsKey(self, key) return self._items[key] ~= nil end
function Map.remove(self, key)
    local contains = self.containsKey(self, key)
    self._items[key] = nil
    return contains
end
function Map.get(self, key) return self._items[key] end
function Map.keys(self)
    local out = {}
    for k, v in pairs(self._items) do
        table.insert(out, k)
    end
    return out
end
function Map.values(self)
    local out = {}
    for k, v in pairs(self._items) do
        table.insert(out, v)
    end
    return out
end
function Map.items(self)
    local out = {}
    for k, v in pairs(self._items) do
        table.insert(out, {key=k, value=v})
    end
    return out
end
function Map.count(self)
    local count = 0
    for k, v in pairs(self._items) do
        count = count + 1
    end
    return count
end
