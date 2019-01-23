function __TS__Async( f )
  return function(...)

    local co = coroutine.create(f)

    function handleNext( value, ... )
      if coroutine.status(co)=="dead" then 
        return value
      end
      local state,value = coroutine.resume(co,value,...)
      if not state then
        error(value, 2)
      end
      if not value then
        return
      end
      return value:next( handleNext, handleError )
    end

    local args = {...}
    return Promise.resolve():next(function()
      return handleNext(table.unpack(args))
    end )
  end
end

