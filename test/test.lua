require("./test2"){$imports.name.escapedText} = require("./test2")local a = TestClass(0)
GameState = GameState or {}
function GameState:Init()
    self.state=DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP
    self.callbacks={}
    CustomGameEventManager:RegisterListener("game_state_request",self.OnStateRequest)
end
function GameState:SetState(state)
    self.state=state
    CustomGameEventManager:Send_ServerToAllClients("game_state_update",{["state"]=self.state})
    for _, callback in ipairs(self.callbacks) do
        callback(self.state)
    end
end
function GameState:RegisterListener(callback)
    table.insert(self.callbacks, callback)
end
function GameState:RegisterListenerWithContext(callback,context)
    table.insert(self.callbacks, function(state)
        callback(context,state)
    end )
end
function GameState:OnStateRequest(userid,event)
    local player = PlayerResource:GetPlayer(event.PlayerID)
    CustomGameEventManager:Send_ServerToPlayer(player,"game_state_response",{["state"]=self.state})
end
