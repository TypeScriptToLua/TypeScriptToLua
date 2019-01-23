function __TS__Await( value )
  if value and value.next then
    local s,e
    local r = coroutine.yield(value:catch( function( value )
      s=true
      e=value
    end ))
    if s then
      error(e,2)
    end
    return r
  else
    return value
  end
end
