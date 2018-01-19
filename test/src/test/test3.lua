local a = ""
local b = {1,2,3}
local c = {d=a,e=b}
local d = #b
local e = #a
local f = #c.d
local g = #c.e
local h = #"abc"
table.insert(b, 3)
a:sub("a","b")
