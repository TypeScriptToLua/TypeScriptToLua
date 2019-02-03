__TS__Async = function( f )
  return function(...)
    local args = {...}
    local co = coroutine.create( f )

    local function handleError( reason )
      error( reason, 0 );
    end

    local function handleNext( ... )
      local state, value = coroutine.resume( co, ... )
      if state then 
        if coroutine.status(co)=="dead" then 
          return value
        end
        if value and value.next then 
          return value:next( handleNext, handleError )
        else 
          return value
        end
      else
        return handleError(value);
      end

    end

    return Promise.resolve():next(function()
      return handleNext( table.unpack(args) )
    end)
  end 
end 
