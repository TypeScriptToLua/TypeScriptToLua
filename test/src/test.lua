require("./test2"){$imports.name.escapedText} = require("./test2")local a = TestClass.new(0)
GameState = GameState or {}
GameState.__index = GameState
function GameState.new(...)
    local instance = setmetatable({}, GameState)
    if GameState.constructor then GameState.constructor(instance, ...) end
    return instance
end
function GameState.Init(self)
    self.state=DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP
    self.callbacks={}
    CustomGameEventManager.RegisterListener(CustomGameEventManager,"game_state_request",self.OnStateRequest)
end
function GameState.SetState(self,state)
    self.state=state
    CustomGameEventManager.Send_ServerToAllClients(CustomGameEventManager,"game_state_update",{["state"]=self.state})
    for _, callback in ipairs(self.callbacks) do
        callback(self.state)
    end
end
function GameState.RegisterListener(self,callback)
    table.insert(self.callbacks, callback)
end
function GameState.RegisterListenerWithContext(self,callback,context)
    table.insert(self.callbacks, function(state)
        callback(context,state)
    end )
end
function GameState.OnStateRequest(self,userid,event)
    local player = PlayerResource.GetPlayer(PlayerResource,event.PlayerID)
    CustomGameEventManager.Send_ServerToPlayer(CustomGameEventManager,player,"game_state_response",{["state"]=self.state})
end
