local globalString = "glob"
local input = {1,2}
local objTest = {a=3,["B"]=true,[input[0+1]]=5}
TestClass = TestClass or {}
TestClass.__index = TestClass
function TestClass.new(construct, ...)
    local instance = setmetatable({}, TestClass)
    if construct and TestClass.constructor then TestClass.constructor(instance, ...) end
    return instance
end
function TestClass.constructor(self,tf)
    self.tf = tf
    self.field3 = globalString
end
function TestClass.Test(self)
    print("sup")
    self.Test3(self,3,"")
    self.unit.GetParent(self.unit).GetParent(self.unit.GetParent(self.unit)).GetAbsOrigin(self.unit.GetParent(self.unit).GetParent(self.unit.GetParent(self.unit)))
end
function TestClass.Test3(self,a,b)
    return ""
end
function Activate()
    local test = function()
        return ""
    end

    for i=0,10-1,1 do
        print(i)
    end
    for i=40,10+1,-1 do
    end
    for i=2,20,2 do
    end
    local i = TS_ITE(false==false,function() return 0 end, function() return 4 end)
    i = i + 1
    i = i - 1
    not true
    i = i + 1
    i=i+1
    i=i-1
    local a = bit.band(24,4)
    local list = {1,2,3}
    local obj = {a=3}
    for i=0,#list-1,1 do
        print(list[i+1])
    end
    for _, b in ipairs({1,2,3}) do
    end
    for _, c in ipairs(list) do
    end
    for d, _ in pairs(obj) do
    end
    if (i==3) and (i<3) then
        print(4)
    else
        print(5)
    end
    if true or false then
        while true do
            break
        end
    end
    -------Switch statement start-------
    if a==1 then
        ::switchCase0::
        2+2
        goto switchCase1
    elseif a==3 then
        ::switchCase1::
        return 5
        goto switchCase2
    elseif a==4 then
        ::switchCase2::
        1+1
        goto switchDone0
        goto switchCase3
    else
        ::switchCase3::
        local b = 3
    end
    ::switchDone0::
    --------Switch statement end--------
    -------Switch statement start-------
    if a==1 then
        ::switchCase4::
        2+2
        goto switchCase5
    elseif a==3 then
        ::switchCase5::
        return 5
        goto switchCase6
    elseif a==4 then
        ::switchCase6::
        1+1
        goto switchDone4
        goto switchCase7
    else
        ::switchCase7::
        local b = 3
    end
    ::switchDone4::
    --------Switch statement end--------
end
local a = TestClass.new(true,3)
