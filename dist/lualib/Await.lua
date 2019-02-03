__TS__Await = function( value )
  if type(value)=="table" and value.next then
    local s,e
    local r = coroutine.yield(value:next( nil, function( value )
      s=true
      e=value
    end ))
    if s then error(e,0) end
    return r
  else
    return value
  end
end
