import {TestClass} from "./test2";
import * as tns from "./test2";

var a = new TestClass(0);

// definitions file
type GameRulesState = number;
declare const DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP: GameRulesState;

interface ICustomGameEventManager {
    RegisterListener(event_name: string, callback: (user_id: number, event_data: any) => void): void;
    Send_ServerToPlayer(player: object, event: string, data: object): void;
    Send_ServerToAllClients(event: string, data: object): void;
}
declare const CustomGameEventManager: ICustomGameEventManager;

interface IPlayerResource {
    GetPlayer(id: number): object;
}
declare const PlayerResource: IPlayerResource;

// game code
class GameState{

    state: GameRulesState;
    callbacks: ((state: GameRulesState) => void)[];

    Init(): void {
        this.state = DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP;
        this.callbacks = [];

        CustomGameEventManager.RegisterListener("game_state_request", this.OnStateRequest);
    }

    SetState(state: GameRulesState) {
        let testNil;

        this.state = state;

        CustomGameEventManager.Send_ServerToAllClients("game_state_update", {state : this.state});

        for (let callback of this.callbacks) {
            callback(this.state);
        }
    }

    RegisterListener(callback: ((state: GameRulesState) => void)){
        this.callbacks.push(callback);
    }

    RegisterListenerWithContext(callback: ((context: object, state: GameRulesState) => void), context: object) {
        this.callbacks.push(function(state: GameRulesState) {
            callback(context, state);
        });
    }

    OnStateRequest(userid: number, event: {PlayerID: number}) {
        const player = PlayerResource.GetPlayer(event.PlayerID);
        CustomGameEventManager.Send_ServerToPlayer(player, "game_state_response", {state : this.state});
    }
}


/*
GameState = GameState or {}
function GameState:Init()
    self.state = DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP
    self.callbacks = {}

    -- Listen for request event
    CustomGameEventManager:RegisterListener("game_state_request", Util:Wrap(self, 'OnStateRequest'))
end

function GameState:SetState(state)
    -- Change current state
    self.state = state

    -- Send out notification
    CustomGameEventManager:Send_ServerToAllClients("game_state_update", {state = self.state})

    -- Fire callbacks
    for _, callback in pairs(self.callbacks) do
        callback(state)
    end
end

function GameState:RegisterListener(callback, context)
    if context == nil then
        table.insert(self.callbacks, callback)
    else
        table.insert(self.callbacks, function(...) callback(context, ...) end)
    end
end

function GameState:OnStateRequest(userid, event)
    -- Send response with the state
    local player = PlayerResource:GetPlayer(event.PlayerID)
    CustomGameEventManager:Send_ServerToPlayer(player, "game_state_response", {state = self.state})
end*/
