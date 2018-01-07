declare var PlayerResource: CDOTA_PlayerResource;

type QAngle = number;
type ProjectileID = number;
type ParticleID = number;
type EventListenerID = number;
type CCustomGameEventListener = number;
type table = { [key: string]: any };
// see: https://github.com/Microsoft/TypeScript/issues/15480
type PlayerID =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23;

declare enum DOTAConnectionState_t {
  DOTA_CONNECTION_STATE_UNKNOWN = 0,
  DOTA_CONNECTION_STATE_NOT_YET_CONNECTED = 1,
  DOTA_CONNECTION_STATE_CONNECTED = 2,
  DOTA_CONNECTION_STATE_DISCONNECTED = 3,
  DOTA_CONNECTION_STATE_ABANDONED = 4,
  DOTA_CONNECTION_STATE_LOADING = 5,
  DOTA_CONNECTION_STATE_FAILED = 6,
}

interface CScriptHTTPResponse {
  Body: string;
  Request: CScriptHTTPResponse;
  StatusCode: number;
}

// TODO:
type Quaternion = any;
type ehandle = any;
type utlstringtoken = any;
type variant = any;
type vector2d = any;

interface CDOTA_PlayerResource {
  /**
   * Get the team number of this entity.
   *
   * Left for compatibility with CBaseEntity interface. Don't use.
   */
  GetTeam(): DOTATeam_t;
}
/**
 * Animating models
 */
interface CBaseAnimating extends CBaseModelEntity {
    /**
     * Returns the duration in seconds of the active sequence.
     */
    ActiveSequenceDuration(): number;
    /**
     * Get the attachment id's angles as a p,y,r vector.
     */
    GetAttachmentAngles(iAttachment: number): Vector;
    /**
     * Get the attachment id's origin vector.
     */
    GetAttachmentOrigin(iAttachment: number): Vector;
    /**
     * Get the value of the given animGraph parameter
     */
    GetGraphParameter(pszParam: string): any;
    /**
     * Get scale of entity's model.
     */
    GetModelScale(): number;
    /**
     * Returns the name of the active sequence.
     */
    GetSequence(): string;
    /**
     * Ask whether the main sequence is done playing.
     */
    IsSequenceFinished(): boolean;
    /**
     * Sets the active sequence by name, resetting the current cycle.
     */
    ResetSequence(pSequenceName: string): void;
    /**
     * Get the named attachment id.
     */
    ScriptLookupAttachment(pAttachmentName: string): number;
    /**
     * Returns the duration in seconds of the given sequence name.
     */
    SequenceDuration(pSequenceName: string): number;
    /**
     * Sets a bodygroup.
     */
    SetBodygroup(iGroup: number, iValue: number): void;
    /**
     * Sets a bodygroup by name.
     */
    SetBodygroupByName(pName: string, iValue: number): void;
    /**
     * Pass the vector value to the specified param in the graph
     */
    SetGraphLookDirection(vValue: Vector): void;
    /**
     * Set the specific param value, type is inferred from the type in script
     */
    SetGraphParameter(pszParam: string, svArg: any): void;
    /**
     * Set the specific param on or off
     */
    SetGraphParameterBool(szName: string, bValue: boolean): void;
    /**
     * Pass the enum (int) value to the specified param
     */
    SetGraphParameterEnum(szName: string, nValue: number): void;
    /**
     * Pass the float value to the specified param
     */
    SetGraphParameterFloat(szName: string, flValue: number): void;
    /**
     * Pass the int value to the specified param
     */
    SetGraphParameterInt(szName: string, nValue: number): void;
    /**
     * Pass the vector value to the specified param in the graph
     */
    SetGraphParameterVector(szName: string, vValue: Vector): void;
    /**
     * Set scale of entity's model.
     */
    SetModelScale(flScale: number): void;
    /**
     * Set the specified pose parameter to the specified value.
     */
    SetPoseParameter(szName: string, fValue: number): number;
    /**
     * Sets the named procedural IK target.
     */
    SetProceduralIKTarget(pChainName: string, pTargetName: string, vTargetPosition: Vector, qTargetRotation: QAngle): boolean;
    /**
     * Sets the named procedural IK targets weight: 0 = full animation, 1 = full IK.
     */
    SetProceduralIKTargetWeight(pChainName: string, pTargetName: string, flWeight: number): boolean;
    /**
     * Sets the active sequence by name, keeping the current cycle.
     */
    SetSequence(pSequenceName: string): void;
    /**
     * Set skin (int).
     */
    SetSkin(iSkin: number): void;
    /**
     * Stop the current animation by setting playback rate to 0.0.
     */
    StopAnimation(): void;
}
/**
 * BaseCombatCharacter
 */
interface CBaseCombatCharacter extends CBaseFlex {
    /**
     * GetEquippedWeapons() : Returns an array of all the equipped weapons
     */
    GetEquippedWeapons(): any;
    /**
     * Get the combat character faction.
     */
    GetFaction(): number;
    /**
     * GetWeaponCount() : Gets the number of weapons currently equipped
     */
    GetWeaponCount(): number;
    /**
     * Returns the shoot position eyes (or hand in VR).
     */
    ShootPosition(nHand: number): Vector;
}
/**
 * Root class of all server-side entities
 */
interface CBaseEntity extends CEntityInstance {
    /**
     * AddEffects( int ): Adds the render effect flag.
     */
    AddEffects(nFlags: number): void;
    /**
     * Apply a Velocity Impulse
     */
    ApplyAbsVelocityImpulse(vecImpulse: Vector): void;
    /**
     * Apply an Ang Velocity Impulse
     */
    ApplyLocalAngularVelocityImpulse(angImpulse: Vector): void;
    /**
     * Get float value for an entity attribute.
     */
    Attribute_GetFloatValue(pName: string, flDefault: number): number;
    /**
     * Get int value for an entity attribute.
     */
    Attribute_GetIntValue(pName: string, nDefault: number): number;
    /**
     * Set float value for an entity attribute.
     */
    Attribute_SetFloatValue(pName: string, flValue: number): void;
    /**
     * Set int value for an entity attribute.
     */
    Attribute_SetIntValue(pName: string, nValue: number): void;
    /**
     * Delete an entity attribute.
     */
    DeleteAttribute(pName: string): void;
    /**
     * Plays a sound from this entity.
     */
    EmitSound(soundname: string): void;
    /**
     * Plays/modifies a sound from this entity. changes sound if nPitch and/or flVol or flSoundTime is > 0.
     */
    EmitSoundParams(soundname: string, nPitch: number, flVolume: number, flDelay: number): void;
    /**
     * Get the qangles that this entity is looking at.
     */
    EyeAngles(): QAngle;
    /**
     * Get vector to eye position - absolute coords.
     */
    EyePosition(): Vector;
    FirstMoveChild(): CBaseEntity;
    /**
     * hEntity to follow, bool bBoneMerge
     */
    FollowEntity(hEnt: CBaseEntity, bBoneMerge: boolean): void;
    /**
     * Returns a table containing the criteria that would be used for response queries on this entity. This is the same as the table that is passed to response rule script function callbacks.
     */
    GatherCriteria(hResult: table): void;
    GetAbsOrigin(): Vector;
    GetAbsScale(): number;
    GetAngles(): QAngle;
    /**
     * Get entity pitch, yaw, roll as a vector.
     */
    GetAnglesAsVector(): Vector;
    /**
     * Get the local angular velocity - returns a vector of pitch,yaw,roll
     */
    GetAngularVelocity(): Vector;
    /**
     * Get Base? velocity.
     */
    GetBaseVelocity(): Vector;
    /**
     * Get a vector containing max bounds, centered on object.
     */
    GetBoundingMaxs(): Vector;
    /**
     * Get a vector containing min bounds, centered on object.
     */
    GetBoundingMins(): Vector;
    /**
     * Get a table containing the 'Mins' & 'Maxs' vector bounds, centered on object.
     */
    GetBounds(): any;
    /**
     * Get vector to center of object - absolute coords
     */
    GetCenter(): Vector;
    /**
     * Get the entities parented to this entity.
     */
    GetChildren(): table;
    /**
     * GetContext( name ): looks up a context and returns it if available. May return string, float, or null (if the context isn't found).
     */
    GetContext(name: string): any;
    /**
     * Get the forward vector of the entity.
     */
    GetForwardVector(): Vector;
    /**
     * Get the health of this entity.
     */
    GetHealth(): number;
    /**
     * Get entity local pitch, yaw, roll as a QAngle
     */
    GetLocalAngles(): QAngle;
    /**
     * Maybe local angvel
     */
    GetLocalAngularVelocity(): QAngle;
    /**
     * Get entity local origin as a Vector
     */
    GetLocalOrigin(): Vector;
    GetLocalScale(): number;
    /**
     * Get Entity relative velocity.
     */
    GetLocalVelocity(): Vector;
    /**
     * Get the mass of an entity. (returns 0 if it doesn't have a physics object)
     */
    GetMass(): number;
    /**
     * Get the maximum health of this entity.
     */
    GetMaxHealth(): number;
    /**
     * Returns the name of the model.
     */
    GetModelName(): string;
    /**
     * If in hierarchy, retrieves the entity's parent.
     */
    GetMoveParent(): CBaseEntity;
    GetOrigin(): Vector;
    /**
     * Gets this entity's owner
     */
    GetOwner(): CBaseEntity;
    /**
     * Get the owner entity, if there is one
     */
    GetOwnerEntity(): CBaseEntity;
    /**
     * Get the right vector of the entity.
     */
    GetRightVector(): Vector;
    /**
     * If in hierarchy, walks up the hierarchy to find the root parent.
     */
    GetRootMoveParent(): CBaseEntity;
    /**
     * Returns float duration of the sound. Takes soundname and optional actormodelname.
     */
    GetSoundDuration(soundname: string, actormodel: string): number;
    /**
     * Get the team number of this entity.
     */
    GetTeam(): DOTATeam_t;
    /**
     * Get the team number of this entity.
     */
    GetTeamNumber(): DOTATeam_t;
    /**
     * Get the up vector of the entity.
     */
    GetUpVector(): Vector;
    GetVelocity(): Vector;
    /**
     * See if an entity has a particular attribute.
     */
    HasAttribute(pName: string): boolean;
    /**
     * Is this entity alive?
     */
    IsAlive(): boolean;
    /**
     * Is this entity an CAI_BaseNPC?
     */
    IsNPC(): boolean;
    /**
     * Is this entity a player?
     */
    IsPlayer(): boolean;
    Kill(): void;
    NextMovePeer(): CBaseEntity;
    /**
     * Takes duration, value for a temporary override.
     */
    OverrideFriction(duration: number, friction: number): void;
    /**
     * Precache a sound for later playing.
     */
    PrecacheScriptSound(soundname: string): void;
    /**
     * RemoveEffects( int ): Removes the render effect flag.
     */
    RemoveEffects(nFlags: number): void;
    /**
     * Set entity pitch, yaw, roll by component.
     */
    SetAbsAngles(fPitch: number, fYaw: number, fRoll: number): void;
    SetAbsOrigin(origin: Vector): void;
    SetAbsScale(flScale: number): void;
    /**
     * Set entity pitch, yaw, roll by component.
     */
    SetAngles(fPitch: number, fYaw: number, fRoll: number): void;
    /**
     * Set the local angular velocity - takes float pitch,yaw,roll velocities
     */
    SetAngularVelocity(pitchVel: number, yawVel: number, rollVel: number): void;
    /**
     * Set the position of the constraint.
     */
    SetConstraint(vPos: Vector): void;
    /**
     * SetContext( name , value, duration ): store any key/value pair in this entity's dialog contexts. Value must be a string. Will last for duration (set 0 to mean 'forever').
     */
    SetContext(pName: string, pValue: string, duration: number): void;
    /**
     * SetContextNum( name , value, duration ): store any key/value pair in this entity's dialog contexts. Value must be a number (int or float). Will last for duration (set 0 to mean 'forever').
     */
    SetContextNum(pName: string, fValue: number, duration: number): void;
    /**
     * Set a think function on this entity.
     */
    SetContextThink(pszContextName: string, hThinkFunc: table, flInterval: number): void;
    /**
     * Set the name of an entity.
     */
    SetEntityName(pName: string): void;
    /**
     * Set the orientation of the entity to have this forward vector.
     */
    SetForwardVector(v: Vector): void;
    /**
     * Set PLAYER friction, ignored for objects.
     */
    SetFriction(flFriction: number): void;
    /**
     * Set PLAYER gravity, ignored for objects.
     */
    SetGravity(flGravity: number): void;
    /**
     * Set the health of this entity.
     */
    SetHealth(nHealth: number): void;
    /**
     * Set entity local pitch, yaw, roll by component
     */
    SetLocalAngles(fPitch: number, fYaw: number, fRoll: number): void;
    /**
     * Set entity local origin from a Vector
     */
    SetLocalOrigin(origin: Vector): void;
    SetLocalScale(flScale: number): void;
    /**
     * Set the mass of an entity. (does nothing if it doesn't have a physics object)
     */
    SetMass(flMass: number): void;
    /**
     * Set the maximum health of this entity.
     */
    SetMaxHealth(amt: number): void;
    SetOrigin(v: Vector): void;
    /**
     * Sets this entity's owner
     */
    SetOwner(pOwner: CBaseEntity): void;
    /**
     * Set the parent for this entity.
     */
    SetParent(hParent: table, pAttachmentname: string): void;
    SetTeam(iTeamNum: DOTATeam_t): void;
    SetVelocity(vecVelocity: Vector): void;
    /**
     * Stops a named sound playing from this entity.
     */
    StopSound(soundname: string): void;
    /**
     * Apply damage to this entity. Use CreateDamageInfo() to create a damageinfo object.
     */
    TakeDamage(hInfo: table): number;
    /**
     * Fires off this entity's OnTrigger responses.
     */
    Trigger(): void;
    /**
     * Validates the private script scope and creates it if one doesn't exist.
     */
    ValidatePrivateScriptScope(): void;
}
/**
 * Animated characters who have vertex flex capability.
 */
interface CBaseFlex extends CBaseAnimating {
    /**
     * Returns the instance of the oldest active scene entity (if any).
     */
    GetCurrentScene(): table;
    /**
     * Returns the instance of the scene entity at the specified index.
     */
    GetSceneByIndex(index: number): table;
    /**
     * ( vcd file, delay ) - play specified vcd file
     */
    ScriptPlayScene(pszScene: string, flDelay: number): number;
}
/**
 * Base entity with model
 */
interface CBaseModelEntity extends CBaseEntity {
    /**
     * GetMaterialGroupHash(): Get the material group hash of this entity.
     */
    GetMaterialGroupHash(): number;
    /**
     * GetMaterialGroupMask(): Get the mesh group mask of this entity.
     */
    GetMaterialGroupMask(): number;
    /**
     * GetRenderAlpha(): Get the alpha modulation of this entity.
     */
    GetRenderAlpha(): number;
    /**
     * GetRenderColor(): Get the render color of the entity.
     */
    GetRenderColor(): Vector;
    /**
     * SetLightGroup( string ): Sets the light group of the entity.
     */
    SetLightGroup(pLightGroup: string): void;
    /**
     * SetMaterialGroup( string ): Set the material group of this entity.
     */
    SetMaterialGroup(pMaterialGroup: string): void;
    /**
     * SetMaterialGroupHash( uint32 ): Set the material group hash of this entity.
     */
    SetMaterialGroupHash(nHash: number): void;
    /**
     * SetMaterialGroupMask( uint64 ): Set the mesh group mask of this entity.
     */
    SetMaterialGroupMask(nMeshGroupMask: number): void;
    SetModel(pModelName: string): void;
    /**
     * SetRenderAlpha( int ): Set the alpha modulation of this entity.
     */
    SetRenderAlpha(nAlpha: number): void;
    /**
     * SetRenderColor( r, g, b ): Sets the render color of the entity.
     */
    SetRenderColor(r: number, g: number, b: number): void;
    /**
     * SetRenderMode( int ): Sets the render mode of the entity.
     */
    SetRenderMode(nMode: number): void;
    /**
     * SetSingleMeshGroup( string ): Set a single mesh group for this entity.
     */
    SetSingleMeshGroup(pMeshGroupName: string): void;
    SetSize(mins: Vector, maxs: Vector): void;
}
/**
 * The player entity.
 */
interface CBasePlayer extends CBaseCombatCharacter {
    /**
     * Returns whether this player's chaperone bounds are visible.
     */
    AreChaperoneBoundsVisible(): boolean;
    /**
     * Returns the HMD anchor entity for this player if it exists.
     */
    GetHMDAnchor(): table;
    /**
     * Returns the HMD Avatar entity for this player if it exists.
     */
    GetHMDAvatar(): table;
    /**
     * Returns the Vector position of the point you ask for. Pass 0-3 to get the four points.
     */
    GetPlayArea(nPoint: number): Vector;
    /**
     * Returns the player's user id.
     */
    GetUserID(): number;
    /**
     * Returns the type of controller being used while in VR.
     */
    GetVRControllerType(): any;
    /**
     * Returns true if the player is in noclip mode.
     */
    IsNoclipping(): boolean;
    /**
     * Returns true if the use key is pressed.
     */
    IsUsePressed(): boolean;
    /**
     * Returns true if the controller button is pressed.
     */
    IsVRControllerButtonPressed(nButton: number): boolean;
    /**
     * Returns true if the SteamVR dashboard is showing for this player.
     */
    IsVRDashboardShowing(): boolean;
    /**
     * Quit the game from script.
     */
    Quit(): void;
}
/**
 * Base Trigger for all the triggers
 */
interface CBaseTrigger extends CBaseEntity {
    /**
     * Disable's the trigger
     */
    Disable(): void;
    /**
     * Enable the trigger
     */
    Enable(): void;
    /**
     * Checks whether the passed entity is touching the trigger.
     */
    IsTouching(hEnt: CBaseEntity): boolean;
}
/**
 * Body Component Scriptdesc
 */
interface CBodyComponent {
    /**
     * Apply an impulse at a worldspace position to the physics
     */
    AddImpulseAtPosition(arg1: Vector, arg2: Vector): void;
    /**
     * Add linear and angular velocity to the physics object
     */
    AddVelocity(arg1: Vector, arg2: Vector): void;
    /**
     * Detach from its parent
     */
    DetachFromParent(): void;
    /**
     * Returns the active sequence
     */
    GetSequence(): any;
    /**
     * Is attached to parent
     */
    IsAttachedToParent(): boolean;
    /**
     * Returns a sequence id given a name
     */
    LookupSequence(arg1: string): any;
    /**
     * Returns the duration in seconds of the specified sequence
     */
    SequenceDuration(arg1: string): number;
    SetAngularVelocity(arg1: Vector): void;
    /**
     * Pass string for the animation to play on this model
     */
    SetAnimation(arg1: string): void;
    SetBodyGroup(arg1: string): void;
    SetMaterialGroup(arg1: utlstringtoken): void;
    SetVelocity(arg1: Vector): void;
}
/**
 * !Custom game event manager
 */
interface CCustomGameEventManager {
    /**
     * ( string EventName, func CallbackFunction ) - Register a callback to be called when a particular custom event arrives. Returns a listener ID that can be used to unregister later.
     */
    RegisterListener(eventName: string, handler: (event: table) => void): CCustomGameEventListener;
    /**
     * ( string EventName, table EventData )
     */
    Send_ServerToAllClients(eventName: string, eventData: table): void;
    /**
     * ( Entity Player, string EventName, table EventData )
     */
    Send_ServerToPlayer(player: CDOTAPlayer, eventName: string, eventData: table): void;
    /**
     * ( int TeamNumber, string EventName, table EventData )
     */
    Send_ServerToTeam(team: DOTATeam_t, eventName: string, eventData: table): void;
    /**
     * ( int ListnerID ) - Unregister a specific listener
     */
    UnregisterListener(listener: CCustomGameEventListener): void;
}
/**
 * !Custom network table manager
 */
interface CCustomNetTableManager {
    /**
     * ( string TableName, string KeyName )
     */
    GetTableValue(arg1: string, arg2: string): table;
    /**
     * ( string TableName, string KeyName, script_table Value )
     */
    SetTableValue(arg1: string, arg2: string, arg3: table): boolean;
}
/**
 * An ability
 */
interface CDOTABaseAbility extends CBaseEntity {
    CanAbilityBeUpgraded(): boolean;
    CastAbility(): boolean;
    ContinueCasting(): boolean;
    CreateVisibilityNode(vLocation: Vector, fRadius: number, fDuration: number): void;
    DecrementModifierRefCount(): void;
    EndChannel(bInterrupted: boolean): void;
    /**
     * Clear the cooldown remaining on this ability.
     */
    EndCooldown(): void;
    GetAbilityDamage(): number;
    GetAbilityDamageType(): DAMAGE_TYPES;
    GetAbilityIndex(): number;
    /**
     * Gets the key values definition for this ability.
     */
    GetAbilityKeyValues(): table;
    /**
     * Returns the name of this ability.
     */
    GetAbilityName(): string;
    GetAbilityTargetFlags(): DOTA_UNIT_TARGET_FLAGS;
    GetAbilityTargetTeam(): DOTA_UNIT_TARGET_TEAM;
    GetAbilityTargetType(): DOTA_UNIT_TARGET_TYPE;
    GetAbilityType(): number;
    GetAnimationIgnoresModelScale(): boolean;
    GetAssociatedPrimaryAbilities(): string;
    GetAssociatedSecondaryAbilities(): string;
    GetAutoCastState(): boolean;
    GetBackswingTime(): number;
    GetBehavior(): number;
    GetCastPoint(): number;
    /**
     * Gets the cast range of the ability.
     */
    GetCastRange(vLocation: Vector, hTarget: CDOTA_BaseNPC): number;
    GetCaster(): CDOTA_BaseNPC;
    GetChannelStartTime(): number;
    GetChannelTime(): number;
    GetChannelledManaCostPerSecond(iLevel: number): number;
    GetCloneSource(): CDOTA_BaseNPC;
    GetConceptRecipientType(): number;
    /**
     * Get the cooldown duration for this ability at a given level, not the amount of cooldown actually left.
     */
    GetCooldown(iLevel: number): number;
    GetCooldownTime(): number;
    GetCooldownTimeRemaining(): number;
    GetCursorPosition(): Vector;
    GetCursorTarget(): CDOTA_BaseNPC;
    GetCursorTargetingNothing(): boolean;
    GetDuration(): number;
    GetGoldCost(iLevel: number): number;
    GetGoldCostForUpgrade(iLevel: number): number;
    GetHeroLevelRequiredToUpgrade(): number;
    GetIntrinsicModifierName(): string;
    /**
     * Get the current level of the ability.
     */
    GetLevel(): number;
    GetLevelSpecialValueFor(valueName: string, nLevel: number): number;
    GetManaCost(iLevel: number): number;
    GetMaxLevel(): number;
    GetModifierValue(): number;
    GetModifierValueBonus(): number;
    GetPlaybackRateOverride(): number;
    GetSharedCooldownName(): string;
    /**
     * Gets a value from this ability's special value block for its current level.
     */
    GetSpecialValueFor(valueName: string): number;
    GetStolenActivityModifier(): string;
    GetToggleState(): boolean;
    HeroXPChange(flXP: number): boolean;
    IncrementModifierRefCount(): void;
    IsActivated(): boolean;
    IsAttributeBonus(): boolean;
    /**
     * Returns whether the ability is currently channeling.
     */
    IsChanneling(): boolean;
    IsCooldownReady(): boolean;
    IsCosmetic(hEntity: CBaseEntity): boolean;
    /**
     * Returns whether the ability can be cast.
     */
    IsFullyCastable(): boolean;
    IsHidden(): boolean;
    IsHiddenWhenStolen(): boolean;
    /**
     * Returns whether the ability is currently casting.
     */
    IsInAbilityPhase(): boolean;
    IsItem(): boolean;
    IsOwnersGoldEnough(nIssuerPlayerID: number): boolean;
    IsOwnersGoldEnoughForUpgrade(): boolean;
    IsOwnersManaEnough(): boolean;
    IsPassive(): boolean;
    IsRefreshable(): boolean;
    IsSharedWithTeammates(): boolean;
    IsStealable(): boolean;
    IsStolen(): boolean;
    IsToggle(): boolean;
    IsTrained(): boolean;
    /**
     * Mark the ability button for this ability as needing a refresh.
     */
    MarkAbilityButtonDirty(): void;
    NumModifiersUsingAbility(): number;
    OnAbilityPhaseInterrupted(): void;
    OnAbilityPhaseStart(): boolean;
    OnAbilityPinged(nPlayerID: number): void;
    OnChannelFinish(bInterrupted: boolean): void;
    OnChannelThink(flInterval: number): void;
    OnHeroCalculateStatBonus(): void;
    OnHeroLevelUp(): void;
    OnOwnerDied(): void;
    OnOwnerSpawned(): void;
    OnSpellStart(): void;
    OnToggle(): void;
    OnUpgrade(): void;
    PayGoldCost(): void;
    PayGoldCostForUpgrade(): void;
    PayManaCost(): void;
    PlaysDefaultAnimWhenStolen(): boolean;
    ProcsMagicStick(): boolean;
    RefCountsModifiers(): boolean;
    RefreshCharges(): void;
    RefundManaCost(): void;
    ResetToggleOnRespawn(): boolean;
    SetAbilityIndex(iIndex: number): void;
    SetActivated(bActivated: boolean): void;
    SetChanneling(bChanneling: boolean): void;
    SetFrozenCooldown(bFrozenCooldown: boolean): void;
    SetHidden(bHidden: boolean): void;
    SetInAbilityPhase(bInAbilityPhase: boolean): void;
    /**
     * Sets the level of this ability.
     */
    SetLevel(iLevel: number): void;
    SetOverrideCastPoint(flCastPoint: number): void;
    SetRefCountsModifiers(bRefCounts: boolean): void;
    SetStolen(bStolen: boolean): void;
    ShouldUseResources(): boolean;
    SpeakAbilityConcept(iConcept: number): void;
    SpeakTrigger(): any;
    StartCooldown(flCooldown: number): void;
    ToggleAbility(): void;
    ToggleAutoCast(): void;
    UpgradeAbility(bSupressSpeech: boolean): void;
    UseResources(bMana: boolean, bGold: boolean, bCooldown: boolean): void;
}
/**
 * Base game mode class
 */
interface CDOTABaseGameMode extends CBaseEntity {
    /**
     * Get if weather effects are disabled on the client.
     */
    AreWeatherEffectsDisabled(): boolean;
    /**
     * Clear the script filter that controls bounty rune pickup behavior.
     */
    ClearBountyRunePickupFilter(): void;
    /**
     * Clear the script filter that controls how a unit takes damage.
     */
    ClearDamageFilter(): void;
    /**
     * Clear the script filter that controls when a unit picks up an item.
     */
    ClearExecuteOrderFilter(): void;
    /**
     * Clear the script filter that controls how a unit heals.
     */
    ClearHealingFilter(): void;
    /**
     * Clear the script filter that controls the item added to inventory filter.
     */
    ClearItemAddedToInventoryFilter(): void;
    /**
     * Clear the script filter that controls the modifier filter.
     */
    ClearModifierGainedFilter(): void;
    /**
     * Clear the script filter that controls how hero experience is modified.
     */
    ClearModifyExperienceFilter(): void;
    /**
     * Clear the script filter that controls how hero gold is modified.
     */
    ClearModifyGoldFilter(): void;
    /**
     * Clear the script filter that controls what rune spawns.
     */
    ClearRuneSpawnFilter(): void;
    /**
     * Clear the script filter that controls when tracking projectiles are launched.
     */
    ClearTrackingProjectileFilter(): void;
    /**
     * Use to disable hud flip for this mod
     */
    DisableHudFlip(bDisable: boolean): void;
    /**
     * Show the player hero's inventory in the HUD, regardless of what unit is selected.
     */
    GetAlwaysShowPlayerInventory(): boolean;
    /**
     * Get whether player names are always shown, regardless of client setting.
     */
    GetAlwaysShowPlayerNames(): boolean;
    /**
     * Are in-game announcers disabled?
     */
    GetAnnouncerDisabled(): boolean;
    /**
     * Set a different camera distance; dota default is 1134.
     */
    GetCameraDistanceOverride(): number;
    /**
     * Get current derived stat value constant.
     */
    GetCustomAttributeDerivedStatValue(nDerivedStatType: AttributeDerivedStats): number;
    /**
     * Turns on capability to define custom buyback cooldowns.
     */
    GetCustomBuybackCooldownEnabled(): boolean;
    /**
     * Turns on capability to define custom buyback costs.
     */
    GetCustomBuybackCostEnabled(): boolean;
    /**
     * Allows definition of the max level heroes can achieve (default is 25).
     */
    GetCustomHeroMaxLevel(): number;
    /**
     * Gets the fixed respawn time.
     */
    GetFixedRespawnTime(): number;
    /**
     * Turn the fog of war on or off.
     */
    GetFogOfWarDisabled(): boolean;
    /**
     * Turn the sound when gold is acquired off/on.
     */
    GetGoldSoundDisabled(): boolean;
    /**
     * Returns the HUD element visibility.
     */
    GetHUDVisible(iElement: number): boolean;
    /**
     * Get the maximum attack speed for units.
     */
    GetMaximumAttackSpeed(): number;
    /**
     * Get the minimum attack speed for units.
     */
    GetMinimumAttackSpeed(): number;
    /**
     * Turn the panel for showing recommended items at the shop off/on.
     */
    GetRecommendedItemsDisabled(): boolean;
    /**
     * Returns the scale applied to non-fixed respawn times.
     */
    GetRespawnTimeScale(): number;
    /**
     * Turn purchasing items to the stash off/on. If purchasing to the stash is off the player must be at a shop to purchase items.
     */
    GetStashPurchasingDisabled(): boolean;
    /**
     * Hide the sticky item in the quickbuy.
     */
    GetStickyItemDisabled(): boolean;
    /**
     * Override the values of the team values on the top game bar.
     */
    GetTopBarTeamValuesOverride(): boolean;
    /**
     * Turning on/off the team values on the top game bar.
     */
    GetTopBarTeamValuesVisible(): boolean;
    /**
     * Gets whether tower backdoor protection is enabled or not.
     */
    GetTowerBackdoorProtectionEnabled(): boolean;
    /**
     * Are custom-defined XP values for hero level ups in use?
     */
    GetUseCustomHeroLevels(): boolean;
    /**
     * Enables or disables buyback completely.
     */
    IsBuybackEnabled(): boolean;
    /**
     * Is the day/night cycle disabled?
     */
    IsDaynightCycleDisabled(): boolean;
    /**
     * Set a filter function to control the tuning values that abilities use. (Modify the table and Return true to use new values, return false to use the old values)
     */
    SetAbilityTuningValueFilter(filterFunc: (event: table) => boolean, hContext: table): void;
    /**
     * Show the player hero's inventory in the HUD, regardless of what unit is selected.
     */
    SetAlwaysShowPlayerInventory(bAlwaysShow: boolean): void;
    /**
     * Set whether player names are always shown, regardless of client setting.
     */
    SetAlwaysShowPlayerNames(bEnabled: boolean): void;
    /**
     * Mutes the in-game announcer.
     */
    SetAnnouncerDisabled(bDisabled: boolean): void;
    /**
     * Enables/Disables bots in custom games. Note: this will only work with default heroes in the dota map.
     */
    SetBotThinkingEnabled(bEnabled: boolean): void;
    /**
     * Set if the bots should try their best to push with a human player.
     */
    SetBotsAlwaysPushWithHuman(bAlwaysPush: boolean): void;
    /**
     * Set if bots should enable their late game behavior.
     */
    SetBotsInLateGame(bLateGame: boolean): void;
    /**
     * Set the max tier of tower that bots want to push. (-1 to disable)
     */
    SetBotsMaxPushTier(nMaxTier: number): void;
    /**
     * Set a filter function to control the behavior when a bounty rune is picked up. (Modify the table and Return true to use new values, return false to cancel the event)
     */
    SetBountyRunePickupFilter(filterFunc: (event: table) => boolean, hContext: table): void;
    /**
     * Enables or disables buyback completely.
     */
    SetBuybackEnabled(bEnabled: boolean): void;
    /**
     * Set a different camera distance; dota default is 1134.
     */
    SetCameraDistanceOverride(flCameraDistanceOverride: number): void;
    /**
     * Set a different camera smooth count; dota default is 8.
     */
    SetCameraSmoothCountOverride(nSmoothCount: number): void;
    /**
     * Modify derived stat value constants. ( AttributeDerivedStat eStatType, float flNewValue.
     */
    SetCustomAttributeDerivedStatValue(nStatType: AttributeDerivedStats, flNewValue: number): void;
    /**
     * Turns on capability to define custom buyback cooldowns.
     */
    SetCustomBuybackCooldownEnabled(bEnabled: boolean): void;
    /**
     * Turns on capability to define custom buyback costs.
     */
    SetCustomBuybackCostEnabled(bEnabled: boolean): void;
    /**
     * Force all players to use the specified hero and disable the normal hero selection process. Must be used before hero selection.
     */
    SetCustomGameForceHero(pHeroName: string): void;
    /**
     * Allows definition of the max level heroes can achieve (default is 25).
     */
    SetCustomHeroMaxLevel(iMaxLevel: number): void;
    /**
     * Set the effect used as a custom weather effect, when units are on non-default terrain, in this mode.
     */
    SetCustomTerrainWeatherEffect(pszEffectName: string): void;
    /**
     * Allows definition of a table of hero XP values.
     */
    SetCustomXPRequiredToReachNextLevel(hTable: table): void;
    /**
     * Set a filter function to control the behavior when a unit takes damage. (Modify the table and Return true to use new values, return false to cancel the event)
     */
    SetDamageFilter(filterFunc: (event: table) => boolean, hContext: table): void;
    /**
     * Enable or disable the day/night cycle.
     */
    SetDaynightCycleDisabled(bDisable: boolean): void;
    /**
     * Specify whether the full screen death overlay effect plays when the selected hero dies.
     */
    SetDeathOverlayDisabled(bDisabled: boolean): void;
    /**
     * Set a filter function to control the behavior when a unit picks up an item. (Modify the table and Return true to use new values, return false to cancel the event)
     */
    SetExecuteOrderFilter(filterFunc: (order: table) => boolean, hContext: table): void;
    /**
     * Set a fixed delay for all players to respawn after.
     */
    SetFixedRespawnTime(flFixedRespawnTime: number): void;
    /**
     * Turn the fog of war on or off.
     */
    SetFogOfWarDisabled(bDisabled: boolean): void;
    /**
     * Set the constant rate that the fountain will regen mana. (-1 for default)
     */
    SetFountainConstantManaRegen(flConstantManaRegen: number): void;
    /**
     * Set the percentage rate that the fountain will regen health. (-1 for default)
     */
    SetFountainPercentageHealthRegen(flPercentageHealthRegen: number): void;
    /**
     * Set the percentage rate that the fountain will regen mana. (-1 for default)
     */
    SetFountainPercentageManaRegen(flPercentageManaRegen: number): void;
    /**
     * Allows clicks on friendly buildings to be handled normally.
     */
    SetFriendlyBuildingMoveToEnabled(bEnabled: boolean): void;
    /**
     * Turn the sound when gold is acquired off/on.
     */
    SetGoldSoundDisabled(bDisabled: boolean): void;
    /**
     * Set the HUD element visibility.
     */
    SetHUDVisible(iHUDElement: DOTAHUDVisibility_t, bVisible: boolean): void;
    /**
     * Set a filter function to control the behavior when a unit heals. (Modify the table and Return true to use new values, return false to cancel the event)
     */
    SetHealingFilter(hFunction: (event: table) => boolean, hContext: table): void;
    /**
     * Specify whether the default combat events will show in the HUD.
     */
    SetHudCombatEventsDisabled(bDisabled: boolean): void;
    /**
     * Set a filter function to control what happens to items that are added to an inventory, return false to cancel the event
     */
    SetItemAddedToInventoryFilter(filterFunc: (event: table) => boolean, hContext: table): void;
    /**
     * Mutes the in-game killing spree announcer.
     */
    SetKillingSpreeAnnouncerDisabled(bDisabled: boolean): void;
    /**
     * Use to disable gold loss on death.
     */
    SetLoseGoldOnDeath(bEnabled: boolean): void;
    /**
     * Set the maximum attack speed for units.
     */
    SetMaximumAttackSpeed(nMaxSpeed: number): void;
    /**
     * Set the minimum attack speed for units.
     */
    SetMinimumAttackSpeed(nMinSpeed: number): void;
    /**
     * Set a filter function to control modifiers that are gained, return false to destroy modifier.
     */
    SetModifierGainedFilter(filterFunc: (event: table) => boolean, hContext: table): void;
    /**
     * Set a filter function to control the behavior when a hero's experience is modified. (Modify the table and Return true to use new values, return false to cancel the event)
     */
    SetModifyExperienceFilter(filterFunc: (event: table) => boolean, hContext: table): void;
    /**
     * Set a filter function to control the behavior when a hero's gold is modified. (Modify the table and Return true to use new values, return false to cancel the event)
     */
    SetModifyGoldFilter(filterFunc: (event: table) => boolean, hContext: table): void;
    /**
     * Set an override for the default selection entity, instead of each player's hero.
     */
    SetOverrideSelectionEntity(hOverrideEntity: CDOTA_BaseNPC): void;
    /**
     * Turn the panel for showing recommended items at the shop off/on.
     */
    SetRecommendedItemsDisabled(bDisabled: boolean): void;
    /**
     * Make it so illusions are immediately removed upon death, rather than sticking around for a few seconds.
     */
    SetRemoveIllusionsOnDeath(bRemove: boolean): void;
    /**
     * Sets the scale applied to non-fixed respawn times. 1 = default DOTA respawn calculations.
     */
    SetRespawnTimeScale(flValue: number): void;
    /**
     * Set if a given type of rune is enabled.
     */
    SetRuneEnabled(nRune: DOTA_RUNES, bEnabled: boolean): void;
    /**
     * Set a filter function to control what rune spawns. (Modify the table and Return true to use new values, return false to cancel the event)
     */
    SetRuneSpawnFilter(filterFunc: (event: table) => boolean, hContext: table): void;
    /**
     * Enable/disable gold penalty for late picking.
     */
    SetSelectionGoldPenaltyEnabled(bEnabled: boolean): void;
    /**
     * Turn purchasing items to the stash off/on. If purchasing to the stash is off the player must be at a shop to purchase items.
     */
    SetStashPurchasingDisabled(bDisabled: boolean): void;
    /**
     * Hide the sticky item in the quickbuy.
     */
    SetStickyItemDisabled(bDisabled: boolean): void;
    /**
     * Set the team values on the top game bar.
     */
    SetTopBarTeamValue(iTeam: DOTATeam_t, nValue: number): void;
    /**
     * Override the values of the team values on the top game bar.
     */
    SetTopBarTeamValuesOverride(bOverride: boolean): void;
    /**
     * Turning on/off the team values on the top game bar.
     */
    SetTopBarTeamValuesVisible(bVisible: boolean): void;
    /**
     * Enables/Disables tower backdoor protection.
     */
    SetTowerBackdoorProtectionEnabled(bEnabled: boolean): void;
    /**
     * Set a filter function to control when tracking projectiles are launched. (Modify the table and Return true to use new values, return false to cancel the event)
     */
    SetTrackingProjectileFilter(filterFunc: (event: table) => boolean, hContext: table): void;
    /**
     * Enable or disable unseen fog of war. When enabled parts of the map the player has never seen will be completely hidden by fog of war.
     */
    SetUnseenFogOfWarEnabled(bEnabled: boolean): void;
    /**
     * Turn on custom-defined XP values for hero level ups.  The table should be defined before switching this on.
     */
    SetUseCustomHeroLevels(bEnabled: boolean): void;
    /**
     * Set if weather effects are disabled.
     */
    SetWeatherEffectsDisabled(bDisable: boolean): void;
}
/**
 * !The Dota game manager
 */
interface CDOTAGameManager {
    /**
     * Get the hero unit
     */
    GetHeroDataByName_Script(arg1: string): any;
    /**
     * Get the hero ID given the hero name.
     */
    GetHeroIDByName(arg1: string): number;
    /**
     * Get the hero name given a hero ID.
     */
    GetHeroNameByID(arg1: number): string;
    /**
     * Get the hero name given a unit name.
     */
    GetHeroNameForUnitName(arg1: string): string;
    /**
     * Get the hero unit name given the hero ID.
     */
    GetHeroUnitNameByID(arg1: number): string;
}
/**
 * !DOTA GameRules
 */
declare interface CDOTAGamerules {
    /**
     * Event-only ( string szNameSuffix, int nStars, int nMaxStars, int nExtraData1, int nExtraData2 )
     */
    AddEventMetadataLeaderboardEntry(arg1: string, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number): boolean;
    /**
     * Add a point on the minimap.
     */
    AddMinimapDebugPoint(arg1: number, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number): void;
    /**
     * Add a point on the minimap for a specific team.
     */
    AddMinimapDebugPointForTeam(arg1: number, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number): void;
    /**
     * Begin night stalker night.
     */
    BeginNightstalkerNight(duration: number): void;
    /**
     * Begin temporary night.
     */
    BeginTemporaryNight(duration: number): void;
    /**
     * Kills the ancient, etc.
     */
    Defeated(): void;
    /**
     * true when we have waited some time after end of the game and not received signout
     */
    DidMatchSignoutTimeOut(): boolean;
    /**
     * Enabled (true) or disable (false) auto launch for custom game setup.
     */
    EnableCustomGameSetupAutoLaunch(enabled: boolean): void;
    /**
     * Indicate that the custom game setup phase is complete, and advance to the game.
     */
    FinishCustomGameSetup(): void;
    /**
     * Returns the difficulty level of the custom game mode
     */
    GetCustomGameDifficulty(): number;
    /**
     * Get whether a team is selectable during game setup
     */
    GetCustomGameTeamMaxPlayers(team: DOTATeam_t): number;
    /**
     * (b IncludePregameTime b IncludeNegativeTime) Returns the actual DOTA in-game clock time.
     */
    GetDOTATime(includePreGame: boolean, includeNegativeTime: boolean): number;
    /**
     * Returns difficulty level of the custom game mode
     */
    GetDifficulty(): number;
    /**
     * Gets the Xth dropped item
     */
    GetDroppedItem(index: number): CDOTA_Item;
    /**
     * Returns the number of seconds elapsed since the last frame was renderered. This time doesn't count up when the game is paused
     */
    GetGameFrameTime(): number;
    /**
     * Get the game mode entity
     */
    GetGameModeEntity(): CDOTABaseGameMode;
    /**
     * Get a string value from the game session config (map options)
     */
    GetGameSessionConfigValue(arg1: string, arg2: string): string;
    /**
     * Returns the number of seconds elapsed since map start. This time doesn't count up when the game is paused
     */
    GetGameTime(): number;
    /**
     * Get the MatchID for this game.
     */
    GetMatchID(): number;
    /**
     * Have we received the post match signout message that includes reward information
     */
    GetMatchSignoutComplete(): boolean;
    /**
     * For New Bloom, get total damage taken by the Nian / Year Beast
     */
    GetNianTotalDamageTaken(): number;
    /**
     * (Preview/Unreleased) Gets the player's custom game account record, as it looked at the start of this session
     */
    GetPlayerCustomGameAccountRecord(arg1: number): any;
    /**
     * Get the time of day
     */
    GetTimeOfDay(): number;
    /**
     * Are cheats enabled on the server
     */
    IsCheatMode(): boolean;
    /**
     * Is it day time?
     */
    IsDaytime(): boolean;
    /**
     * Returns whether the game is paused.
     */
    IsGamePaused(): boolean;
    /**
     * Returns whether hero respawn is enabled.
     */
    IsHeroRespawnEnabled(): boolean;
    /**
     * Is it night stalker night-time?
     */
    IsNightstalkerNight(): boolean;
    /**
     * Is it temporarily night-time?
     */
    IsTemporaryNight(): boolean;
    /**
     * Lock (true) or unlock (false) team assignemnt. If team assignment is locked players cannot change teams.
     */
    LockCustomGameSetupTeamAssignment(locked: boolean): void;
    /**
     * Makes the specified team lose
     */
    MakeTeamLose(team: DOTATeam_t): void;
    /**
     * Returns the number of items currently dropped on the ground
     */
    NumDroppedItems(): number;
    /**
     * Whether a player has custom game host privileges (shuffle teams, etc.)
     */
    PlayerHasCustomGameHostPrivileges(player: CDOTAPlayer): boolean;
    /**
     * Updates custom hero, unit and ability KeyValues in memory with the latest values from disk
     */
    Playtesting_UpdateAddOnKeyValues(): void;
    /**
     * Restart after killing the ancient, etc.
     */
    ResetDefeated(): void;
    /**
     * Restart the game at hero selection
     */
    ResetToHeroSelection(): void;
    /**
     * Sends a message on behalf of a player.
     */
    SendCustomMessage(arg1: string, arg2: number, arg3: number): void;
    /**
     * Sends a message on behalf of a player to the specified team.
     */
    SendCustomMessageToTeam(arg1: string, arg2: number, arg3: number, arg4: number): void;
    /**
     * (flMinimapCreepIconScale) - Scale the creep icons on the minimap.
     */
    SetCreepMinimapIconScale(scale: number): void;
    /**
     * (Preview/Unreleased) Sets a callback to handle saving custom game account records (callback is passed a Player ID and should return a flat simple table)
     */
    SetCustomGameAccountRecordSaveFunction(arg1: table, arg2: table): void;
    /**
     * Sets a flag to enable/disable the default music handling code for custom games
     */
    SetCustomGameAllowBattleMusic(allow: boolean): void;
    /**
     * Sets a flag to enable/disable the default music handling code for custom games
     */
    SetCustomGameAllowHeroPickMusic(allow: boolean): void;
    /**
     * Sets a flag to enable/disable the default music handling code for custom games
     */
    SetCustomGameAllowMusicAtGameStart(allow: boolean): void;
    /**
     * Set the difficulty level of the custom game mode
     */
    SetCustomGameDifficulty(difficulty: number): void;
    /**
     * Sets the game end delay.
     */
    SetCustomGameEndDelay(delay: number): void;
    /**
     * Set the amount of time to wait for auto launch.
     */
    SetCustomGameSetupAutoLaunchDelay(delay: number): void;
    /**
     * Set the amount of remaining time, in seconds, for custom game setup. 0 = finish immediately, -1 = wait forever
     */
    SetCustomGameSetupRemainingTime(remainingTime: number): void;
    /**
     * Setup (pre-gameplay) phase timeout. 0 = instant, -1 = forever (until FinishCustomGameSetup is called)
     */
    SetCustomGameSetupTimeout(timeout: number): void;
    /**
     * Set whether a team is selectable during game setup
     */
    SetCustomGameTeamMaxPlayers(team: DOTATeam_t, maxPlayers: number): void;
    /**
     * Sets the victory message.
     */
    SetCustomVictoryMessage(message: string): void;
    /**
     * Sets the victory message duration.
     */
    SetCustomVictoryMessageDuration(duration: number): void;
    /**
     * Event-only ( table hMetadataTable )
     */
    SetEventMetadataCustomTable(arg1: table): boolean;
    /**
     * Event-only ( table hMetadataTable )
     */
    SetEventSignoutCustomTable(arg1: table): boolean;
    /**
     * Sets whether First Blood has been triggered.
     */
    SetFirstBloodActive(active: boolean): void;
    /**
     * Makes the specified team win
     */
    SetGameWinner(team: DOTATeam_t): void;
    /**
     * Set the auto gold increase per timed interval.
     */
    SetGoldPerTick(amount: number): void;
    /**
     * Set the time interval between auto gold increases.
     */
    SetGoldTickTime(time: number): void;
    /**
     * (flMinimapHeroIconScale) - Scale the hero minimap icons on the minimap.
     */
    SetHeroMinimapIconScale(scale: number): void;
    /**
     * Control if the normal DOTA hero respawn rules apply.
     */
    SetHeroRespawnEnabled(enabled: boolean): void;
    /**
     * Sets the amount of time players have to pick their hero.
     */
    SetHeroSelectionTime(selectionTime: number): void;
    /**
     * Sets whether the multikill, streak, and first-blood banners appear at the top of the screen.
     */
    SetHideKillMessageHeaders(hideHeaders: boolean): void;
    /**
     * Show this unit's health on the overlay health bar
     */
    SetOverlayHealthBarUnit(unit: CDOTA_BaseNPC, style: number): void;
    /**
     * Sets the amount of time players have between the game ending and the server disconnecting them.
     */
    SetPostGameTime(time: number): void;
    /**
     * Sets the amount of time players have between picking their hero and game start.
     */
    SetPreGameTime(time: number): void;
    /**
     * (flMinimapRuneIconScale) - Scale the rune icons on the minimap.
     */
    SetRuneMinimapIconScale(flMinimapRuneIconScale: number): void;
    /**
     * Sets the amount of time between rune spawns.
     */
    SetRuneSpawnTime(time: number): void;
    /**
     * (bSafeToLeave) - Mark this game as safe to leave.
     */
    SetSafeToLeave(bSafeToLeave: boolean): void;
    /**
     * When true, players can repeatedly pick the same hero.
     */
    SetSameHeroSelectionEnabled(enabled: boolean): void;
    /**
     * Sets the amount of time players have between the strategy phase and entering the pre-game phase.
     */
    SetShowcaseTime(time: number): void;
    /**
     * Set the starting gold amount.
     */
    SetStartingGold(amount: number): void;
    /**
     * Sets the amount of time players have between the hero selection and entering the showcase phase.
     */
    SetStrategyTime(time: number): void;
    /**
     * Set the time of day.
     */
    SetTimeOfDay(time: number): void;
    /**
     * Sets the tree regrow time in seconds.
     */
    SetTreeRegrowTime(time: number): void;
    /**
     * Heroes will use the basic NPC functionality for determining their bounty, rather than DOTA specific formulas.
     */
    SetUseBaseGoldBountyOnHeroes(useBaseGoldBounties: boolean): void;
    /**
     * Allows heroes in the map to give a specific amount of XP (this value must be set).
     */
    SetUseCustomHeroXPValues(useCustomXPValues: boolean): void;
    /**
     * When true, all items are available at as long as any shop is in range.
     */
    SetUseUniversalShopMode(useUniversalShopMode: boolean): void;
    /**
     * Get the current Gamerules state
     */
    State_Get(): DOTA_GameState;
}
declare var GameRules: CDOTAGamerules;
/**
 * dota_player
 */
interface CDOTAPlayer extends CBaseAnimating {
    /**
     * Get the player's hero.
     */
    GetAssignedHero(): CDOTA_BaseNPC_Hero;
    /**
     * Get the player's official PlayerID; notably is -1 when the player isn't yet on a team.
     */
    GetPlayerID(): number;
    /**
     * Randoms this player's hero.
     */
    MakeRandomHeroSelection(): void;
    /**
     * Set the kill cam unit for this hero.
     */
    SetKillCamUnit(hEntity: CDOTA_BaseNPC): void;
    /**
     * (nMusicStatus, flIntensity) - Set the music status for this player, note this will only really apply if dota_music_battle_enable is off.
     */
    SetMusicStatus(nMusicStatus: number, flIntensity: number): void;
}
/**
 * !DOTA Tutorial
 */
interface CDOTATutorial {
    /**
     * Add a computer controlled bot.
     */
    AddBot(heroName: string, unknown1: string, unknown2: string, unknown3: boolean): boolean;
    /**
     * Add a quest to the quest log
     */
    AddQuest(arg1: string, arg2: number, arg3: string, arg4: string): void;
    /**
     * Add an item to the shop whitelist.
     */
    AddShopWhitelistItem(itemName: string): void;
    /**
     * Complete a quest,
     */
    CompleteQuest(arg1: string): void;
    /**
     * Add a task to move to a specific location
     */
    CreateLocationTask(arg1: Vector): void;
    /**
     * Alert the player when a creep becomes agro to their hero.
     */
    EnableCreepAggroViz(arg1: boolean): void;
    /**
     * Enable the tip to alert players how to find their hero.
     */
    EnablePlayerOffscreenTip(arg1: boolean): void;
    /**
     * Alert the player when a tower becomes agro to their hero.
     */
    EnableTowerAggroViz(arg1: boolean): void;
    /**
     * End the tutorial.
     */
    FinishTutorial(): void;
    /**
     * Force the start of the game.
     */
    ForceGameStart(): void;
    /**
     * Is our time frozen?
     */
    GetTimeFrozen(): boolean;
    /**
     * Is this item currently in the white list.
     */
    IsItemInWhiteList(itemName: string): boolean;
    /**
     * Remove an item from the shop whitelist.
     */
    RemoveShopWhitelistItem(itemName: string): void;
    /**
     * Select a hero for the local player
     */
    SelectHero(heroName: string): void;
    /**
     * Select the team for the local player
     */
    SelectPlayerTeam(arg1: string): void;
    /**
     * Set the current item guide.
     */
    SetItemGuide(arg1: string): void;
    /**
     * Set gold amount for the tutorial player. (int) GoldAmount, (bool) true=Set, false=Modify
     */
    SetOrModifyPlayerGold(goldAmount: number, setNotModify: boolean): void;
    /**
     * Set players quick buy item.
     */
    SetQuickBuy(itemName: string): void;
    /**
     * Set the shop open or closed.
     */
    SetShopOpen(open: boolean): void;
    /**
     * Set if we should freeze time or not.
     */
    SetTimeFrozen(timeFrozen: boolean): void;
    /**
     * Set a tutorial convar
     */
    SetTutorialConvar(arg1: string, arg2: string): void;
    /**
     * Set the UI to use a reduced version to focus attention to specific elements.
     */
    SetTutorialUI(arg1: number): void;
    /**
     * Set if we should whitelist shop items.
     */
    SetWhiteListEnabled(whitelistEnabled: boolean): void;
    /**
     * Initialize Tutorial Mode
     */
    StartTutorialMode(): void;
    /**
     * Upgrade a specific ability for the local hero
     */
    UpgradePlayerAbility(abilityName: string): void;
}
/**
 * !DOTA Vote System
 */
interface CDOTAVoteSystem {
    /**
     * Starts a vote, based upon a table of parameters
     */
    StartVote(arg1: table): void;
}
/**
 * A Dota NPC Unit
 */
interface CDOTA_Ability_Animation_Attack extends CDOTABaseAbility {
    /**
     * Override playbackrate
     */
    SetPlaybackRate(flRate: number): void;
}
/**
 * A Dota NPC Unit.
 */
interface CDOTA_Ability_Animation_TailSpin extends CDOTABaseAbility {
    /**
     * Override playbackrate
     */
    SetPlaybackRate(flRate: number): void;
}
/**
 * A data driven ability.
 */
interface CDOTA_Ability_DataDriven extends CDOTABaseAbility {
    /**
     * Applies a data driven modifier to the target
     */
    ApplyDataDrivenModifier(caster: CDOTA_BaseNPC, target: CDOTA_BaseNPC, modifier_name: string, modifier_table: table): CDOTA_Buff;
    /**
     * Applies a data driven thinker at the location
     */
    ApplyDataDrivenThinker(hCaster: table, vLocation: Vector, pszModifierName: string, hModifierTable: table): table;
}
/**
 * A lua-based ability.
 */
interface CDOTA_Ability_Lua extends CDOTABaseAbility {
    /**
     * Determine whether an issued command with no target is valid.
     */
    CastFilterResult(): UnitFilterResult;
    /**
     * (Vector vLocation) Determine whether an issued command on a location is valid.
     */
    CastFilterResultLocation(vLocation: Vector): UnitFilterResult;
    /**
     * (HSCRIPT hTarget) Determine whether an issued command on a target is valid.
     */
    CastFilterResultTarget(hTarget: CDOTA_BaseNPC): UnitFilterResult;
    /**
     * Returns abilities that are stolen simultaneously, or otherwise related in functionality.
     */
    GetAssociatedPrimaryAbilities(): string;
    /**
     * Returns other abilities that are stolen simultaneously, or otherwise related in functionality.  Generally hidden abilities.
     */
    GetAssociatedSecondaryAbilities(): string;
    /**
     * Return cast behavior type of this ability.
     */
    GetBehavior(): DOTA_ABILITY_BEHAVIOR;
    /**
     * Return casting animation of this ability.
     */
    GetCastAnimation(): GameActivity_t;
    /**
     * Return cast point of this ability.
     */
    GetCastPoint(): number;
    /**
     * Return cast range of this ability.
     */
    GetCastRange(vLocation: Vector, hTarget: CDOTA_BaseNPC): number;
    /**
     * Return channel animation of this ability.
     */
    GetChannelAnimation(): GameActivity_t;
    /**
     * Return the channel time of this ability.
     */
    GetChannelTime(): number;
    /**
     * Return mana cost at the given level per second while channeling (-1 is current).
     */
    GetChannelledManaCostPerSecond(iLevel: number): number;
    /**
     * Return who hears speech when this spell is cast.
     */
    GetConceptRecipientType(): number;
    /**
     * Return cooldown of this ability.
     */
    GetCooldown(iLevel: number): number;
    /**
     * Return the error string of a failed command with no target.
     */
    GetCustomCastError(): string;
    /**
     * (Vector vLocation) Return the error string of a failed command on a location.
     */
    GetCustomCastErrorLocation(vLocation: Vector): string;
    /**
     * (HSCRIPT hTarget) Return the error string of a failed command on a target.
     */
    GetCustomCastErrorTarget(hTarget: CDOTA_BaseNPC): string;
    /**
     * Return gold cost at the given level (-1 is current).
     */
    GetGoldCost(iLevel: number): number;
    /**
     * Returns the name of the modifier applied passively by this ability.
     */
    GetIntrinsicModifierName(): string;
    /**
     * Return mana cost at the given level (-1 is current).
     */
    GetManaCost(iLevel: number): number;
    /**
     * Return the animation rate of the cast animation.
     */
    GetPlaybackRateOverride(): number;
    /**
     * Returns true if this ability can be used when not on the action panel.
     */
    IsHiddenAbilityCastable(): boolean;
    /**
     * Returns true if this ability is hidden when stolen by Spell Steal.
     */
    IsHiddenWhenStolen(): boolean;
    /**
     * Returns true if this ability is refreshed by Refresher Orb.
     */
    IsRefreshable(): boolean;
    /**
     * Returns true if this ability can be stolen by Spell Steal.
     */
    IsStealable(): boolean;
    /**
     * Cast time did not complete successfully.
     */
    OnAbilityPhaseInterrupted(): void;
    /**
     * Cast time begins (return true for successful cast).
     */
    OnAbilityPhaseStart(): boolean;
    /**
     * (bool bInterrupted) Channel finished.
     */
    OnChannelFinish(bInterrupted: boolean): void;
    /**
     * (float flInterval) Channeling is taking place.
     */
    OnChannelThink(flInterval: number): void;
    /**
     * Caster (hero only) gained a level, skilled an ability, or received a new stat bonus.
     */
    OnHeroCalculateStatBonus(): void;
    /**
     * A hero has died in the vicinity (ie Urn), takes table of params.
     */
    OnHeroDiedNearby(unit: CDOTA_BaseNPC, attacker: CDOTA_BaseNPC, event: table): void;
    /**
     * Caster gained a level.
     */
    OnHeroLevelUp(): void;
    /**
     * Caster inventory changed.
     */
    OnInventoryContentsChanged(): void;
    /**
     * ( HSCRIPT hItem ) Caster equipped item.
     */
    OnItemEquipped(hItem: CDOTA_Item): void;
    /**
     * Caster died.
     */
    OnOwnerDied(): void;
    /**
     * Caster respawned or spawned for the first time.
     */
    OnOwnerSpawned(): void;
    /**
     * (HSCRIPT hTarget, Vector vLocation) Projectile has collided with a given target or reached its destination (target is invalid).
     */
    OnProjectileHit(hTarget: CDOTA_BaseNPC, vLocation: Vector): boolean;
    /**
     * (HSCRIPT hTarget, Vector vLocation, int nHandle) Projectile has collided with a given target or reached its destination (target is invalid).
     */
    OnProjectileHitHandle(hTarget: CDOTA_BaseNPC, vLocation: Vector, iProjectileHandle: ProjectileID): boolean;
    /**
     * (HSCRIPT hTarget, Vector vLocation, table kv) Projectile has collided with a given target or reached its destination (target is invalid).
     */
    OnProjectileHit_ExtraData(hTarget: CDOTA_BaseNPC, vLocation: Vector, data: table): boolean;
    /**
     * (Vector vLocation) Projectile is actively moving.
     */
    OnProjectileThink(vLocation: Vector): void;
    /**
     * (int nProjectileHandle) Projectile is actively moving.
     */
    OnProjectileThinkHandle(iProjectileHandle: ProjectileID): void;
    /**
     * (Vector vLocation, table kv ) Projectile is actively moving.
     */
    OnProjectileThink_ExtraData(vLocation: Vector, data: table): void;
    /**
     * Cast time finished, spell effects begin.
     */
    OnSpellStart(): void;
    /**
     * ( HSCRIPT hAbility ) Special behavior when stolen by Spell Steal.
     */
    OnStolen(hSourceAbility: CDOTABaseAbility): void;
    /**
     * Ability is toggled on/off.
     */
    OnToggle(): void;
    /**
     * Special behavior when lost by Spell Steal.
     */
    OnUnStolen(): void;
    /**
     * Ability gained a level.
     */
    OnUpgrade(): void;
    /**
     * Returns true if this ability will generate magic stick charges for nearby enemies.
     */
    ProcsMagicStick(): boolean;
    /**
     * Return the type of speech used.
     */
    SpeakTrigger(): number;
}
/**
 * A Dota NPC Unit
 */
interface CDOTA_Ability_Nian_Dive extends CDOTABaseAbility {
    /**
     * Override playbackrate
     */
    SetPlaybackRate(flRate: number): void;
}
/**
 * A Dota NPC Unit
 */
interface CDOTA_Ability_Nian_Leap extends CDOTABaseAbility {
    /**
     * Override playbackrate
     */
    SetPlaybackRate(flRate: number): void;
}
/**
 * Nian's roar ability
 */
interface CDOTA_Ability_Nian_Roar extends CDOTABaseAbility {
    /**
     * Number of times Nian has used the roar
     */
    GetCastCount(): number;
}
/**
 * A Dota NPC Unit
 */
interface CDOTA_BaseNPC extends CBaseFlex {
    /**
     * Add an ability to this unit by name.
     */
    AddAbility(ability_name: string): CDOTABaseAbility;
    /**
     * Add an item to this unit's inventory.
     */
    AddItem(item_to_add: CDOTA_Item): CDOTA_Item;
    /**
     * Add an item to this unit's inventory.
     */
    AddItemByName(item_name: string): CDOTA_Item;
    /**
     * Add a modifier to this unit.
     */
    AddNewModifier(caster: CDOTA_BaseNPC | null | undefined, source_ability: CDOTABaseAbility | null | undefined, modifier_name: string, modifier_table: table): CDOTA_Buff;
    /**
     * Adds the no draw flag.
     */
    AddNoDraw(): void;
    /**
     * Add a speech bubble(1-4 live at a time) to this NPC.
     */
    AddSpeechBubble(iBubble: number, pszSpeech: string, flDuration: number, unOffsetX: number, unOffsetY: number): void;
    AlertNearbyUnits(hAttacker: CDOTA_BaseNPC, hAbility: CDOTABaseAbility): void;
    AngerNearbyUnits(): void;
    AttackNoEarlierThan(flTime: number): void;
    AttackReady(): boolean;
    BoundingRadius2D(): number;
    /**
     * Check FoW to see if an entity is visible.
     */
    CanEntityBeSeenByMyTeam(hEntity: CDOTA_BaseNPC): boolean;
    /**
     * Query if this unit can sell items.
     */
    CanSellItems(): boolean;
    /**
     * Cast an ability immediately.
     */
    CastAbilityImmediately(hAbility: CDOTABaseAbility, iPlayerIndex: number): void;
    /**
     * Cast an ability with no target.
     */
    CastAbilityNoTarget(hAbility: CDOTABaseAbility, iPlayerIndex: number): void;
    /**
     * Cast an ability on a position.
     */
    CastAbilityOnPosition(vPosition: Vector, hAbility: CDOTABaseAbility, iPlayerIndex: number): void;
    /**
     * Cast an ability on a target entity.
     */
    CastAbilityOnTarget(hTarget: CDOTA_BaseNPC, hAbility: CDOTABaseAbility, iPlayerIndex: number): void;
    /**
     * Toggle an ability.
     */
    CastAbilityToggle(hAbility: CDOTABaseAbility, iPlayerIndex: number): void;
    DestroyAllSpeechBubbles(): void;
    /**
     * Disassemble the passed item in this unit's inventory.
     */
    DisassembleItem(hItem: CDOTA_Item): void;
    /**
     * Drop an item at a given point.
     */
    DropItemAtPosition(vDest: Vector, hItem: CDOTA_Item): void;
    /**
     * Immediately drop a carried item at a given position.
     */
    DropItemAtPositionImmediate(hItem: CDOTA_Item, vPosition: Vector): void;
    /**
     * Drops the selected item out of this unit's stash.
     */
    EjectItemFromStash(hItem: CDOTA_Item): void;
    /**
     * This unit will be set to face the target point.
     */
    FaceTowards(vTarget: Vector): void;
    /**
     * Fade and remove the given gesture activity.
     */
    FadeGesture(nActivity: GameActivity_t): void;
    /**
     * Retrieve an ability by name from the unit.
     */
    FindAbilityByName(ability_name: string): CDOTABaseAbility;
    /**
     * Returns a table of all of the modifiers on the NPC.
     */
    FindAllModifiers(): CDOTA_Buff[];
    /**
     * Returns a table of all of the modifiers on the NPC with the passed name (modifierName)
     */
    FindAllModifiersByName(name: string): CDOTA_Buff[];
    /**
     * Get handle to first item in inventory, else nil.
     */
    FindItemInInventory(item_name: string): CDOTA_Item;
    /**
     * Return a handle to the modifier of the given name if found, else nil (string Name )
     */
    FindModifierByName(modifier_name: string): CDOTA_Buff;
    /**
     * Return a handle to the modifier of the given name from the passed caster if found, else nil ( string Name, hCaster )
     */
    FindModifierByNameAndCaster(modifier_name: string, caster: CDOTA_BaseNPC): CDOTA_Buff;
    /**
     * Kill this unit immediately.
     */
    ForceKill(bReincarnate: boolean): void;
    /**
     * Play an activity once, and then go back to idle.
     */
    ForcePlayActivityOnce(nActivity: GameActivity_t): void;
    /**
     * Retrieve an ability by index from the unit.
     */
    GetAbilityByIndex(ability_index: number): CDOTABaseAbility;
    GetAbilityCount(): number;
    /**
     * Gets the range at which this unit will auto-acquire.
     */
    GetAcquisitionRange(): number;
    /**
     * Combat involving this creature will have this weight added to the music calcuations.
     */
    GetAdditionalBattleMusicWeight(): number;
    /**
     * Returns this unit's aggro target.
     */
    GetAggroTarget(): CDOTA_BaseNPC;
    GetAttackAnimationPoint(): number;
    GetAttackCapability(): DOTAUnitAttackCapability_t;
    /**
     * Returns a random integer between the minimum and maximum base damage of the unit.
     */
    GetAttackDamage(): number;
    /**
     * Gets this unit's attack range after all modifiers.
     */
    GetAttackRange(): number;
    /**
     * Gets the attack range buffer.
     */
    GetAttackRangeBuffer(): number;
    GetAttackSpeed(): number;
    GetAttackTarget(): CDOTA_BaseNPC;
    GetAttacksPerSecond(): number;
    /**
     * Returns the average value of the minimum and maximum damage values.
     */
    GetAverageTrueAttackDamage(hTarget: CDOTA_BaseNPC): number;
    GetBaseAttackTime(): number;
    /**
     * Get the maximum attack damage of this unit.
     */
    GetBaseDamageMax(): number;
    /**
     * Get the minimum attack damage of this unit.
     */
    GetBaseDamageMin(): number;
    /**
     * Returns the vision range before modifiers.
     */
    GetBaseDayTimeVisionRange(): number;
    GetBaseHealthRegen(): number;
    /**
     * Returns base magical armor value.
     */
    GetBaseMagicalResistanceValue(): number;
    /**
     * Gets the base max health value.
     */
    GetBaseMaxHealth(): number;
    GetBaseMoveSpeed(): number;
    /**
     * Returns the vision range after modifiers.
     */
    GetBaseNightTimeVisionRange(): number;
    /**
     * This Mana regen is derived from constant bonuses like Basilius.
     */
    GetBonusManaRegen(): number;
    GetCastPoint(bAttack: boolean): number;
    /**
     * Get clone source (Meepo Prime, if this is a Meepo)
     */
    GetCloneSource(): CDOTA_BaseNPC;
    /**
     * Returns the size of the collision padding around the hull.
     */
    GetCollisionPadding(): number;
    GetCreationTime(): number;
    /**
     * Get the ability this unit is currently casting.
     */
    GetCurrentActiveAbility(): CDOTABaseAbility;
    /**
     * Gets the current vision range.
     */
    GetCurrentVisionRange(): number;
    GetCursorCastTarget(): CDOTA_BaseNPC;
    GetCursorPosition(): Vector;
    GetCursorTargetingNothing(): boolean;
    /**
     * Returns the vision range after modifiers.
     */
    GetDayTimeVisionRange(): number;
    /**
     * Get the XP bounty on this unit.
     */
    GetDeathXP(): number;
    GetForceAttackTarget(): CDOTA_BaseNPC;
    /**
     * Get the gold bounty on this unit.
     */
    GetGoldBounty(): number;
    GetHasteFactor(): number;
    /**
     * Returns integer amount of health missing from max.
     */
    GetHealthDeficit(): number;
    /**
     * Get the current health percent of the unit.
     */
    GetHealthPercent(): number;
    GetHealthRegen(): number;
    /**
     * Get the collision hull radius of this NPC.
     */
    GetHullRadius(): number;
    /**
     * Returns speed after all modifiers.
     */
    GetIdealSpeed(): number;
    /**
     * Returns speed after all modifiers, but excluding those that reduce speed.
     */
    GetIdealSpeedNoSlows(): number;
    GetIncreasedAttackSpeed(): number;
    /**
     * Returns the initial waypoint goal for this NPC.
     */
    GetInitialGoalEntity(): CBaseEntity;
    /**
     * Returns nth item in inventory slot (index is zero based).
     */
    GetItemInSlot(slot: number): CDOTA_Item;
    GetLastAttackTime(): number;
    /**
     * Get the last game time that this unit switched to/from idle state.
     */
    GetLastIdleChangeTime(): number;
    /**
     * Returns the level of this unit.
     */
    GetLevel(): number;
    /**
     * Returns current magical armor value.
     */
    GetMagicalArmorValue(): number;
    /**
     * Returns the player ID of the controlling player.
     */
    GetMainControllingPlayer(): number;
    /**
     * Get the mana on this unit.
     */
    GetMana(): number;
    /**
     * Get the percent of mana remaining.
     */
    GetManaPercent(): number;
    GetManaRegen(): number;
    /**
     * Returns mana regen rate per intelligence.
     */
    GetManaRegenMultiplier(): number;
    /**
     * Get the maximum mana of this unit.
     */
    GetMaxMana(): number;
    /**
     * Get the maximum gold bounty for this unit.
     */
    GetMaximumGoldBounty(): number;
    /**
     * Get the minimum gold bounty for this unit.
     */
    GetMinimumGoldBounty(): number;
    GetModelRadius(): number;
    /**
     * How many modifiers does this unit have?
     */
    GetModifierCount(): number;
    /**
     * Get a modifier name by index.
     */
    GetModifierNameByIndex(nIndex: number): string;
    /**
     * Gets the stack count of a given modifier.
     */
    GetModifierStackCount(modifierName: string, hCaster: CDOTA_BaseNPC): number;
    GetMoveSpeedModifier(flBaseSpeed: number): number;
    /**
     * Set whether this NPC is required to reach each goal entity, rather than being allowed to unkink their path.
     */
    GetMustReachEachGoalEntity(): boolean;
    /**
     * If set to true, we will never attempt to move this unit to clear space, even when it unphases.
     */
    GetNeverMoveToClearSpace(): boolean;
    /**
     * Returns the vision range after modifiers.
     */
    GetNightTimeVisionRange(): number;
    GetOpposingTeamNumber(): DOTATeam_t;
    /**
     * Get the collision hull radius (including padding) of this NPC.
     */
    GetPaddedCollisionRadius(): number;
    /**
     * Returns base physical armor value.
     */
    GetPhysicalArmorBaseValue(): number;
    /**
     * Returns current physical armor value.
     */
    GetPhysicalArmorValue(): number;
    /**
     * Returns the player that owns this unit.
     */
    GetPlayerOwner(): CDOTAPlayer;
    /**
     * Get the owner player ID for this unit.
     */
    GetPlayerOwnerID(): PlayerID;
    GetProjectileSpeed(): number;
    GetRangeToUnit(hNPC: CDOTA_BaseNPC): number;
    GetRangedProjectileName(): string;
    GetSecondsPerAttack(): number;
    /**
     * Get how much gold has been spent on ability upgrades.
     */
    GetTotalPurchasedUpgradeGoldCost(): number;
    GetUnitLabel(): string;
    /**
     * Get the name of this unit.
     */
    GetUnitName(): string;
    /**
     * Give mana to this unit, this can be used for mana gained by abilities or item usage.
     */
    GiveMana(flMana: number): void;
    /**
     * See whether this unit has an ability by name.
     */
    HasAbility(pszAbilityName: string): boolean;
    HasAnyActiveAbilities(): boolean;
    HasAttackCapability(): boolean;
    HasFlyMovementCapability(): boolean;
    HasFlyingVision(): boolean;
    HasGroundMovementCapability(): boolean;
    /**
     * Does this unit have an inventory.
     */
    HasInventory(): boolean;
    /**
     * See whether this unit has an item by name.
     */
    HasItemInInventory(pItemName: string): boolean;
    /**
     * Sees if this unit has a given modifier.
     */
    HasModifier(pszScriptName: string): boolean;
    HasMovementCapability(): boolean;
    HasScepter(): boolean;
    /**
     * Heal this unit.
     */
    Heal(flAmount: number, hInflictor: CDOTA_BaseNPC): void;
    /**
     * Hold position.
     */
    Hold(): void;
    Interrupt(): void;
    InterruptChannel(): void;
    InterruptMotionControllers(bFindClearSpace: boolean): void;
    /**
     * Is this unit alive?
     */
    IsAlive(): boolean;
    /**
     * Is this unit an Ancient?
     */
    IsAncient(): boolean;
    IsAttackImmune(): boolean;
    IsAttacking(): boolean;
    IsAttackingEntity(hEntity: CDOTA_BaseNPC): boolean;
    /**
     * Is this unit a Barracks?
     */
    IsBarracks(): boolean;
    IsBlind(): boolean;
    IsBlockDisabled(): boolean;
    /**
     * Is this unit a boss?
     */
    IsBoss(): boolean;
    /**
     * Is this unit a building?
     */
    IsBuilding(): boolean;
    /**
     * Is this unit currently channeling a spell?
     */
    IsChanneling(): boolean;
    /**
     * Is this unit a clone? (Meepo)
     */
    IsClone(): boolean;
    IsCommandRestricted(): boolean;
    /**
     * Is this unit a considered a hero for targeting purposes?
     */
    IsConsideredHero(): boolean;
    /**
     * Is this unit controlled by any non-bot player?
     */
    IsControllableByAnyPlayer(): boolean;
    /**
     * Is this unit a courier?
     */
    IsCourier(): boolean;
    /**
     * Is this a Creature type NPC?
     */
    IsCreature(): boolean;
    /**
     * Is this unit a creep?
     */
    IsCreep(): boolean;
    IsDeniable(): boolean;
    IsDisarmed(): boolean;
    IsDominated(): boolean;
    IsEvadeDisabled(): boolean;
    /**
     * Is this unit an Ancient?
     */
    IsFort(): boolean;
    IsFrozen(): boolean;
    /**
     * Is this a hero or hero illusion?
     */
    IsHero(): boolean;
    IsHexed(): boolean;
    /**
     * Is this creature currently idle?
     */
    IsIdle(): boolean;
    IsIllusion(): boolean;
    IsInvisible(): boolean;
    IsInvulnerable(): boolean;
    IsLowAttackPriority(): boolean;
    IsMagicImmune(): boolean;
    IsMovementImpaired(): boolean;
    /**
     * Is this unit moving?
     */
    IsMoving(): boolean;
    IsMuted(): boolean;
    /**
     * Is this a neutral?
     */
    IsNeutralUnitType(): boolean;
    IsNightmared(): boolean;
    IsOpposingTeam(nTeam: DOTATeam_t): boolean;
    /**
     * Is this unit a ward-type unit?
     */
    IsOther(): boolean;
    IsOutOfGame(): boolean;
    /**
     * Is this unit owned by any non-bot player?
     */
    IsOwnedByAnyPlayer(): boolean;
    /**
     * Is this a phantom unit?
     */
    IsPhantom(): boolean;
    IsPhantomBlocker(): boolean;
    IsPhased(): boolean;
    IsPositionInRange(vPosition: Vector, flRange: number): boolean;
    /**
     * Is this unit a ranged attacker?
     */
    IsRangedAttacker(): boolean;
    /**
     * Is this a real hero?
     */
    IsRealHero(): boolean;
    IsRooted(): boolean;
    /**
     * Is this a shrine?
     */
    IsShrine(): boolean;
    IsSilenced(): boolean;
    IsSpeciallyDeniable(): boolean;
    IsStunned(): boolean;
    /**
     * Is this unit summoned?
     */
    IsSummoned(): boolean;
    IsTempestDouble(): boolean;
    /**
     * Is this a tower?
     */
    IsTower(): boolean;
    IsUnableToMiss(): boolean;
    IsUnselectable(): boolean;
    IsUntargetable(): boolean;
    /**
     * Kills this NPC, with the params Ability and Attacker.
     */
    Kill(hAbility?: CDOTABaseAbility, hAttacker?: CDOTA_BaseNPC): void;
    MakeIllusion(): void;
    MakePhantomBlocker(): void;
    MakeVisibleDueToAttack(iTeam: DOTATeam_t): void;
    MakeVisibleToTeam(iTeam: DOTATeam_t, flDuration: number): void;
    ManageModelChanges(): void;
    /**
     * Sets the health to a specific value, with optional flags or inflictors.
     */
    ModifyHealth(iDesiredHealthValue: number, hAbility: CDOTABaseAbility, bLethal: boolean, iAdditionalFlags: number): void;
    /**
     * Move to follow a unit.
     */
    MoveToNPC(hNPC: CDOTA_BaseNPC): void;
    /**
     * Give an item to another unit.
     */
    MoveToNPCToGiveItem(hNPC: CDOTA_BaseNPC, hItem: CDOTA_Item): void;
    /**
     * Issue a Move-To command.
     */
    MoveToPosition(vDest: Vector): void;
    /**
     * Issue an Attack-Move-To command.
     */
    MoveToPositionAggressive(vDest: Vector): void;
    /**
     * Move to a target to attack.
     */
    MoveToTargetToAttack(hTarget: CDOTA_BaseNPC): void;
    NoHealthBar(): boolean;
    NoTeamMoveTo(): boolean;
    NoTeamSelect(): boolean;
    NoUnitCollision(): boolean;
    NotOnMinimap(): boolean;
    NotOnMinimapForEnemies(): boolean;
    NotifyWearablesOfModelChange(bOriginalModel: boolean): void;
    PassivesDisabled(): boolean;
    /**
     * Issue a Patrol-To command.
     */
    PatrolToPosition(vDest: Vector): void;
    /**
     * Performs an attack on a target.
     */
    PerformAttack(hTarget: CDOTA_BaseNPC, bUseCastAttackOrb: boolean, bProcessProcs: boolean, bSkipCooldown: boolean, bIgnoreInvis: boolean, bUseProjectile: boolean, bFakeAttack: boolean, bNeverMiss: boolean): void;
    /**
     * Pick up a dropped item.
     */
    PickupDroppedItem(hItem: CDOTA_Item): void;
    /**
     * Pick up a rune.
     */
    PickupRune(hItem: CDOTA_Item): void;
    /**
     * Play a VCD on the NPC.
     */
    PlayVCD(pVCD: string): void;
    ProvidesVision(): boolean;
    /**
     * (bool RemovePositiveBuffs, bool RemoveDebuffs, bool BuffsCreatedThisFrameOnly, bool RemoveStuns, bool RemoveExceptions
     */
    Purge(bRemovePositiveBuffs: boolean, bRemoveDebuffs: boolean, bFrameOnly: boolean, bRemoveStuns: boolean, bRemoveExceptions: boolean): void;
    /**
     * Remove mana from this unit, this can be used for involuntary mana loss, not for mana that is spent.
     */
    ReduceMana(flAmount: number): void;
    /**
     * Remove an ability from this unit by name.
     */
    RemoveAbility(pszAbilityName: string): void;
    /**
     * Remove the given gesture activity.
     */
    RemoveGesture(nActivity: GameActivity_t): void;
    RemoveHorizontalMotionController(hBuff: CDOTA_Buff): void;
    /**
     * Removes the passed item from this unit's inventory and deletes it.
     */
    RemoveItem(hItem: CDOTA_Item): void;
    /**
     * Removes a modifier.
     */
    RemoveModifierByName(pszScriptName: string): void;
    /**
     * Removes a modifier that was cast by the given caster.
     */
    RemoveModifierByNameAndCaster(pszScriptName: string, hCaster: CDOTA_BaseNPC): void;
    /**
     * Remove the no draw flag.
     */
    RemoveNoDraw(): void;
    RemoveVerticalMotionController(hBuff: CDOTA_Buff): void;
    /**
     * Respawns the target unit if it can be respawned.
     */
    RespawnUnit(): void;
    /**
     * Sells the passed item in this unit's inventory.
     */
    SellItem(hItem: CDOTA_Item): void;
    /**
     * Set the ability by index.
     */
    SetAbilityByIndex(hAbility: CDOTABaseAbility, iIndex: number): void;
    SetAcquisitionRange(nRange: number): void;
    /**
     * Combat involving this creature will have this weight added to the music calcuations.
     */
    SetAdditionalBattleMusicWeight(flWeight: number): void;
    /**
     * Set this unit's aggro target to a specified unit.
     */
    SetAggroTarget(hAggroTarget: CDOTA_BaseNPC): void;
    SetAttackCapability(iAttackCapabilities: DOTAUnitAttackCapability_t): void;
    SetAttacking(hAttackTarget: CDOTA_BaseNPC): void;
    SetBaseAttackTime(flBaseAttackTime: number): void;
    /**
     * Sets the maximum base damage.
     */
    SetBaseDamageMax(nMax: number): void;
    /**
     * Sets the minimum base damage.
     */
    SetBaseDamageMin(nMin: number): void;
    SetBaseHealthRegen(flHealthRegen: number): void;
    /**
     * Sets base magical armor value.
     */
    SetBaseMagicalResistanceValue(flMagicalResistanceValue: number): void;
    SetBaseManaRegen(flManaRegen: number): void;
    /**
     * Set a new base max health value.
     */
    SetBaseMaxHealth(flBaseMaxHealth: number): void;
    SetBaseMoveSpeed(iMoveSpeed: number): void;
    /**
     * Set whether or not this unit is allowed to sell items (bCanSellItems)
     */
    SetCanSellItems(bCanSell: boolean): void;
    /**
     * Set this unit controllable by the player with the passed ID.
     */
    SetControllableByPlayer(iIndex: number, bSkipAdjustingPosition: boolean): void;
    SetCursorCastTarget(hEntity: CDOTA_BaseNPC): void;
    SetCursorPosition(vLocation: Vector): void;
    SetCursorTargetingNothing(bTargetingNothing: boolean): void;
    SetCustomHealthLabel(pLabel: string, r: number, g: number, b: number): void;
    /**
     * Set the base vision range.
     */
    SetDayTimeVisionRange(iRange: number): void;
    /**
     * Set the XP bounty on this unit.
     */
    SetDeathXP(iXPBounty: number): void;
    SetForceAttackTarget(hNPC: CDOTA_BaseNPC): void;
    SetForceAttackTargetAlly(hNPC: table): void;
    /**
     * Set if this unit has an inventory.
     */
    SetHasInventory(bHasInventory: boolean): void;
    /**
     * Set the collision hull radius of this NPC.
     */
    SetHullRadius(flHullRadius: number): void;
    SetIdleAcquire(bIdleAcquire: boolean): void;
    /**
     * Sets the initial waypoint goal for this NPC.
     */
    SetInitialGoalEntity(hGoal: CBaseEntity): void;
    /**
     * Set the mana on this unit.
     */
    SetMana(flMana: number): void;
    /**
     * Set the maximum gold bounty for this unit.
     */
    SetMaximumGoldBounty(iGoldBountyMax: number): void;
    /**
     * Set the minimum gold bounty for this unit.
     */
    SetMinimumGoldBounty(iGoldBountyMin: number): void;
    /**
     * Sets the stack count of a given modifier.
     */
    SetModifierStackCount(pszScriptName: string, hCaster: CDOTA_BaseNPC, nStackCount: number): void;
    SetMoveCapability(iMoveCapabilities: DOTAUnitMoveCapability_t): void;
    /**
     * Set whether this NPC is required to reach each goal entity, rather than being allowed to unkink their path.
     */
    SetMustReachEachGoalEntity(must: boolean): void;
    /**
     * If set to true, we will never attempt to move this unit to clear space, even when it unphases.
     */
    SetNeverMoveToClearSpace(neverMoveToClearSpace: boolean): void;
    /**
     * Returns the vision range after modifiers.
     */
    SetNightTimeVisionRange(iRange: number): void;
    /**
     * Set the unit's origin.
     */
    SetOrigin(vLocation: Vector): void;
    /**
     * Sets the original model of this entity, which it will tend to fall back to anytime its state changes.
     */
    SetOriginalModel(pszModelName: string): void;
    /**
     * Sets base physical armor value.
     */
    SetPhysicalArmorBaseValue(flPhysicalArmorValue: number): void;
    SetRangedProjectileName(pProjectileName: string): void;
    /**
     * sets the client side map reveal radius for this unit
     */
    SetRevealRadius(revealRadius: number): void;
    SetStolenScepter(bStolenScepter: boolean): void;
    SetUnitCanRespawn(bCanRespawn: boolean): void;
    SetUnitName(pName: string): void;
    ShouldIdleAcquire(): boolean;
    /**
     * Spend mana from this unit, this can be used for spending mana from abilities or item usage.
     */
    SpendMana(flManaSpent: number, hAbility: CDOTABaseAbility): void;
    /**
     * Add the given gesture activity.
     */
    StartGesture(nActivity: GameActivity_t): void;
    /**
     * Add the given gesture activity with a playback rate override.
     */
    StartGestureWithPlaybackRate(nActivity: GameActivity_t, flRate: number): void;
    /**
     * Stop the current order.
     */
    Stop(): void;
    StopFacing(): void;
    /**
     * Swaps the slots of the two passed abilities and sets them enabled/disabled.
     */
    SwapAbilities(pAbilityName1: string, pAbilityName2: string, bEnable1: boolean, bEnable2: boolean): void;
    /**
     * Swap the contents of two item slots (slot1, slot2)
     */
    SwapItems(nSlot1: number, nSlot2: number): void;
    /**
     * Removed the passed item from this unit's inventory.
     */
    TakeItem(hItem: CDOTA_Item): table;
    TimeUntilNextAttack(): number;
    TriggerModifierDodge(): boolean;
    TriggerSpellAbsorb(hAbility: CDOTABaseAbility): boolean;
    /**
     * Trigger the Lotus Orb-like effect.(hAbility)
     */
    TriggerSpellReflect(hAbility: CDOTABaseAbility): void;
    /**
     * Makes the first ability unhidden, and puts it where second ability currently is. Will do nothing if the first ability is already unhidden and in a valid slot.
     */
    UnHideAbilityToSlot(pszAbilityName: string, pszReplacedAbilityName: string): void;
    UnitCanRespawn(): boolean;
}
/**
 * A building.
 */
interface CDOTA_BaseNPC_Building extends CDOTA_BaseNPC {
    /**
     * Get the invulnerability count for a building.
     */
    GetInvulnCount(): number;
    /**
     * Set the invulnerability counter of this building.
     */
    SetInvulnCount(nInvulnCount: number): void;
}
/**
 * A Dota NPC Unit
 */
interface CDOTA_BaseNPC_Creature extends CDOTA_BaseNPC {
    /**
     * Add the specified item drop to this creature.
     */
    AddItemDrop(hDropData: table): void;
    /**
     * Level the creature up by the specified number of levels
     */
    CreatureLevelUp(iLevels: number): void;
    /**
     * Is this unit a champion?
     */
    IsChampion(): boolean;
    /**
     * Remove all item drops from this creature.
     */
    RemoveAllItemDrops(): void;
    /**
     * Set the armor gained per level on this creature.
     */
    SetArmorGain(flArmorGain: number): void;
    /**
     * Set the attack time gained per level on this creature.
     */
    SetAttackTimeGain(flAttackTimeGain: number): void;
    /**
     * Set the bounty gold gained per level on this creature.
     */
    SetBountyGain(nBountyGain: number): void;
    /**
     * Flag this unit as a champion creature.
     */
    SetChampion(bIsChampion: boolean): void;
    /**
     * Set the damage gained per level on this creature.
     */
    SetDamageGain(nDamageGain: number): void;
    /**
     * Set the disable resistance gained per level on this creature.
     */
    SetDisableResistanceGain(flDisableResistanceGain: number): void;
    /**
     * Set the hit points gained per level on this creature.
     */
    SetHPGain(nHPGain: number): void;
    /**
     * Set the hit points regen gained per level on this creature.
     */
    SetHPRegenGain(flHPRegenGain: number): void;
    /**
     * Set the magic resistance gained per level on this creature.
     */
    SetMagicResistanceGain(flMagicResistanceGain: number): void;
    /**
     * Set the mana points gained per level on this creature.
     */
    SetManaGain(nManaGain: number): void;
    /**
     * Set the mana points regen gained per level on this creature.
     */
    SetManaRegenGain(flManaRegenGain: number): void;
    /**
     * Set the move speed gained per level on this creature.
     */
    SetMoveSpeedGain(nMoveSpeedGain: number): void;
    /**
     * Set the xp reward gained per level on this creature.
     */
    SetXPGain(nXPGain: number): void;
}
/**
 * A Dota Hero NPC
 */
interface CDOTA_BaseNPC_Hero extends CDOTA_BaseNPC {
    /**
     * Params: Float XP, Bool applyBotDifficultyScaling
     */
    AddExperience(flXP: number, nReason: EDOTA_ModifyXP_Reason, bApplyBotDifficultyScaling: boolean, bIncrementTotal: boolean): boolean;
    /**
     * Spend the gold and buyback with this hero.
     */
    Buyback(): void;
    /**
     * Recalculate all stats after the hero gains stats.
     */
    CalculateStatBonus(): void;
    /**
     * Returns boolean value result of buyback gold limit time less than game time.
     */
    CanEarnGold(): boolean;
    /**
     * Value is stored in PlayerResource.
     */
    ClearLastHitMultikill(): void;
    /**
     * Value is stored in PlayerResource.
     */
    ClearLastHitStreak(): void;
    /**
     * Value is stored in PlayerResource.
     */
    ClearStreak(): void;
    /**
     * Gets the current unspent ability points.
     */
    GetAbilityPoints(): number;
    GetAdditionalOwnedUnits(): CDOTA_BaseNPC[];
    GetAgility(): number;
    GetAgilityGain(): number;
    /**
     * Value is stored in PlayerResource.
     */
    GetAssists(): number;
    GetAttacker(nIndex: number): number;
    GetBaseAgility(): number;
    /**
     * Hero damage is also affected by attributes.
     */
    GetBaseDamageMax(): number;
    /**
     * Hero damage is also affected by attributes.
     */
    GetBaseDamageMin(): number;
    GetBaseIntellect(): number;
    /**
     * Returns the base mana regen.
     */
    GetBaseManaRegen(): number;
    GetBaseStrength(): number;
    GetBonusDamageFromPrimaryStat(): number;
    /**
     * Return float value for the amount of time left on cooldown for this hero's buyback.
     */
    GetBuybackCooldownTime(): number;
    /**
     * Return integer value for the gold cost of a buyback.
     */
    GetBuybackCost(): number;
    /**
     * Returns the amount of time gold gain is limited after buying back.
     */
    GetBuybackGoldLimitTime(): number;
    /**
     * Returns the amount of XP
     */
    GetCurrentXP(): number;
    GetDeathGoldCost(): number;
    /**
     * Value is stored in PlayerResource.
     */
    GetDeaths(): number;
    /**
     * Value is stored in PlayerResource.
     */
    GetDenies(): number;
    /**
     * Returns gold amount for the player owning this hero
     */
    GetGold(): number;
    GetGoldBounty(): number;
    /**
     * Hero attack speed is also affected by agility.
     */
    GetIncreasedAttackSpeed(): number;
    GetIntellect(): number;
    GetIntellectGain(): number;
    /**
     * Value is stored in PlayerResource.
     */
    GetKills(): number;
    /**
     * Value is stored in PlayerResource.
     */
    GetLastHits(): number;
    /**
     * Returns the intelligenced based mana regen multiplier.
     */
    GetManaRegenMultiplier(): number;
    GetMostRecentDamageTime(): number;
    GetMultipleKillCount(): number;
    GetNumAttackers(): number;
    GetNumItemsInInventory(): number;
    GetNumItemsInStash(): number;
    /**
     * Hero armor is affected by attributes.
     */
    GetPhysicalArmorBaseValue(): number;
    /**
     * Returns player ID of the player owning this hero
     */
    GetPlayerID(): PlayerID;
    /**
     * 0 = strength, 1 = agility, 2 = intelligence.
     */
    GetPrimaryAttribute(): Attributes;
    GetPrimaryStatValue(): number;
    GetRespawnTime(): number;
    /**
     * Is this hero prevented from respawning?
     */
    GetRespawnsDisabled(): boolean;
    /**
     * Value is stored in PlayerResource.
     */
    GetStreak(): number;
    GetStrength(): number;
    GetStrengthGain(): number;
    GetTimeUntilRespawn(): number;
    /**
     * Get wearable entity in slot (slot)
     */
    GetTogglableWearable(nSlotType: number): CBaseEntity;
    HasAnyAvailableInventorySpace(): boolean;
    HasFlyingVision(): boolean;
    HasOwnerAbandoned(): boolean;
    /**
     * Args: const char* pItemName, bool bIncludeStashCombines, bool bAllowSelling
     */
    HasRoomForItem(pItemName: string, bIncludeStashCombines: boolean, bAllowSelling: boolean): number;
    /**
     * Levels up the hero, true or false to play effects.
     */
    HeroLevelUp(bPlayEffects: boolean): void;
    /**
     * Value is stored in PlayerResource.
     */
    IncrementAssists(iKillerID: number): void;
    /**
     * Value is stored in PlayerResource.
     */
    IncrementDeaths(iKillerID: number): void;
    /**
     * Value is stored in PlayerResource.
     */
    IncrementDenies(): void;
    /**
     * Passed ID is for the victim, killer ID is ID of the current hero.  Value is stored in PlayerResource.
     */
    IncrementKills(iVictimID: number): void;
    /**
     * Value is stored in PlayerResource.
     */
    IncrementLastHitMultikill(): void;
    /**
     * Value is stored in PlayerResource.
     */
    IncrementLastHitStreak(): void;
    /**
     * Value is stored in PlayerResource.
     */
    IncrementLastHits(): void;
    /**
     * Value is stored in PlayerResource.
     */
    IncrementNearbyCreepDeaths(): void;
    /**
     * Value is stored in PlayerResource.
     */
    IncrementStreak(): void;
    IsBuybackDisabledByReapersScythe(): boolean;
    IsReincarnating(): boolean;
    IsStashEnabled(): boolean;
    /**
     * Args: Hero, Inflictor
     */
    KilledHero(hHero: CDOTA_BaseNPC_Hero, hInflictor: CDOTA_BaseNPC): void;
    /**
     * Adds passed value to base attribute value, then calls CalculateStatBonus.
     */
    ModifyAgility(flNewAgility: number): void;
    /**
     * Gives this hero some gold.  Args: int nGoldChange, bool bReliable, int reason
     */
    ModifyGold(iGoldChange: number, bReliable: boolean, iReason: number): number;
    /**
     * Adds passed value to base attribute value, then calls CalculateStatBonus.
     */
    ModifyIntellect(flNewIntellect: number): void;
    /**
     * Adds passed value to base attribute value, then calls CalculateStatBonus.
     */
    ModifyStrength(flNewStrength: number): void;
    PerformTaunt(): void;
    RecordLastHit(): void;
    /**
     * Respawn this hero.
     */
    RespawnHero(bBuyBack: boolean, bRespawnPenalty: boolean): void;
    /**
     * Sets the current unspent ability points.
     */
    SetAbilityPoints(iPoints: number): void;
    SetBaseAgility(flAgility: number): void;
    SetBaseIntellect(flIntellect: number): void;
    SetBaseStrength(flStrength: number): void;
    SetBotDifficulty(nDifficulty: number): void;
    SetBuyBackDisabledByReapersScythe(bBuybackDisabled: boolean): void;
    /**
     * Sets the buyback cooldown time.
     */
    SetBuybackCooldownTime(flTime: number): void;
    /**
     * Set the amount of time gold gain is limited after buying back.
     */
    SetBuybackGoldLimitTime(flTime: number): void;
    /**
     * Sets a custom experience value for this hero.  Note, GameRules boolean must be set for this to work!
     */
    SetCustomDeathXP(iValue: number): void;
    /**
     * Sets the gold amount for the player owning this hero
     */
    SetGold(iGold: number, bReliable: boolean): void;
    SetPlayerID(iPlayerID: number): void;
    /**
     * Set this hero's primary attribute value.
     */
    SetPrimaryAttribute(nPrimaryAttribute: Attributes): void;
    SetRespawnPosition(vOrigin: Vector): void;
    /**
     * Prevent this hero from respawning.
     */
    SetRespawnsDisabled(bDisableRespawns: boolean): void;
    SetStashEnabled(bEnabled: boolean): void;
    SetTimeUntilRespawn(time: number): void;
    ShouldDoFlyHeightVisual(): boolean;
    /**
     * Args: int nGold, int nReason
     */
    SpendGold(iCost: number, iReason: EDOTA_ModifyGold_Reason): void;
    UnitCanRespawn(): boolean;
    /**
     * This upgrades the passed ability if it exists and the hero has enough ability points.
     */
    UpgradeAbility(hAbility: CDOTABaseAbility): void;
    WillReincarnate(): boolean;
}
/**
 * A Dota NPC Trap Ward
 */
interface CDOTA_BaseNPC_Trap_Ward extends CDOTA_BaseNPC_Creature {
    /**
     * Get the trap target for this entity.
     */
    GetTrapTarget(): Vector;
    /**
     * Set the animation sequence for this entity.
     */
    SetAnimation(pAnimation: string): void;
}
/**
 * A modifier.
 */
interface CDOTA_Buff {
    /**
     * (index, bDestroyImmediately, bStatusEffect, priority, bHeroEffect, bOverheadEffect
     */
    AddParticle(i: number, bDestroyImmediately: boolean, bStatusEffect: boolean, iPriority: number, bHeroEffect: boolean, bOverheadEffect: boolean): void;
    /**
     * Decrease this modifier's stack count by 1.
     */
    DecrementStackCount(): void;
    /**
     * Run all associated destroy functions, then remove the modifier.
     */
    Destroy(): void;
    /**
     * Run all associated refresh functions on this modifier as if it was re-applied.
     */
    ForceRefresh(): void;
    /**
     * Get the ability that generated the modifier.
     */
    GetAbility(): CDOTABaseAbility;
    /**
     * Returns aura stickiness (default 0.5)
     */
    GetAuraDuration(): number;
    /**
     * Get the owner of the ability responsible for the modifier.
     */
    GetCaster(): CDOTA_BaseNPC;
    GetClass(): string;
    GetCreationTime(): number;
    GetDieTime(): number;
    GetDuration(): number;
    GetElapsedTime(): number;
    GetName(): string;
    /**
     * Get the unit the modifier is parented to.
     */
    GetParent(): CDOTA_BaseNPC;
    GetRemainingTime(): number;
    GetStackCount(): number;
    HasFunction(iFunction: number): boolean;
    /**
     * Increase this modifier's stack count by 1.
     */
    IncrementStackCount(): void;
    IsStunDebuff(): boolean;
    /**
     * (flTime, bInformClients)
     */
    SetDuration(flDuration: number, bInformClient: boolean): void;
    SetStackCount(iCount: number): void;
    /**
     * Start this modifier's think function (OnIntervalThink) with the given interval (float).  To stop, call with -1.
     */
    StartIntervalThink(flInterval: number): void;
}
/**
 * !Custom HUD manager
 */
interface CDOTA_CustomUIManager {
    /**
     * Create a new custom UI HUD element for the specified player(s). ( int PlayerID /*-1 means everyone* /, string ElementID /* should be unique * /, string LayoutFileName, table DialogVariables /* can be nil * / )
     */
    DynamicHud_Create(arg1: number, arg2: string, arg3: string, arg4: table): void;
    /**
     * Destroy a custom hud element ( int PlayerID /*-1 means everyone* /, string ElementID )
     */
    DynamicHud_Destroy(arg1: number, arg2: string): void;
    /**
     * Add or modify dialog variables for an existing custom hud element ( int PlayerID /*-1 means everyone* /, string ElementID, table DialogVariables )
     */
    DynamicHud_SetDialogVariables(arg1: number, arg2: string, arg3: table): void;
    /**
     * Toggle the visibility of an existing custom hud element ( int PlayerID /*-1 means everyone* /, string ElementID, bool Visible )
     */
    DynamicHud_SetVisible(arg1: number, arg2: string, arg3: boolean): void;
}
/**
 * A usable item.
 */
interface CDOTA_Item extends CDOTABaseAbility {
    CanBeUsedOutOfInventory(): boolean;
    /**
     * Get the container for this item.
     */
    GetContainer(): CDOTA_Item_Physical;
    GetCost(): number;
    /**
     * Get the number of charges this item currently has.
     */
    GetCurrentCharges(): number;
    /**
     * Get the initial number of charges this item has.
     */
    GetInitialCharges(): number;
    /**
     * Gets whether item is unequipped or ready.
     */
    GetItemState(): number;
    /**
     * Get the purchase time of this item
     */
    GetPurchaseTime(): number;
    /**
     * Get the purchaser for this item.
     */
    GetPurchaser(): CDOTA_BaseNPC;
    GetShareability(): EShareAbility;
    IsAlertableItem(): boolean;
    IsCastOnPickup(): boolean;
    IsCombinable(): boolean;
    IsDisassemblable(): boolean;
    IsDroppable(): boolean;
    IsInBackpack(): boolean;
    IsItem(): boolean;
    IsKillable(): boolean;
    IsMuted(): boolean;
    IsPermanent(): boolean;
    IsPurchasable(): boolean;
    IsRecipe(): boolean;
    IsRecipeGenerated(): boolean;
    IsSellable(): boolean;
    IsStackable(): boolean;
    LaunchLoot(bAutoUse: boolean, flHeight: number, flDuration: number, vEndPoint: Vector): void;
    LaunchLootInitialHeight(bAutoUse: boolean, flInitialHeight: number, flLaunchHeight: number, flDuration: number, vEndPoint: Vector): void;
    OnEquip(): void;
    OnUnequip(): void;
    RequiresCharges(): boolean;
    SetCanBeUsedOutOfInventory(bValue: boolean): void;
    SetCastOnPickup(bCastOnPickUp: boolean): void;
    /**
     * Set the number of charges on this item
     */
    SetCurrentCharges(iCharges: number): void;
    SetDroppable(bDroppable: boolean): void;
    /**
     * Sets whether item is unequipped or ready.
     */
    SetItemState(iState: number): void;
    /**
     * Set the purchase time of this item
     */
    SetPurchaseTime(flTime: number): void;
    /**
     * Set the purchaser of record for this item.
     */
    SetPurchaser(hPurchaser: CDOTA_BaseNPC): void;
    SetSellable(bSellable: boolean): void;
    SetShareability(iShareability: EShareAbility): void;
    SetStacksWithOtherOwners(bStacksWithOtherOwners: boolean): void;
    SpendCharge(): void;
    StacksWithOtherOwners(): boolean;
    /**
     * Think this item
     */
    Think(): void;
}
/**
 * Spawns a physical item
 */
interface CDOTA_ItemSpawner extends CBaseEntity {
    /**
     * Returns the item name
     */
    GetItemName(): string;
}
/**
 * A data driven usable item.
 */
interface CDOTA_Item_DataDriven extends CDOTA_Item {
    /**
     * Applies a data driven modifier to the target
     */
    ApplyDataDrivenModifier(hCaster: table, hTarget: table, pszModifierName: string, hModifierTable: table): void;
    /**
     * Applies a data driven thinker at the location
     */
    ApplyDataDrivenThinker(hCaster: table, vLocation: Vector, pszModifierName: string, hModifierTable: table): table;
}
/**
 * A lua-based item.
 */
interface CDOTA_Item_Lua extends CDOTA_Item {
    /**
     * Determine whether an issued command with no target is valid.
     */
    CastFilterResult(): UnitFilterResult;
    /**
     * (Vector vLocation) Determine whether an issued command on a location is valid.
     */
    CastFilterResultLocation(vLocation: Vector): UnitFilterResult;
    /**
     * (HSCRIPT hTarget) Determine whether an issued command on a target is valid.
     */
    CastFilterResultTarget(hTarget: CDOTA_BaseNPC): UnitFilterResult;
    /**
     * Returns abilities that are stolen simultaneously, or otherwise related in functionality.
     */
    GetAssociatedPrimaryAbilities(): string;
    /**
     * Returns other abilities that are stolen simultaneously, or otherwise related in functionality.  Generally hidden abilities.
     */
    GetAssociatedSecondaryAbilities(): string;
    /**
     * Return cast behavior type of this ability.
     */
    GetBehavior(): DOTA_ABILITY_BEHAVIOR;
    /**
     * Return cast range of this ability.
     */
    GetCastRange(vLocation: Vector, hTarget: CDOTA_BaseNPC): number;
    /**
     * Return the channel time of this ability.
     */
    GetChannelTime(): number;
    /**
     * Return mana cost at the given level per second while channeling (-1 is current).
     */
    GetChannelledManaCostPerSecond(iLevel: number): number;
    /**
     * Return who hears speech when this spell is cast.
     */
    GetConceptRecipientType(): number;
    /**
     * Return cooldown of this ability.
     */
    GetCooldown(iLevel: number): number;
    /**
     * Return the error string of a failed command with no target.
     */
    GetCustomCastError(): string;
    /**
     * (Vector vLocation) Return the error string of a failed command on a location.
     */
    GetCustomCastErrorLocation(vLocation: Vector): string;
    /**
     * (HSCRIPT hTarget) Return the error string of a failed command on a target.
     */
    GetCustomCastErrorTarget(hTarget: CDOTA_BaseNPC): string;
    /**
     * Return gold cost at the given level (-1 is current).
     */
    GetGoldCost(iLevel: number): number;
    /**
     * Returns the name of the modifier applied passively by this ability.
     */
    GetIntrinsicModifierName(): string;
    /**
     * Return mana cost at the given level (-1 is current).
     */
    GetManaCost(iLevel: number): number;
    /**
     * Return the animation rate of the cast animation.
     */
    GetPlaybackRateOverride(): number;
    /**
     * Returns true if this ability can be used when not on the action panel.
     */
    IsHiddenAbilityCastable(): boolean;
    /**
     * Returns true if this ability is hidden when stolen by Spell Steal.
     */
    IsHiddenWhenStolen(): boolean;
    /**
     * Returns whether this item is muted or not.
     */
    IsMuted(): boolean;
    /**
     * Returns true if this ability is refreshed by Refresher Orb.
     */
    IsRefreshable(): boolean;
    /**
     * Returns true if this ability can be stolen by Spell Steal.
     */
    IsStealable(): boolean;
    /**
     * Cast time did not complete successfully.
     */
    OnAbilityPhaseInterrupted(): void;
    /**
     * Cast time begins (return true for successful cast).
     */
    OnAbilityPhaseStart(): boolean;
    /**
     * (bool bInterrupted) Channel finished.
     */
    OnChannelFinish(bInterrupted: boolean): void;
    /**
     * (float flInterval) Channeling is taking place.
     */
    OnChannelThink(flInterval: number): void;
    /**
     * Caster (hero only) gained a level, skilled an ability, or received a new stat bonus.
     */
    OnHeroCalculateStatBonus(): void;
    /**
     * A hero has died in the vicinity (ie Urn), takes table of params.
     */
    OnHeroDiedNearby(unit: CDOTA_BaseNPC, attacker: CDOTA_BaseNPC, event: table): void;
    /**
     * Caster gained a level.
     */
    OnHeroLevelUp(): void;
    /**
     * Caster inventory changed.
     */
    OnInventoryContentsChanged(): void;
    /**
     * ( HSCRIPT hItem ) Caster equipped item.
     */
    OnItemEquipped(hItem: CDOTA_Item): void;
    /**
     * Caster died.
     */
    OnOwnerDied(): void;
    /**
     * Caster respawned or spawned for the first time.
     */
    OnOwnerSpawned(): void;
    /**
     * (HSCRIPT hTarget, Vector vLocation) Projectile has collided with a given target or reached its destination (target is invalid).
     */
    OnProjectileHit(hTarget: CDOTA_BaseNPC, vLocation: Vector): boolean;
    /**
     * (Vector vLocation) Projectile is actively moving.
     */
    OnProjectileThink(vLocation: Vector): void;
    /**
     * Cast time finished, spell effects begin.
     */
    OnSpellStart(): void;
    /**
     * ( HSCRIPT hAbility ) Special behavior when stolen by Spell Steal.
     */
    OnStolen(hSourceAbility: CDOTABaseAbility): void;
    /**
     * Ability is toggled on/off.
     */
    OnToggle(): void;
    /**
     * Special behavior when lost by Spell Steal.
     */
    OnUnStolen(): void;
    /**
     * Ability gained a level.
     */
    OnUpgrade(): void;
    /**
     * Returns true if this ability will generate magic stick charges for nearby enemies.
     */
    ProcsMagicStick(): boolean;
    /**
     * Return the type of speech used.
     */
    SpeakTrigger(): number;
}
/**
 * A physical item dropped in the world
 */
interface CDOTA_Item_Physical extends CBaseAnimating {
    /**
     * Returned the contained item.
     */
    GetContainedItem(): CDOTA_Item;
    /**
     * Returns the game time when this item was created in the world
     */
    GetCreationTime(): number;
    /**
     * Set the contained item.
     */
    SetContainedItem(hItem: CDOTA_Item): void;
}
/**
 * A tree in the Dota map
 */
interface CDOTA_MapTree extends CBaseEntity {
    /**
     * Cuts down this tree. Parameters: int nTeamNumberKnownTo (-1 = invalid team)
     */
    CutDown(nTreeNumberKnownTo: DOTATeam_t): void;
    /**
     * Cuts down this tree. Parameters: float flRegrowAfter (-1 = never regrow), int nTeamNumberKnownTo (-1 = invalid team)
     */
    CutDownRegrowAfter(flRegrowAfter: number, nTeamNumberKnownTo: DOTATeam_t): void;
    /**
     * Grows back the tree if it was cut down.
     */
    GrowBack(): void;
    /**
     * Returns true if the tree is standing, false if it has been cut down
     */
    IsStanding(): boolean;
}
/**
 * A lua-based modifier.
 */
interface CDOTA_Modifier_Lua extends CDOTA_Buff {
    /**
     * True/false if this modifier is active on illusions.
     */
    AllowIllusionDuplicate(): boolean;
    /**
     * True/false if this buff is removed when the duration expires.
     */
    DestroyOnExpire(): boolean;
    /**
     * Return the types of attributes applied to this modifier (enum value from DOTAModifierAttribute_t
     */
    GetAttributes(): DOTAModifierAttribute_t;
    /**
     * Returns aura stickiness
     */
    GetAuraDuration(): number;
    /**
     * Return true/false if this entity should receive the aura under specific conditions
     */
    GetAuraEntityReject(hEntity: CDOTA_BaseNPC): boolean;
    /**
     * Return the range around the parent this aura tries to apply its buff.
     */
    GetAuraRadius(): number;
    /**
     * Return the unit flags this aura respects when placing buffs.
     */
    GetAuraSearchFlags(): DOTA_UNIT_TARGET_FLAGS;
    /**
     * Return the teams this aura applies its buff to.
     */
    GetAuraSearchTeam(): DOTA_UNIT_TARGET_TEAM;
    /**
     * Return the unit classifications this aura applies its buff to.
     */
    GetAuraSearchType(): DOTA_UNIT_TARGET_TYPE;
    /**
     * Return the attach type of the particle system from GetEffectName.
     */
    GetEffectAttachType(): ParticleAttachment_t;
    /**
     * Return the name of the particle system that is created while this modifier is active.
     */
    GetEffectName(): string;
    /**
     * Return the name of the hero effect particle system that is created while this modifier is active.
     */
    GetHeroEffectName(): string;
    /**
     * The name of the secondary modifier that will be applied by this modifier (if it is an aura).
     */
    GetModifierAura(): string;
    /**
     * Return the priority order this modifier will be applied over others.
     */
    GetPriority(): modifierpriority;
    /**
     * Return the name of the status effect particle system that is created while this modifier is active.
     */
    GetStatusEffectName(): string;
    /**
     * Return the name of the buff icon to be shown for this modifier.
     */
    GetTexture(): string;
    /**
     * Relationship of this hero effect with those from other buffs (higher is more likely to be shown).
     */
    HeroEffectPriority(): modifierpriority;
    /**
     * True/false if this modifier is an aura.
     */
    IsAura(): boolean;
    /**
     * True/false if this aura provides buffs when the parent is dead.
     */
    IsAuraActiveOnDeath(): boolean;
    /**
     * True/false if this modifier should be displayed as a debuff.
     */
    IsDebuff(): boolean;
    /**
     * True/false if this modifier should be displayed on the buff bar.
     */
    IsHidden(): boolean;
    IsPermanent(): boolean;
    /**
     * True/false if this modifier can be purged.
     */
    IsPurgable(): boolean;
    /**
     * True/false if this modifier can be purged by strong dispels.
     */
    IsPurgeException(): boolean;
    /**
     * True/false if this modifier is considered a stun for purge reasons.
     */
    IsStunDebuff(): boolean;
    /**
     * Runs when the modifier is created.
     */
    OnCreated(params: table): void;
    /**
     * Runs when the modifier is destroyed (after unit loses modifier).
     */
    OnDestroy(): void;
    /**
     * Runs when the think interval occurs.
     */
    OnIntervalThink(): void;
    /**
     * Runs when the modifier is refreshed.
     */
    OnRefresh(params: table): void;
    /**
     * Runs when the modifier is destroyed (before unit loses modifier).
     */
    OnRemoved(): void;
    /**
     * Runs when stack count changes (param is old count).
     */
    OnStackCountChanged(iStackCount: number): void;
    /**
     * True/false if this modifier is removed when the parent dies.
     */
    RemoveOnDeath(): boolean;
    /**
     * Apply the overhead offset to the attached effect.
     */
    ShouldUseOverheadOffset(): boolean;
    /**
     * Relationship of this status effect with those from other buffs (higher is more likely to be shown).
     */
    StatusEffectPriority(): modifierpriority;
}
/**
 * A lua-based horizontal motion controller.
 */
interface CDOTA_Modifier_Lua_Horizontal_Motion extends CDOTA_Modifier_Lua {
    /**
     * Starts the horizontal motion controller effects for this buff.  Returns true if successful.
     */
    ApplyHorizontalMotionController(): boolean;
    /**
     * Get the priority
     */
    GetPriority(): modifierpriority;
    /**
     * Called when the motion gets interrupted.
     */
    OnHorizontalMotionInterrupted(): void;
    /**
     * Set the priority
     */
    SetPriority(nMotionPriority: modifierpriority): void;
    /**
     * Perform any motion from the given interval on the NPC.
     */
    UpdateHorizontalMotion(me: CDOTA_BaseNPC, dt: number): void;
}
/**
 * A lua-based motion controller controlling both vertical and horizontal.
 */
interface CDOTA_Modifier_Lua_Motion_Both extends CDOTA_Modifier_Lua {
    /**
     * Starts the horizontal motion controller effects for this buff.  Returns true if successful.
     */
    ApplyHorizontalMotionController(): boolean;
    /**
     * Starts the vertical motion controller effects for this buff.  Returns true if successful.
     */
    ApplyVerticalMotionController(): boolean;
    /**
     * Get the priority
     */
    GetPriority(): modifierpriority;
    /**
     * Called when the motion gets interrupted.
     */
    OnHorizontalMotionInterrupted(): void;
    /**
     * Called when the motion gets interrupted.
     */
    OnVerticalMotionInterrupted(): void;
    /**
     * Set the priority
     */
    SetPriority(nMotionPriority: modifierpriority): void;
    /**
     * Perform any motion from the given interval on the NPC.
     */
    UpdateHorizontalMotion(me: CDOTA_BaseNPC, dt: number): void;
    /**
     * Perform any motion from the given interval on the NPC.
     */
    UpdateVerticalMotion(me: CDOTA_BaseNPC, dt: number): void;
}
/**
 * A lua-based vertical motion controller.
 */
interface CDOTA_Modifier_Lua_Vertical_Motion extends CDOTA_Modifier_Lua {
    /**
     * Starts the vertical motion controller effects for this buff.  Returns true if successful.
     */
    ApplyVerticalMotionController(): boolean;
    /**
     * Get the priority
     */
    GetMotionPriority(): modifierpriority;
    /**
     * Called when the motion gets interrupted.
     */
    OnVerticalMotionInterrupted(): void;
    /**
     * Set the priority
     */
    SetMotionPriority(nMotionPriority: modifierpriority): void;
    /**
     * Perform any motion from the given interval on the NPC.
     */
    UpdateVerticalMotion(me: CDOTA_BaseNPC, dt: number): void;
}
/**
 * Interface to player data
 */
interface CDOTA_PlayerResource extends CBaseEntity {
    AddAegisPickup(iPlayerID: PlayerID): void;
    AddClaimedFarm(iPlayerID: PlayerID, flFarmValue: number, bEarnedValue: boolean): void;
    AddGoldSpentOnSupport(iPlayerID: PlayerID, iCost: number): void;
    AddRunePickup(iPlayerID: PlayerID): void;
    AreUnitsSharedWithPlayerID(nUnitOwnerPlayerID: PlayerID, nOtherPlayerID: PlayerID): boolean;
    CanRepick(iPlayerID: PlayerID): boolean;
    ClearKillsMatrix(iPlayerID: PlayerID): void;
    ClearLastHitMultikill(iPlayerID: PlayerID): void;
    ClearLastHitStreak(iPlayerID: PlayerID): void;
    ClearRawPlayerDamageMatrix(iPlayerID: PlayerID): void;
    ClearStreak(iPlayerID: PlayerID): void;
    GetAegisPickups(iPlayerID: PlayerID): number;
    GetAssists(iPlayerID: PlayerID): number;
    GetBroadcasterChannel(iPlayerID: PlayerID): number;
    GetBroadcasterChannelSlot(iPlayerID: PlayerID): number;
    GetClaimedDenies(iPlayerID: PlayerID): number;
    GetClaimedFarm(iPlayerID: PlayerID, bOnlyEarned: boolean): number;
    GetClaimedMisses(iPlayerID: PlayerID): number;
    GetConnectionState(iPlayerID: PlayerID): DOTAConnectionState_t;
    GetCreepDamageTaken(iPlayerID: PlayerID, bTotal: boolean): number;
    GetCustomBuybackCooldown(iPlayerID: PlayerID): number;
    GetCustomBuybackCost(iPlayerID: PlayerID): number;
    /**
     * Get the current custom team assignment for this player.
     */
    GetCustomTeamAssignment(iPlayerID: PlayerID): number;
    GetDamageDoneToHero(iPlayerID: PlayerID, iVictimID: number): number;
    GetDeaths(iPlayerID: PlayerID): number;
    GetDenies(iPlayerID: PlayerID): number;
    GetEventPointsForPlayerID(iPlayerID: PlayerID): number;
    GetEventPremiumPoints(iPlayerID: PlayerID): number;
    GetEventRanks(iPlayerID: PlayerID): any;
    GetGold(iPlayerID: PlayerID): number;
    GetGoldLostToDeath(iPlayerID: PlayerID): number;
    GetGoldPerMin(iPlayerID: PlayerID): number;
    GetGoldSpentOnBuybacks(iPlayerID: PlayerID): number;
    GetGoldSpentOnConsumables(iPlayerID: PlayerID): number;
    GetGoldSpentOnItems(iPlayerID: PlayerID): number;
    GetGoldSpentOnSupport(iPlayerID: PlayerID): number;
    GetHealing(iPlayerID: PlayerID): number;
    GetHeroDamageTaken(iPlayerID: PlayerID, bTotal: boolean): number;
    GetKills(iPlayerID: PlayerID): number;
    GetKillsDoneToHero(iPlayerID: PlayerID, iVictimID: PlayerID): number;
    GetLastHitMultikill(iPlayerID: PlayerID): number;
    GetLastHitStreak(iPlayerID: PlayerID): number;
    GetLastHits(iPlayerID: PlayerID): number;
    GetLevel(iPlayerID: PlayerID): number;
    GetMisses(iPlayerID: PlayerID): number;
    GetNearbyCreepDeaths(iPlayerID: PlayerID): number;
    GetNthCourierForTeam(nCourierIndex: number, nTeamNumber: DOTATeam_t): table;
    GetNthPlayerIDOnTeam(iTeamNumber: DOTATeam_t, iNthPlayer: number): number;
    GetNumConsumablesPurchased(iPlayerID: PlayerID): number;
    GetNumCouriersForTeam(nTeamNumber: DOTATeam_t): number;
    GetNumItemsPurchased(iPlayerID: PlayerID): number;
    GetPlayer(iPlayerID: PlayerID): CDOTAPlayer;
    /**
     * Includes spectators and players not assigned to a team
     */
    GetPlayerCount(): number;
    GetPlayerCountForTeam(iTeam: DOTATeam_t): number;
    GetPlayerLoadedCompletely(iPlayerID: PlayerID): boolean;
    GetPlayerName(iPlayerID: PlayerID): string;
    GetRawPlayerDamage(iPlayerID: PlayerID): number;
    GetReliableGold(iPlayerID: PlayerID): number;
    GetRespawnSeconds(iPlayerID: PlayerID): number;
    GetRoshanKills(iPlayerID: PlayerID): number;
    GetRunePickups(iPlayerID: PlayerID): number;
    GetSelectedHeroEntity(iPlayerID: PlayerID): CDOTA_BaseNPC_Hero;
    GetSelectedHeroID(iPlayerID: PlayerID): number;
    GetSelectedHeroName(iPlayerID: PlayerID): string;
    GetSteamAccountID(iPlayerID: PlayerID): number;
    /**
     * Get the 64 bit steam ID for a given player.
     */
    GetSteamID(iPlayerID: PlayerID): number;
    GetStreak(iPlayerID: PlayerID): number;
    GetStuns(iPlayerID: PlayerID): number;
    GetTeam(iPlayerID: PlayerID): DOTATeam_t;
    GetTeamKills(iTeam: DOTATeam_t): number;
    /**
     * Players on a valid team (radiant, dire, or custom*) who haven't abandoned the game
     */
    GetTeamPlayerCount(): number;
    GetTimeOfLastConsumablePurchase(iPlayerID: PlayerID): number;
    GetTimeOfLastDeath(iPlayerID: PlayerID): number;
    GetTimeOfLastItemPurchase(iPlayerID: PlayerID): number;
    GetTotalEarnedGold(iPlayerID: PlayerID): number;
    GetTotalEarnedXP(iPlayerID: PlayerID): number;
    GetTotalGoldSpent(iPlayerID: PlayerID): number;
    GetTowerDamageTaken(iPlayerID: PlayerID, bTotal: boolean): number;
    GetTowerKills(iPlayerID: PlayerID): number;
    GetUnitShareMaskForPlayer(nPlayerID: PlayerID, nOtherPlayerID: PlayerID): number;
    GetUnreliableGold(iPlayerID: PlayerID): number;
    GetXPPerMin(iPlayerID: PlayerID): number;
    /**
     * Does this player have a custom game ticket for this game?
     */
    HasCustomGameTicketForPlayerID(iPlayerID: PlayerID): boolean;
    HasRandomed(iPlayerID: PlayerID): boolean;
    HasSelectedHero(iPlayerID: PlayerID): boolean;
    HaveAllPlayersJoined(): boolean;
    IncrementAssists(iPlayerID: PlayerID, iVictimID: PlayerID): void;
    IncrementClaimedDenies(iPlayerID: PlayerID): void;
    IncrementClaimedMisses(iPlayerID: PlayerID): void;
    IncrementDeaths(iPlayerID: PlayerID, iKillerID: PlayerID): void;
    IncrementDenies(iPlayerID: PlayerID): void;
    IncrementKills(iPlayerID: PlayerID, iVictimID: PlayerID): void;
    IncrementLastHitMultikill(iPlayerID: PlayerID): void;
    IncrementLastHitStreak(iPlayerID: PlayerID): void;
    IncrementLastHits(iPlayerID: PlayerID): void;
    IncrementMisses(iPlayerID: PlayerID): void;
    IncrementNearbyCreepDeaths(iPlayerID: PlayerID): void;
    IncrementStreak(iPlayerID: PlayerID): void;
    IncrementTotalEarnedXP(iPlayerID: PlayerID, iXP: number, nReason: EDOTA_ModifyXP_Reason): void;
    IsBroadcaster(iPlayerID: PlayerID): boolean;
    IsDisableHelpSetForPlayerID(nPlayerID: PlayerID, nOtherPlayerID: PlayerID): boolean;
    IsFakeClient(iPlayerID: PlayerID): boolean;
    IsHeroSelected(pHeroname: string): boolean;
    IsHeroSharedWithPlayerID(nUnitOwnerPlayerID: PlayerID, nOtherPlayerID: PlayerID): boolean;
    IsValidPlayer(iPlayerID: PlayerID): boolean;
    IsValidPlayerID(iPlayerID: PlayerID): boolean;
    IsValidTeamPlayer(iPlayerID: PlayerID): boolean;
    IsValidTeamPlayerID(iPlayerID: PlayerID): boolean;
    ModifyGold(iPlayerID: PlayerID, iGoldChange: number, bReliable: boolean, nReason: EDOTA_ModifyGold_Reason): number;
    /**
     * (playerID, heroClassName, gold, XP) - replaces the player's hero with a new one of the specified class, gold and XP
     */
    ReplaceHeroWith(iPlayerID: PlayerID, pszHeroClass: string, nGold: number, nXP: number): table;
    ResetBuybackCostTime(nPlayerID: PlayerID): void;
    ResetTotalEarnedGold(iPlayerID: PlayerID): void;
    SetBuybackCooldownTime(nPlayerID: PlayerID, flBuybackCooldown: number): void;
    SetBuybackGoldLimitTime(nPlayerID: PlayerID, flBuybackCooldown: number): void;
    /**
     * (playerID, entity) - force the given player's camera to follow the given entity
     */
    SetCameraTarget(nPlayerID: PlayerID, hTarget: CDOTA_BaseNPC): void;
    SetCanRepick(iPlayerID: PlayerID, bCanRepick: boolean): void;
    /**
     * Set the buyback cooldown for this player.
     */
    SetCustomBuybackCooldown(iPlayerID: PlayerID, flCooldownTime: number): void;
    /**
     * Set the buyback cost for this player.
     */
    SetCustomBuybackCost(iPlayerID: PlayerID, iGoldCost: number): void;
    /**
     * Set custom color for player (minimap, scoreboard, etc)
     */
    SetCustomPlayerColor(iPlayerID: PlayerID, r: number, g: number, b: number): void;
    /**
     * Set custom team assignment for this player.
     */
    SetCustomTeamAssignment(iPlayerID: PlayerID, iTeamAssignment: DOTATeam_t): void;
    SetGold(iPlayerID: PlayerID, iGold: number, bReliable: boolean): void;
    SetHasRandomed(iPlayerID: PlayerID): void;
    SetLastBuybackTime(iPlayerID: PlayerID, iLastBuybackTime: number): void;
    /**
     * Set the forced selection entity for a player.
     */
    SetOverrideSelectionEntity(nPlayerID: PlayerID, hEntity: CDOTA_BaseNPC): void;
    SetUnitShareMaskForPlayer(nPlayerID: PlayerID, nOtherPlayerID: PlayerID, nFlag: number, bState: boolean): void;
    SpendGold(iPlayerID: PlayerID, iCost: number, iReason: EDOTA_ModifyGold_Reason): void;
    UpdateTeamSlot(iPlayerID: PlayerID, iTeamNumber: DOTATeam_t, desiredSlot: number): void;
    WhoSelectedHero(pHeroFilename: string): number;
}
/**
 * Simple obstruction
 */
interface CDOTA_SimpleObstruction extends CBaseEntity {
    /**
     * Returns whether the obstruction is currently active
     */
    IsEnabled(): boolean;
    /**
     * Enable or disable the obstruction
     */
    SetEnabled(bEnabled: boolean, bForce: boolean): void;
}
/**
 * A courier.
 */
interface CDOTA_Unit_Courier extends CDOTA_BaseNPC {
    /**
     * Upgrade to a flying courier
     */
    UpgradeToFlyingCourier(): boolean;
}
/**
 * A Dota NPC Unit
 */
interface CDOTA_Unit_Nian extends CDOTA_BaseNPC_Creature {
    /**
     * Is the Nian horn?
     */
    GetHorn(): table;
    /**
     * Is the Nian's tail broken?
     */
    GetTail(): table;
    /**
     * Is the Nian's horn broken?
     */
    IsHornAlive(): boolean;
    /**
     * Is the Nian's tail broken?
     */
    IsTailAlive(): boolean;
}
/**
 * Wrapper class over g_pDebugOverlay instance
 */
interface CDebugOverlayScriptHelper {
    /**
     * Draws an axis. Specify origin + orientation in world space.
     */
    Axis(arg1: Vector, arg2: Quaternion, arg3: number, arg4: boolean, arg5: number): void;
    /**
     * Draws a world-space axis-aligned box. Specify bounds in world space.
     */
    Box(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: number, arg7: boolean, arg8: number): void;
    /**
     * Draws an oriented box at the origin. Specify bounds in local space.
     */
    BoxAngles(arg1: Vector, arg2: Vector, arg3: Vector, arg4: Quaternion, arg5: number, arg6: number, arg7: number, arg8: number, arg9: boolean, arg10: number): void;
    /**
     * Draws a capsule. Specify base in world space.
     */
    Capsule(arg1: Vector, arg2: Quaternion, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: boolean, arg10: number): void;
    /**
     * Draws a circle. Specify center in world space.
     */
    Circle(arg1: Vector, arg2: Quaternion, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: boolean, arg9: number): void;
    /**
     * Draws a circle oriented to the screen. Specify center in world space.
     */
    CircleScreenOriented(arg1: Vector, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: boolean, arg8: number): void;
    /**
     * Draws a wireframe cone. Specify endpoint and direction in world space.
     */
    Cone(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: boolean, arg10: number): void;
    /**
     * Draws a screen-aligned cross. Specify origin in world space.
     */
    Cross(arg1: Vector, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: boolean, arg8: number): void;
    /**
     * Draws a world-aligned cross. Specify origin in world space.
     */
    Cross3D(arg1: Vector, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: boolean, arg8: number): void;
    /**
     * Draws an oriented cross. Specify origin in world space.
     */
    Cross3DOriented(arg1: Vector, arg2: Quaternion, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: boolean, arg9: number): void;
    /**
     * Draws a dashed line. Specify endpoints in world space.
     */
    DrawTickMarkedLine(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: boolean, arg10: number): void;
    /**
     * Draws the attachments of the entity
     */
    EntityAttachments(arg1: ehandle, arg2: number, arg3: number): void;
    /**
     * Draws the axis of the entity origin
     */
    EntityAxis(arg1: ehandle, arg2: number, arg3: boolean, arg4: number): void;
    /**
     * Draws bounds of an entity
     */
    EntityBounds(arg1: ehandle, arg2: number, arg3: number, arg4: number, arg5: number, arg6: boolean, arg7: number): void;
    /**
     * Draws the skeleton of the entity
     */
    EntitySkeleton(arg1: ehandle, arg2: number): void;
    /**
     * Draws text on an entity
     */
    EntityText(arg1: ehandle, arg2: number, arg3: string, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number): void;
    /**
     * Draws a screen-space filled 2D rectangle. Coordinates are in pixels.
     */
    FilledRect2D(arg1: vector2d, arg2: vector2d, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number): void;
    /**
     * Draws a horizontal arrow. Specify endpoints in world space.
     */
    HorzArrow(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: boolean, arg9: number): void;
    /**
     * Draws a line between two points
     */
    Line(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: number, arg7: boolean, arg8: number): void;
    /**
     * Draws a line between two points in screenspace
     */
    Line2D(arg1: vector2d, arg2: vector2d, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number): void;
    /**
     * Pops the identifier used to group overlays. Overlays marked with this identifier can be deleted in a big batch.
     */
    PopDebugOverlayScope(): void;
    /**
     * Pushes an identifier used to group overlays. Deletes all existing overlays using this overlay id.
     */
    PushAndClearDebugOverlayScope(arg1: utlstringtoken): void;
    /**
     * Pushes an identifier used to group overlays. Overlays marked with this identifier can be deleted in a big batch.
     */
    PushDebugOverlayScope(arg1: utlstringtoken): void;
    /**
     * Removes all overlays marked with a specific identifier, regardless of their lifetime.
     */
    RemoveAllInScope(arg1: utlstringtoken): void;
    /**
     * Draws a solid cone. Specify endpoint and direction in world space.
     */
    SolidCone(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: boolean, arg10: number): void;
    /**
     * Draws a wireframe sphere. Specify center in world space.
     */
    Sphere(arg1: Vector, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: boolean, arg8: number): void;
    /**
     * Draws a swept box. Specify endpoints in world space and the bounds in local space.
     */
    SweptBox(arg1: Vector, arg2: Vector, arg3: Vector, arg4: Vector, arg5: Quaternion, arg6: number, arg7: number, arg8: number, arg9: number, arg10: number): void;
    /**
     * Draws 2D text. Specify origin in world space.
     */
    Text(arg1: Vector, arg2: number, arg3: string, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number): void;
    /**
     * Draws a screen-space texture. Coordinates are in pixels.
     */
    Texture(arg1: string, arg2: vector2d, arg3: vector2d, arg4: number, arg5: number, arg6: number, arg7: number, arg8: vector2d, arg9: vector2d, arg10: number): void;
    /**
     * Draws a filled triangle. Specify vertices in world space.
     */
    Triangle(arg1: Vector, arg2: Vector, arg3: Vector, arg4: number, arg5: number, arg6: number, arg7: number, arg8: boolean, arg9: number): void;
    /**
     * Toggles the overlay render type, for unit tests
     */
    UnitTestCycleOverlayRenderType(): void;
    /**
     * Draws 3D text. Specify origin + orientation in world space.
     */
    VectorText3D(arg1: Vector, arg2: Quaternion, arg3: string, arg4: number, arg5: number, arg6: number, arg7: number, arg8: boolean, arg9: number): void;
    /**
     * Draws a vertical arrow. Specify endpoints in world space.
     */
    VertArrow(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: boolean, arg9: number): void;
    /**
     * Draws a arrow associated with a specific yaw. Specify endpoints in world space.
     */
    YawArrow(arg1: Vector, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: boolean, arg10: number): void;
}
/**
 * A quest
 */
interface CDotaQuest extends CBaseEntity {
    /**
     * Add a subquest to this quest
     */
    AddSubquest(hSubquest: table): void;
    /**
     * Mark this quest complete
     */
    CompleteQuest(): void;
    /**
     * Finds a subquest from this quest by index
     */
    GetSubquest(nIndex: number): table;
    /**
     * Finds a subquest from this quest by name
     */
    GetSubquestByName(pszName: string): table;
    /**
     * Remove a subquest from this quest
     */
    RemoveSubquest(hSubquest: table): void;
    /**
     * Set the text replace string for this quest
     */
    SetTextReplaceString(pszString: string): void;
    /**
     * Set a quest value
     */
    SetTextReplaceValue(valueSlot: number, value: number): void;
}
/**
 * A subquest
 */
interface CDotaSubquestBase extends CBaseEntity {
    /**
     * Mark this subquest complete
     */
    CompleteSubquest(): void;
    /**
     * Set the text replace string for this subquest
     */
    SetTextReplaceString(pszString: string): void;
    /**
     * Set a subquest value
     */
    SetTextReplaceValue(valueSlot: number, value: number): void;
}
/**
 * !The global list of entities
 */
interface CEntities {
    /**
     * Creates an entity by classname
     */
    CreateByClassname(className: string): CBaseEntity;
    /**
     * Finds all entities by class name. Returns an array containing all the found entities.
     */
    FindAllByClassname(className: string): CBaseEntity[];
    /**
     * Find entities by class name within a radius.
     */
    FindAllByClassnameWithin(className: string, location: Vector, radius: number): CBaseEntity[];
    /**
     * Find entities by model name.
     */
    FindAllByModel(modelName: string): CBaseEntity[];
    /**
     * Find all entities by name. Returns an array containing all the found entities in it.
     */
    FindAllByName(name: string): CBaseEntity[];
    /**
     * Find entities by name within a radius.
     */
    FindAllByNameWithin(name: string, location: Vector, radius: number): CBaseEntity[];
    /**
     * Find entities by targetname.
     */
    FindAllByTarget(target: string): CBaseEntity[];
    /**
     * Find entities within a radius.
     */
    FindAllInSphere(location: Vector, radius: number): CBaseEntity[];
    /**
     * Find entities by class name. Pass 'null' to start an iteration, or reference to a previously found entity to continue a search
     */
    FindByClassname(previous: CBaseEntity | void, className: string): CBaseEntity;
    /**
     * Find entities by class name nearest to a point.
     */
    FindByClassnameNearest(className: string, location: Vector, radius: number): CBaseEntity;
    /**
     * Find entities by class name within a radius. Pass 'null' to start an iteration, or reference to a previously found entity to continue a search
     */
    FindByClassnameWithin(previous: CBaseEntity | void, className: string, location: Vector, radius: number): CBaseEntity;
    /**
     * Find entities by model name. Pass 'null' to start an iteration, or reference to a previously found entity to continue a search
     */
    FindByModel(previous: CBaseEntity | void, modelName: string): CBaseEntity;
    /**
     * Find entities by model name within a radius. Pass 'null' to start an iteration, or reference to a previously found entity to continue a search
     */
    FindByModelWithin(previous: CBaseEntity | void, modelName: string, location: Vector, radius: number): CBaseEntity;
    /**
     * Find entities by name. Pass 'null' to start an iteration, or reference to a previously found entity to continue a search
     */
    FindByName(previous: CBaseEntity | void, name: string): CBaseEntity;
    /**
     * Find entities by name nearest to a point.
     */
    FindByNameNearest(name: string, location: Vector, radius: number): CBaseEntity;
    /**
     * Find entities by name within a radius. Pass 'null' to start an iteration, or reference to a previously found entity to continue a search
     */
    FindByNameWithin(previous: CBaseEntity | void, name: string, location: Vector, radius: number): CBaseEntity;
    /**
     * Find entities by targetname. Pass 'null' to start an iteration, or reference to a previously found entity to continue a search
     */
    FindByTarget(previous: CBaseEntity | void, target: string): CBaseEntity;
    /**
     * Find entities within a radius. Pass 'null' to start an iteration, or reference to a previously found entity to continue a search
     */
    FindInSphere(previous: CBaseEntity | void, location: Vector, radius: number): CBaseEntity;
    /**
     * Begin an iteration over the list of entities
     */
    First(): CBaseEntity;
    /**
     * Get the local player.
     */
    GetLocalPlayer(): CDOTAPlayer;
    /**
     * Continue an iteration over the list of entities, providing reference to a previously found entity
     */
    Next(previous: CBaseEntity): CBaseEntity;
}
/**
 * CEntityInstance: Root class for all entities
 */
interface CEntityInstance {
    /**
     * Adds an I/O connection that will call the named function on this entity when the specified output fires.
     */
    ConnectOutput(arg1: string, arg2: string): void;
    Destroy(): void;
    /**
     * Removes a connected script function from an I/O event on this entity.
     */
    DisconnectOutput(arg1: string, arg2: string): void;
    /**
     * Removes a connected script function from an I/O event on the passed entity.
     */
    DisconnectRedirectedOutput(arg1: string, arg2: string, arg3: table): void;
    /**
     * Fire an entity output
     */
    FireOutput(arg1: string, arg2: table, arg3: table, arg4: any, arg5: number): void;
    GetClassname(): string;
    /**
     * Get the entity name w/help if not defined (i.e. classname/etc)
     */
    GetDebugName(): string;
    /**
     * Get the entity as an EHANDLE
     */
    GetEntityHandle(): ehandle;
    GetEntityIndex(): number;
    /**
     * Get Integer Attribute
     */
    GetIntAttr(arg1: string): number;
    GetName(): string;
    /**
     * Retrieve, creating if necessary, the private per-instance script-side data associated with an entity
     */
    GetOrCreatePrivateScriptScope(): table;
    /**
     * Retrieve, creating if necessary, the public script-side data associated with an entity
     */
    GetOrCreatePublicScriptScope(): table;
    /**
     * Retrieve the private per-instance script-side data associated with an entity
     */
    GetPrivateScriptScope(): table;
    /**
     * Retrieve the public script-side data associated with an entity
     */
    GetPublicScriptScope(): table;
    /**
     * Adds an I/O connection that will call the named function on the passed entity when the specified output fires.
     */
    RedirectOutput(arg1: string, arg2: string, arg3: table): void;
    /**
     * Delete this entity
     */
    RemoveSelf(): void;
    /**
     * Set Integer Attribute
     */
    SetIntAttr(arg1: string, arg2: number): void;
    entindex(): number;
}
/**
 * C-side of entity framework
 */
interface CEntityScriptFramework {
}
/**
 * env_entity_maker
 */
interface CEnvEntityMaker extends CBaseEntity {
    /**
     * Create an entity at the location of the maker
     */
    SpawnEntity(): void;
    /**
     * Create an entity at the location of a specified entity instance
     */
    SpawnEntityAtEntityOrigin(hEntity: table): void;
    /**
     * Create an entity at a specified location and orientaton, orientation is Euler angle in degrees (pitch, yaw, roll)
     */
    SpawnEntityAtLocation(vecAlternateOrigin: Vector, vecAlternateAngles: Vector): void;
    /**
     * Create an entity at the location of a named entity
     */
    SpawnEntityAtNamedEntityOrigin(pszName: string): void;
}
/**
 * Dynamic, shadow casting light source.
 */
interface CEnvProjectedTexture extends CBaseEntity {
    /**
     * Set light maximum range
     */
    SetFarRange(flRange: number): void;
    /**
     * Set light linear attenuation value
     */
    SetLinearAttenuation(flAtten: number): void;
    /**
     * Set light minimum range
     */
    SetNearRange(flRange: number): void;
    /**
     * Set light quadratic attenuation value
     */
    SetQuadraticAttenuation(flAtten: number): void;
    /**
     * Turn on/off light volumetrics: bool bOn, float flIntensity, float flNoise, int nPlanes, float flPlaneOffset
     */
    SetVolumetrics(bOn: boolean, flIntensity: number, flNoise: number, nPlanes: number, flPlaneOffset: number): void;
}
/**
 * Info Data
 */
interface CInfoData extends CBaseEntity {
    /**
     * Query color data for this key
     */
    QueryColor(tok: utlstringtoken, vDefault: Vector): Vector;
    /**
     * Query float data for this key
     */
    QueryFloat(tok: utlstringtoken, flDefault: number): number;
    /**
     * Query int data for this key
     */
    QueryInt(tok: utlstringtoken, nDefault: number): number;
    /**
     * Query number data for this key
     */
    QueryNumber(tok: utlstringtoken, flDefault: number): number;
    /**
     * Query string data for this key
     */
    QueryString(tok: utlstringtoken, pDefault: string): string;
    /**
     * Query vector data for this key
     */
    QueryVector(tok: utlstringtoken, vDefault: Vector): Vector;
}
/**
 * a world layer in a dota map
 */
interface CInfoWorldLayer extends CBaseEntity {
    /**
     * Hides this layer
     */
    HideWorldLayer(): void;
    /**
     * Shows this layer
     */
    ShowWorldLayer(): void;
}
/**
 * Container for game scripts.
 */
interface CLogicScript extends CBaseEntity {
}
/**
 * Volume to add tags to the world
 */
interface CMarkupVolumeTagged extends CBaseEntity {
    /**
     * Does this volume have the given tag.
     */
    HasTag(pszTagName: string): boolean;
}
/**
 * Container to hold outputs published by script to game
 */
interface CNativeOutputs {
    /**
     * Add an output
     */
    AddOutput(arg1: string, arg2: string): void;
    /**
     * Initialize with number of outputs
     */
    Init(arg1: number): void;
}
/**
 * Particle System
 */
interface CParticleSystem extends CBaseModelEntity {
}
/**
 * Physics props
 */
interface CPhysicsProp extends CBaseAnimating {
    /**
     * Disable motion for the prop
     */
    DisableMotion(): void;
    /**
     * Enable motion for the prop
     */
    EnableMotion(): void;
    /**
     * Enable/disable dynamic vs dynamic continuous collision traces
     */
    SetDynamicVsDynamicContinuous(bIsDynamicVsDynamicContinuousEnabled: boolean): void;
}
/**
 * In-world UI panel
 */
interface CPointClientUIWorldPanel extends CBaseModelEntity {
    /**
     * Tells the panel to accept user input.
     */
    AcceptUserInput(): void;
    /**
     * Adds CSS class(es) to the panel
     */
    AddCSSClasses(pszClasses: string): void;
    /**
     * Tells the panel to ignore user input.
     */
    IgnoreUserInput(): void;
    /**
     * Returns whether this entity is grabbable.
     */
    IsGrabbable(): boolean;
    /**
     * Remove CSS class(es) from the panel
     */
    RemoveCSSClasses(pszClasses: string): void;
}
/**
 * point_template
 */
interface CPointTemplate extends CBaseEntity {
    /**
     * DeleteCreatedSpawnGroups() : Deletes any spawn groups that this point_template has spawned. Note: The point_template will not be deleted by this.
     */
    DeleteCreatedSpawnGroups(): void;
    /**
     * ForceSpawn() : Spawns all of the entities the point_template is pointing at.
     */
    ForceSpawn(): void;
    /**
     * GetSpawnedEntities() : Get the list of the most recent spawned entities
     */
    GetSpawnedEntities(): table;
    /**
     * SetSpawnCallback( hCallbackFunc, hCallbackScope, hCallbackData ) : Set a callback for when the template spawns entities. The spawned entities will be passed in as an array.
     */
    SetSpawnCallback(hCallbackFunc: table, hCallbackScope: table): void;
}
/**
 * World-space text
 */
interface CPointWorldText extends CBaseModelEntity {
    /**
     * Set the message on this entity.
     */
    SetMessage(pMessage: string): void;
}
/**
 * HMD Avatar that owns the VR hands
 */
interface CPropHMDAvatar extends CBaseAnimating {
    /**
     * Get VR hand by ID
     */
    GetVRHand(nHandID: number): table;
}
/**
 * VR hand that controls poses and controller state
 */
interface CPropVRHand extends CBaseAnimating {
    /**
     * Add the attachment to this hand
     */
    AddHandAttachment(hAttachment: table): void;
    /**
     * Add a model override for this hand
     */
    AddHandModelOverride(pModelName: string): table;
    /**
     * Find a specific model override for this hand
     */
    FindHandModelOverride(pModelName: string): table;
    /**
     * Fire a haptic pulse on this hand. [0,2] for strength.
     */
    FireHapticPulse(nStrength: number): void;
    /**
     * Fire a haptic pulse on this hand. Specify the duration in micro seconds.
     */
    FireHapticPulsePrecise(nPulseDuration: number): void;
    /**
     * Get the attachment on this hand
     */
    GetHandAttachment(): table;
    /**
     * Get hand ID
     */
    GetHandID(): number;
    /**
     * Get the player for this hand
     */
    GetPlayer(): table;
    /**
     * Get the filtered controller velocity.
     */
    GetVelocity(): Vector;
    /**
     * Remove all model overrides for this hand
     */
    RemoveAllHandModelOverrides(): void;
    /**
     * Remove hand attachment by handle
     */
    RemoveHandAttachmentByHandle(hAttachment: table): void;
    /**
     * Remove a model override for this hand
     */
    RemoveHandModelOverride(pModelName: string): void;
    /**
     * Set the attachment for this hand
     */
    SetHandAttachment(hAttachment: table): void;
}
/**
 * Choreographed scene which controls animation and/or dialog on one or more actors.
 */
interface CSceneEntity extends CBaseEntity {
    /**
     * Adds a team (by index) to the broadcast list
     */
    AddBroadcastTeamTarget(arg1: number): void;
    /**
     * Cancel scene playback
     */
    Cancel(): void;
    /**
     * Returns length of this scene in seconds.
     */
    EstimateLength(): number;
    /**
     * Get the camera
     */
    FindCamera(): table;
    /**
     * given an entity reference, such as !target, get actual entity from scene object
     */
    FindNamedEntity(arg1: string): table;
    /**
     * If this scene is currently paused.
     */
    IsPaused(): boolean;
    /**
     * If this scene is currently playing.
     */
    IsPlayingBack(): boolean;
    /**
     * given a dummy scene name and a vcd string, load the scene
     */
    LoadSceneFromString(arg1: string, arg2: string): boolean;
    /**
     * Removes a team (by index) from the broadcast list
     */
    RemoveBroadcastTeamTarget(arg1: number): void;
    /**
     * Start scene playback, takes activatorEntity as param
     */
    Start(arg1: table): void;
}
/**
 * !The global list of heroes
 */
interface CScriptHeroList {
    /**
     * Returns all the heroes in the world
     */
    GetAllHeroes(): CDOTA_BaseNPC_Hero[];
    /**
     * Get the Nth hero in the Hero List
     */
    GetHero(nth: number): CDOTA_BaseNPC_Hero;
    /**
     * Returns the number of heroes in the world
     */
    GetHeroCount(): number;
}
/**
 * Container to hold keyvalues published to spawn functions in script
 */
interface CScriptKeyValues {
    /**
     * Reads a spawn key
     */
    GetValue(arg1: string): any;
}
/**
 * !Used to create and manage particle effects
 */
interface CScriptParticleManager {
    /**
     * Creates a new particle effect
     */
    CreateParticle(particleName: string, particleAttach: ParticleAttachment_t, owner: CDOTA_BaseNPC | null | undefined): ParticleID;
    /**
     * Creates a new particle effect that only plays for the specified player
     */
    CreateParticleForPlayer(particleName: string, particleAttach: ParticleAttachment_t, owner: CDOTA_BaseNPC | null | undefined, player: CDOTAPlayer): ParticleID;
    /**
     * Creates a new particle effect that only plays for the specified team
     */
    CreateParticleForTeam(particleName: string, particleAttach: ParticleAttachment_t, owner: CDOTA_BaseNPC | null | undefined, team: DOTATeam_t): ParticleID;
    /**
     * (int index, bool bDestroyImmediately) - Destroy a particle, if bDestroyImmediately destroy it without playing end caps.
     */
    DestroyParticle(particle: ParticleID, immediate: boolean): void;
    GetParticleReplacement(arg1: string, arg2: table): string;
    /**
     * Frees the specified particle index
     */
    ReleaseParticleIndex(particle: ParticleID): void;
    SetParticleAlwaysSimulate(particle: ParticleID): void;
    /**
     * Set the control point data for a control on a particle effect
     */
    SetParticleControl(particle: ParticleID, controlPoint: number, value: Vector): void;
    SetParticleControlEnt(particle: ParticleID, controlPoint: number, unit: CDOTA_BaseNPC, particleAttach: ParticleAttachment_t, attachment: string, offset: Vector, lockOrientation: boolean): void;
    /**
     * (int iIndex, int iPoint, Vector vecPosition)
     */
    SetParticleControlFallback(arg1: number, arg2: number, arg3: Vector): void;
    /**
     * (int nFXIndex, int nPoint, vForward)
     */
    SetParticleControlForward(particle: ParticleID, controlPoint: number, forward: Vector): void;
    /**
     * (int nFXIndex, int nPoint, vForward, vRight, vUp)
     */
    SetParticleControlOrientation(particle: ParticleID, controlPoint: number, forward: Vector, right: Vector, up: Vector): void;
    /**
     * int nfxindex, int nPoint, int nPoint2, float flRadius
     */
    SetParticleFoWProperties(arg1: number, arg2: number, arg3: number, arg4: number): void;
}
/**
 * Container to hold context published to precache functions in script
 */
interface CScriptPrecacheContext {
    /**
     * Precaches a specific resource
     */
    AddResource(arg1: string): void;
    /**
     * Reads a spawn key
     */
    GetValue(arg1: string): any;
}
/**
 * !Access to convar functions
 */
interface Convars {
    /**
     * GetBool(name) : returns the convar as a boolean flag.
     */
    GetBool(convar: string): boolean;
    /**
     * GetCommandClient() : returns the player who issued this console command.
     */
    GetCommandClient(): CDOTAPlayer;
    /**
     * GetDOTACommandClient() : returns the DOTA player who issued this console command.
     */
    GetDOTACommandClient(): CDOTAPlayer;
    /**
     * GetFloat(name) : returns the convar as a float. May return null if no such convar.
     */
    GetFloat(convar: string): number;
    /**
     * GetInt(name) : returns the convar as an int. May return null if no such convar.
     */
    GetInt(convar: string): number;
    /**
     * GetStr(name) : returns the convar as a string. May return null if no such convar.
     */
    GetStr(convar: string): string;
    /**
     * RegisterCommand(name, fn, helpString, flags) : register a console command.
     */
    RegisterCommand(commandName: string, callback: (commandName: string, ...args: string[]) => void, description: string, flags: number): void;
    /**
     * RegisterConvar(name, defaultValue, helpString, flags): register a new console variable.
     */
    RegisterConvar(convarName: string, defaultValue: string, description: string, flags: number): void;
    /**
     * SetBool(name, val) : sets the value of the convar to the bool.
     */
    SetBool(convar: string, value: boolean): void;
    /**
     * SetFloat(name, val) : sets the value of the convar to the float.
     */
    SetFloat(convar: string, value: number): void;
    /**
     * SetInt(name, val) : sets the value of the convar to the int.
     */
    SetInt(convar: string, value: number): void;
    /**
     * SetStr(name, val) : sets the value of the convar to the string.
     */
    SetStr(convar: string, value: string): void;
}
/**
 * Add temporary vision for a given team ( nTeamID, vLocation, flRadius, flDuration, bObstructedVision)
 */
declare function AddFOWViewer(team: DOTATeam_t, location: Vector, radius: number, duration: number, obstructedVision: boolean): void;
/**
 * Returns the number of degrees difference between two yaw angles
 */
declare function AngleDiff(arg1: number, arg2: number): number;
/**
 * Appends a string to a log file on the server
 */
declare function AppendToLogFile(arg1: string, arg2: string): void;
/**
 * Damage an npc.
 */
declare function ApplyDamage(arg1: table): number;
/**
 * (vector,float) constructs a quaternion representing a rotation by angle around the specified vector axis
 */
declare function AxisAngleToQuaternion(arg1: Vector, arg2: number): Quaternion;
/**
 * Compute the closest point on the OBB of an entity.
 */
declare function CalcClosestPointOnEntityOBB(arg1: table, arg2: Vector): Vector;
/**
 * Compute the distance between two entity OBB. A negative return value indicates an input error. A return value of zero indicates that the OBBs are overlapping.
 */
declare function CalcDistanceBetweenEntityOBB(arg1: table, arg2: table): number;
declare function CalcDistanceToLineSegment2D(arg1: Vector, arg2: Vector, arg3: Vector): number;
/**
 * Create all I/O events for a particular entity
 */
declare function CancelEntityIOEvents(arg1: ehandle): void;
/**
 * ( teamNumber )
 */
declare function ClearTeamCustomHealthbarColor(team: DOTATeam_t): void;
/**
 * (hInflictor, hAttacker, flDamage) - Allocate a damageinfo object, used as an argument to TakeDamage(). Call DestroyDamageInfo( hInfo ) to free the object.
 */
declare function CreateDamageInfo(arg1: table, arg2: table, arg3: Vector, arg4: Vector, arg5: number, arg6: number): table;
/**
 * Pass table - Inputs: entity, effect
 */
declare function CreateEffect(arg1: table): boolean;
/**
 * Create an HTTP request.
 */
declare function CreateHTTPRequest(method: string, url: string): CScriptHTTPRequest;
/**
 * Create an HTTP request.
 */
declare function CreateHTTPRequestScriptVM(method: string, url: string): CScriptHTTPRequest;
/**
 * Creates a DOTA hero by its dota_npc_units.txt name and sets it as the given player's controlled hero
 */
declare function CreateHeroForPlayer(heroName: string, player: CDOTAPlayer): CDOTA_BaseNPC_Hero;
/**
 * Create a DOTA item
 */
declare function CreateItem(itemName: string, owner: CDOTAPlayer, purchaser: CDOTAPlayer): CDOTA_Item;
/**
 * Create a physical item at a given location, can start in air (but doesn't clear a space)
 */
declare function CreateItemOnPositionForLaunch(location: Vector, item: CDOTA_Item): table;
/**
 * Create a physical item at a given location
 */
declare function CreateItemOnPositionSync(location: Vector, item: CDOTA_Item): table;
/**
 * Create a modifier not associated with an NPC. ( hCaster, hAbility, modifierName, paramTable, vOrigin, nTeamNumber, bPhantomBlocker )
 */
declare function CreateModifierThinker(arg1: table, arg2: table, arg3: string, arg4: table, arg5: Vector, arg6: number, arg7: boolean): table;
/**
 * Create a scene entity to play the specified scene.
 */
declare function CreateSceneEntity(arg1: string): table;
/**
 * Create a temporary tree. (vLocation, flDuration).
 */
declare function CreateTempTree(arg1: Vector, arg2: number): void;
/**
 * CreateTrigger( vecMin, vecMax ) : Creates and returns an AABB trigger
 */
declare function CreateTrigger(arg1: Vector, arg2: Vector, arg3: Vector): table;
/**
 * CreateTriggerRadiusApproximate( vecOrigin, flRadius ) : Creates and returns an AABB trigger thats bigger than the radius provided
 */
declare function CreateTriggerRadiusApproximate(arg1: Vector, arg2: number): table;
/**
 * Creates a DOTA unit by its dota_npc_units.txt name
 */
declare function CreateUnitByName(unit_name: string, location: Vector, find_clear_space: boolean, npc_owner: CBaseEntity | null | undefined, unit_owner: CDOTAPlayer | null | undefined, team_number: DOTATeam_t): CDOTA_BaseNPC;
/**
 * Creates a DOTA unit by its dota_npc_units.txt name
 */
declare function CreateUnitByNameAsync(unitName: string, location: Vector, findClearSpace: boolean, npcOwner: CDOTA_BaseNPC | null | undefined, playerOwner: CDOTAPlayer | null | undefined, team: DOTATeam_t, callback: (unit: CDOTA_BaseNPC) => void): number;
/**
 * Creates a DOTA unit by its dota_npc_units.txt name from a table of entity key values and a position to spawn at.
 */
declare function CreateUnitFromTable(arg1: table, arg2: Vector): table;
/**
 * (vector,vector) cross product between two vectors
 */
declare function CrossVectors(arg1: Vector, arg2: Vector): Vector;
/**
 * Breaks in the debugger
 */
declare function DebugBreak(): void;
/**
 * Draw a debug overlay box (origin, mins, maxs, forward, r, g, b, a, duration )
 */
declare function DebugDrawBox(arg1: Vector, arg2: Vector, arg3: Vector, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number): void;
/**
 * Draw a debug forward box (cent, min, max, forward, vRgb, a, duration)
 */
declare function DebugDrawBoxDirection(arg1: Vector, arg2: Vector, arg3: Vector, arg4: Vector, arg5: Vector, arg6: number, arg7: number): void;
/**
 * Draw a debug circle (center, vRgb, a, rad, ztest, duration)
 */
declare function DebugDrawCircle(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: boolean, arg6: number): void;
/**
 * Try to clear all the debug overlay info
 */
declare function DebugDrawClear(): void;
/**
 * Draw a debug overlay line (origin, target, r, g, b, ztest, duration)
 */
declare function DebugDrawLine(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: number, arg6: boolean, arg7: number): void;
/**
 * Draw a debug line using color vec (start, end, vRgb, a, ztest, duration)
 */
declare function DebugDrawLine_vCol(arg1: Vector, arg2: Vector, arg3: Vector, arg4: boolean, arg5: number): void;
/**
 * Draw text with a line offset (x, y, lineOffset, text, r, g, b, a, duration)
 */
declare function DebugDrawScreenTextLine(arg1: number, arg2: number, arg3: number, arg4: string, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number): void;
/**
 * Draw a debug sphere (center, vRgb, a, rad, ztest, duration)
 */
declare function DebugDrawSphere(arg1: Vector, arg2: Vector, arg3: number, arg4: number, arg5: boolean, arg6: number): void;
/**
 * Draw text in 3d (origin, text, bViewCheck, duration)
 */
declare function DebugDrawText(arg1: Vector, arg2: string, arg3: boolean, arg4: number): void;
/**
 * Draw pretty debug text (x, y, lineOffset, text, r, g, b, a, duration, font, size, bBold)
 */
declare function DebugScreenTextPretty(arg1: number, arg2: number, arg3: number, arg4: string, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number, arg10: string, arg11: number, arg12: boolean): void;
/**
 * Free a damageinfo object that was created with CreateDamageInfo().
 */
declare function DestroyDamageInfo(arg1: table): void;
/**
 * (hAttacker, hTarget, hAbility, fDamage, fRadius, effectName)
 */
declare function DoCleaveAttack(attacker: CDOTA_BaseNPC, target: CDOTA_BaseNPC, ability: CDOTABaseAbility, damage: number, startRadius: number, endRadius: number, distance: number, effectName: string): number;
/**
 * #EntFire:Generate and entity i/o event
 */
declare function DoEntFire(arg1: string, arg2: string, arg3: string, arg4: number, arg5: table, arg6: table): void;
/**
 * #EntFireByHandle:Generate and entity i/o event
 */
declare function DoEntFireByInstanceHandle(arg1: table, arg2: string, arg3: string, arg4: number, arg5: table, arg6: table): void;
/**
 * Execute a script (internal)
 */
declare function DoIncludeScript(arg1: string, arg2: table): boolean;
/**
 * #ScriptAssert:Asserts the passed in value. Prints out a message and brings up the assert dialog.
 */
declare function DoScriptAssert(arg1: boolean, arg2: string): void;
/**
 * #UniqueString:Generate a string guaranteed to be unique across the life of the script VM, with an optional root string. Useful for adding data to tables when not sure what keys are already in use in that table.
 */
declare function DoUniqueString(seed: string): string;
declare function DotProduct(arg1: Vector, arg2: Vector): number;
/**
 * Emit an announcer sound for all players.
 */
declare function EmitAnnouncerSound(arg1: string): void;
/**
 * Emit an announcer sound for a player.
 */
declare function EmitAnnouncerSoundForPlayer(arg1: string, arg2: number): void;
/**
 * Emit an announcer sound for a team.
 */
declare function EmitAnnouncerSoundForTeam(arg1: string, arg2: number): void;
/**
 * Emit an announcer sound for a team at a specific location.
 */
declare function EmitAnnouncerSoundForTeamOnLocation(arg1: string, arg2: number, arg3: Vector): void;
/**
 * Play named sound for all players
 */
declare function EmitGlobalSound(arg1: string): void;
/**
 * Play named sound on Entity
 */
declare function EmitSoundOn(soundname: string, ntity: CBaseEntity): void;
/**
 * Play named sound only on the client for the passed in player
 */
declare function EmitSoundOnClient(arg1: string, arg2: table): void;
/**
 * Emit a sound on a location from a unit, only for players allied with that unit (vLocation, soundName, hCaster
 */
declare function EmitSoundOnLocationForAllies(arg1: Vector, arg2: string, arg3: table): void;
/**
 * Emit a sound on a location from a unit. (vLocation, soundName, hCaster).
 */
declare function EmitSoundOnLocationWithCaster(arg1: Vector, arg2: string, arg3: table): void;
/**
 * Turn an entity index integer to an HScript representing that entity's script instance.
 */
declare function EntIndexToHScript(entIndex: number): CBaseEntity;
/**
 * Issue an order from a script table
 */
declare function ExecuteOrderFromTable(order: table): void;
/**
 * Smooth curve decreasing slower as it approaches zero
 */
declare function ExponentialDecay(arg1: number, arg2: number, arg3: number): number;
/**
 * Finds a clear random position around a given target unit, using the target unit's padded collision radius.
 */
declare function FindClearRandomPositionAroundUnit(arg1: table, arg2: table, arg3: number): boolean;
/**
 * Place a unit somewhere not already occupied.
 */
declare function FindClearSpaceForUnit(unit: CDOTA_BaseNPC, location: Vector, unknown: boolean): boolean;
/**
 * Find units that intersect the given line with the given flags.
 */
declare function FindUnitsInLine(team: DOTATeam_t, startPos: Vector, endPos: Vector, cacheUnit: CBaseEntity, width: number, teamFilter: DOTA_UNIT_TARGET_TEAM, typeFilter: DOTA_UNIT_TARGET_TYPE, flagFilter: DOTA_UNIT_TARGET_FLAGS): CDOTA_BaseNPC[];
/**
 * Finds the units in a given radius with the given flags.
 */
declare function FindUnitsInRadius(team: DOTATeam_t, location: Vector, cacheUnit: CBaseEntity, radius: number, teamFilter: DOTA_UNIT_TARGET_TEAM, typeFilter: DOTA_UNIT_TARGET_TYPE, flagFilter: DOTA_UNIT_TARGET_FLAGS, order: number, canGrowCache: boolean): CDOTA_BaseNPC[];
/**
 * Fire Entity's Action Input w/no data
 */
declare function FireEntityIOInputNameOnly(arg1: ehandle, arg2: string): void;
/**
 * Fire Entity's Action Input with passed String - you own the memory
 */
declare function FireEntityIOInputString(arg1: ehandle, arg2: string, arg3: string): void;
/**
 * Fire Entity's Action Input with passed Vector - you own the memory
 */
declare function FireEntityIOInputVec(arg1: ehandle, arg2: string, arg3: Vector): void;
/**
 * Fire a game event.
 */
declare function FireGameEvent(eventName: string, eventData: table): void;
/**
 * Fire a game event without broadcasting to the client.
 */
declare function FireGameEventLocal(eventName: string, eventData: table): void;
/**
 * Get the time spent on the server in the last frame
 */
declare function FrameTime(): number;
/**
 * Get the enity index for a tree id specified as the entindex_target of a DOTA_UNIT_ORDER_CAST_TARGET_TREE.
 */
declare function GetEntityIndexForTreeId(arg1: number): number;
/**
 * Returns the engines current frame count
 */
declare function GetFrameCount(): number;
declare function GetFrostyBoostAmount(arg1: number, arg2: number): number;
declare function GetFrostyPointsForRound(arg1: number, arg2: number, arg3: number): number;
declare function GetGoldFrostyBoostAmount(arg1: number, arg2: number): number;
declare function GetGoldFrostyPointsForRound(arg1: number, arg2: number, arg3: number): number;
declare function GetGroundHeight(location: Vector, unitHull: CDOTA_BaseNPC): number;
/**
 * Returns the supplied position moved to the ground. Second parameter is an NPC for measuring movement collision hull offset.
 */
declare function GetGroundPosition(location: Vector, unitHull: CDOTA_BaseNPC): Vector;
/**
 * Get the cost of an item by name.
 */
declare function GetItemCost(arg1: string): number;
declare function GetItemDefOwnedCount(arg1: number, arg2: number): number;
declare function GetItemDefQuantity(arg1: number, arg2: number): number;
/**
 * Get the local player on a listen server.
 */
declare function GetListenServerHost(): table;
/**
 * Get the name of the map.
 */
declare function GetMapName(): string;
/**
 * Get the longest delay for all events attached to an output
 */
declare function GetMaxOutputDelay(arg1: ehandle, arg2: string): number;
/**
 * Get Angular Velocity for VPHYS or normal object. Returns a vector of the axis of rotation, multiplied by the degrees of rotation per second.
 */
declare function GetPhysAngularVelocity(arg1: table): Vector;
/**
 * Get Velocity for VPHYS or normal object
 */
declare function GetPhysVelocity(arg1: table): Vector;
/**
 * Get the current real world date
 */
declare function GetSystemDate(): string;
/**
 * Get the current real world time
 */
declare function GetSystemTime(): string;
/**
 * ( int teamID )
 */
declare function GetTeamHeroKills(team: DOTATeam_t): number;
/**
 * ( int teamID )
 */
declare function GetTeamName(team: DOTATeam_t): string;
/**
 * Given and entity index of a tree, get the tree id for use for use with with unit orders.
 */
declare function GetTreeIdForEntityIndex(arg1: number): number;
/**
 * Gets the world's maximum X position.
 */
declare function GetWorldMaxX(): number;
/**
 * Gets the world's maximum Y position.
 */
declare function GetWorldMaxY(): number;
/**
 * Gets the world's minimum X position.
 */
declare function GetWorldMinX(): number;
/**
 * Gets the world's minimum Y position.
 */
declare function GetWorldMinY(): number;
/**
 * If the given file doesn't exist, creates it with the given contents; does nothing if it exists
 */
declare function InitLogFile(arg1: string, arg2: string): void;
/**
 * Returns true if this is lua running from the client.dll.
 */
declare function IsClient(): boolean;
/**
 * Returns true if this server is a dedicated server.
 */
declare function IsDedicatedServer(): boolean;
/**
 * Returns true if this is lua running within tools mode.
 */
declare function IsInToolsMode(): boolean;
/**
 * Ask fog of war if a location is visible to a certain team (nTeamNumber, vLocation).
 */
declare function IsLocationVisible(team: DOTATeam_t, location: Vector): boolean;
/**
 * Returns true if the entity is valid and marked for deletion.
 */
declare function IsMarkedForDeletion(arg1: table): boolean;
/**
 * Returns true if this is lua running from the server.dll.
 */
declare function IsServer(): boolean;
/**
 * Checks to see if the given hScript is a valid entity
 */
declare function IsValidEntity(entity: table): boolean;
/**
 * (vector,vector,float) lerp between two vectors by a float factor returning new vector
 */
declare function LerpVectors(arg1: Vector, arg2: Vector, arg3: number): Vector;
/**
 * Set the limit on the pathfinding search space.
 */
declare function LimitPathingSearchDepth(arg1: number): void;
/**
 * Link a lua-defined modifier with the associated class ( className, fileName, LuaModifierType).
 */
declare function LinkLuaModifier(modifierName: string, filePath: string, motionController: LuaModifierType): void;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: string, callback: (event: table) => void, context?: table): EventListenerID;
/**
 * Creates a table from the specified keyvalues text file
 */
declare function LoadKeyValues(filePath: string): table;
/**
 * Creates a table from the specified keyvalues string
 */
declare function LoadKeyValuesFromString(kvString: string): table;
/**
 * Get the current local time
 */
declare function LocalTime(): any;
/**
 * Checks to see if the given hScript is a valid entity
 */
declare function MakeStringToken(arg1: string): number;
/**
 * Start a minimap event. (nTeamID, hEntity, nXCoord, nYCoord, nEventType, nEventDuration).
 */
declare function MinimapEvent(team: DOTATeam_t, entity: CBaseEntity, xCoord: number, yCoord: number, eventType: DOTAMinimapEvent_t, duration: number): void;
/**
 * Pause or unpause the game.
 */
declare function PauseGame(paused: boolean): void;
/**
 * Get a script instance of a player by index.
 */
declare function PlayerInstanceFromIndex(arg1: number): table;
/**
 * Precache an entity from KeyValues in table
 */
declare function PrecacheEntityFromTable(arg1: string, arg2: table, arg3: table): void;
/**
 * Precache a list of entity KeyValues tables
 */
declare function PrecacheEntityListFromTable(arg1: table, arg2: table): void;
/**
 * Asynchronously precaches a DOTA item by its dota_npc_items.txt name, provides a callback when it's finished.
 */
declare function PrecacheItemByNameAsync(itemName: string, callback: (id: number) => void): void;
/**
 * Precaches a DOTA item by its dota_npc_items.txt name
 */
declare function PrecacheItemByNameSync(arg1: string, arg2: table): void;
/**
 * ( modelName, context ) - Manually precache a single model
 */
declare function PrecacheModel(arg1: string, arg2: table): void;
/**
 * Manually precache a single resource
 */
declare function PrecacheResource(arg1: string, arg2: string, arg3: table): void;
/**
 * Asynchronously precaches a DOTA unit by its dota_npc_units.txt name, provides a callback when it's finished.
 */
declare function PrecacheUnitByNameAsync(unitName: string, callback: (id: number) => void, playerID: number): void;
/**
 * Precaches a DOTA unit by its dota_npc_units.txt name
 */
declare function PrecacheUnitByNameSync(arg1: string, arg2: table, arg3: number): void;
/**
 * Precaches a DOTA unit from a table of entity key values.
 */
declare function PrecacheUnitFromTableAsync(arg1: table, arg2: table): void;
/**
 * Precaches a DOTA unit from a table of entity key values.
 */
declare function PrecacheUnitFromTableSync(arg1: table, arg2: table): void;
/**
 * Print a console message with a linked console command
 */
declare function PrintLinkedConsoleMessage(arg1: string, arg2: string): void;
/**
 * Get a random float within a range
 */
declare function RandomFloat(min: number, max: number): number;
/**
 * Get a random int within a range
 */
declare function RandomInt(min: number, max: number): number;
/**
 * Get a random 2D vector of the given length.
 */
declare function RandomVector(length: number): Vector;
/**
 * Register a custom animation script to run when a model loads
 */
declare function RegisterCustomAnimationScriptForModel(arg1: string, arg2: string): void;
/**
 * Create a C proxy for a script-based spawn group filter
 */
declare function RegisterSpawnGroupFilterProxy(arg1: string): void;
/**
 * Reloads the MotD file
 */
declare function ReloadMOTD(): void;
/**
 * Remove the C proxy for a script-based spawn group filter
 */
declare function RemoveSpawnGroupFilterProxy(arg1: string): void;
/**
 * Check and fix units that have been assigned a position inside collision radius of other NPCs.
 */
declare function ResolveNPCPositions(arg1: Vector, arg2: number): void;
/**
 * Rolls a number from 1 to 100 and returns true if the roll is less than or equal to the number specified
 */
declare function RollPercentage(successPercentage: number): boolean;
/**
 * Rotate a QAngle by another QAngle.
 */
declare function RotateOrientation(arg1: QAngle, arg2: QAngle): QAngle;
/**
 * Rotate a Vector around a point.
 */
declare function RotatePosition(arg1: Vector, arg2: QAngle, arg3: Vector): Vector;
/**
 * (quaternion,vector,float) rotates a quaternion by the specified angle around the specified vector axis
 */
declare function RotateQuaternionByAxisAngle(arg1: Quaternion, arg2: Vector, arg3: number): Quaternion;
/**
 * Find the delta between two QAngles.
 */
declare function RotationDelta(arg1: QAngle, arg2: QAngle): QAngle;
/**
 * converts delta QAngle to an angular velocity Vector
 */
declare function RotationDeltaAsAngularVelocity(arg1: QAngle, arg2: QAngle): Vector;
/**
 * Have Entity say string, and teamOnly or not
 */
declare function Say(entity: CBaseEntity, message: string, teamOnly: boolean): void;
/**
 * Start a screenshake with the following parameters. vecCenter, flAmplitude, flFrequency, flDuration, flRadius, eCommand( SHAKE_START = 0, SHAKE_STOP = 1 ), bAirShake
 */
declare function ScreenShake(center: Vector, amplitude: number, frequency: number, duration: number, radius: number, eCommand: number, airShake: boolean): void;
declare function SendFrostivusTimeElapsedToGC(): void;
declare function SendFrostyPointsMessageToGC(arg1: table): void;
/**
 * ( DOTAPlayer sendToPlayer, int iMessageType, Entity targetEntity, int iValue, DOTAPlayer sourcePlayer ) - sendToPlayer and sourcePlayer can be nil - iMessageType is one of OVERHEAD_ALERT_*
 */
declare function SendOverheadEventMessage(player: CDOTAPlayer, messageType: number, unit: CDOTA_BaseNPC, value: number, sourcePlayer: CDOTAPlayer): void;
/**
 * Send a string to the console as a client command
 */
declare function SendToConsole(arg1: string): void;
/**
 * Send a string to the console as a server command
 */
declare function SendToServerConsole(arg1: string): void;
/**
 * Sets an opvar value for all players
 */
declare function SetOpvarFloatAll(arg1: string, arg2: string, arg3: string, arg4: number): void;
/**
 * Sets an opvar value for a single player
 */
declare function SetOpvarFloatPlayer(arg1: string, arg2: string, arg3: string, arg4: number, arg5: table): void;
/**
 * Set Angular Velocity for VPHYS or normal object, from a vector of the axis of rotation, multiplied by the degrees of rotation per second.
 */
declare function SetPhysAngularVelocity(arg1: table, arg2: Vector): void;
/**
 * Set the current quest name.
 */
declare function SetQuestName(arg1: string): void;
/**
 * Set the current quest phase.
 */
declare function SetQuestPhase(arg1: number): void;
/**
 * Set rendering on/off for an ehandle
 */
declare function SetRenderingEnabled(arg1: ehandle, arg2: boolean): void;
/**
 * ( teamNumber, r, g, b )
 */
declare function SetTeamCustomHealthbarColor(team: DOTATeam_t, r: number, g: number, b: number): void;
/**
 * ( const char *pszMessage, int nPlayerID, int nValue, float flTime ) - Supports localized strings - %s1 = PlayerName, %s2 = Value, %s3 = TeamName
 */
declare function ShowCustomHeaderMessage(arg1: string, arg2: number, arg3: number, arg4: number): void;
/**
 * Show a generic popup dialog for all players.
 */
declare function ShowGenericPopup(arg1: string, arg2: string, arg3: string, arg4: string, arg5: number): void;
/**
 * Show a generic popup dialog to a specific player.
 */
declare function ShowGenericPopupToPlayer(arg1: table, arg2: string, arg3: string, arg4: string, arg5: string, arg6: number): void;
/**
 * Print a hud message on all clients
 */
declare function ShowMessage(arg1: string): void;
/**
 * Synchronously spawns a single entity from a table
 */
declare function SpawnEntityFromTableSynchronous(baseclass: string, data: table): CBaseEntity;
/**
 * Hierarchically spawn an entity group from a set of spawn tables.
 */
declare function SpawnEntityGroupFromTable(arg1: table, arg2: boolean, arg3: table): boolean;
/**
 * Asynchronously spawn an entity group from a list of spawn tables. A callback will be triggered when the spawning is complete
 */
declare function SpawnEntityListFromTableAsynchronous(arg1: table, arg2: table): number;
/**
 * Synchronously spawn an entity group from a list of spawn tables.
 */
declare function SpawnEntityListFromTableSynchronous(arg1: table): table;
/**
 * (quaternion,quaternion,float) very basic interpolation of v0 to v1 over t on [0,1]
 */
declare function SplineQuaternions(arg1: Quaternion, arg2: Quaternion, arg3: number): Quaternion;
/**
 * (vector,vector,float) very basic interpolation of v0 to v1 over t on [0,1]
 */
declare function SplineVectors(arg1: Vector, arg2: Vector, arg3: number): Vector;
/**
 * Start a sound event
 */
declare function StartSoundEvent(arg1: string, arg2: table): void;
/**
 * Start a sound event from position
 */
declare function StartSoundEventFromPosition(arg1: string, arg2: Vector): void;
/**
 * Start a sound event from position with reliable delivery
 */
declare function StartSoundEventFromPositionReliable(arg1: string, arg2: Vector): void;
/**
 * Start a sound event from position with optional delivery
 */
declare function StartSoundEventFromPositionUnreliable(arg1: string, arg2: Vector): void;
/**
 * Start a sound event with reliable delivery
 */
declare function StartSoundEventReliable(arg1: string, arg2: table): void;
/**
 * Start a sound event with optional delivery
 */
declare function StartSoundEventUnreliable(arg1: string, arg2: table): void;
/**
 * Pass entity and effect name
 */
declare function StopEffect(arg1: table, arg2: string): void;
/**
 * Stop listening to all game events within a specific context.
 */
declare function StopListeningToAllGameEvents(arg1: table): void;
/**
 * Stop listening to a particular game event.
 */
declare function StopListeningToGameEvent(arg1: number): boolean;
/**
 * Stops a sound event
 */
declare function StopSoundEvent(arg1: string, arg2: table): void;
/**
 * Stop named sound on Entity
 */
declare function StopSoundOn(arg1: string, arg2: table): void;
/**
 * Get the current server time
 */
declare function Time(): number;
/**
 * Pass table - Inputs: start, end, ent, (optional mins, maxs) -- outputs: pos, fraction, hit, startsolid, normal
 */
declare function TraceCollideable(arg1: table): boolean;
/**
 * Pass table - Inputs: start, end, min, max, mask, ignore  -- outputs: pos, fraction, hit, enthit, startsolid
 */
declare function TraceHull(arg1: table): boolean;
/**
 * Pass table - Inputs: startpos, endpos, mask, ignore  -- outputs: pos, fraction, hit, enthit, startsolid
 */
declare function TraceLine(arg1: table): boolean;
/**
 * Returns the number of degrees difference between two yaw angles
 */
declare function UTIL_AngleDiff(arg1: number, arg2: number): number;
/**
 * Sends colored text to one client.
 */
declare function UTIL_MessageText(arg1: number, arg2: string, arg3: number, arg4: number, arg5: number, arg6: number): void;
/**
 * Sends colored text to all clients.
 */
declare function UTIL_MessageTextAll(arg1: string, arg2: number, arg3: number, arg4: number, arg5: number): void;
/**
 * Sends colored text to all clients. (Valid context keys: player_id, value, team_id)
 */
declare function UTIL_MessageTextAll_WithContext(arg1: string, arg2: number, arg3: number, arg4: number, arg5: number, arg6: table): void;
/**
 * Sends colored text to one client. (Valid context keys: player_id, value, team_id)
 */
declare function UTIL_MessageText_WithContext(arg1: number, arg2: string, arg3: number, arg4: number, arg5: number, arg6: number, arg7: table): void;
/**
 * Removes the specified entity
 */
declare function UTIL_Remove(hEntity: CBaseEntity): void;
/**
 * Immediately removes the specified entity
 */
declare function UTIL_RemoveImmediate(hEntity: CBaseEntity): void;
/**
 * Clear all message text on one client.
 */
declare function UTIL_ResetMessageText(arg1: number): void;
/**
 * Clear all message text from all clients.
 */
declare function UTIL_ResetMessageTextAll(): void;
/**
 * Check if a unit passes a set of filters. (hNPC, nTargetTeam, nTargetType, nTargetFlags, nTeam
 */
declare function UnitFilter(arg1: table, arg2: number, arg3: number, arg4: number, arg5: number): number;
/**
 * Unload a spawn group by name
 */
declare function UnloadSpawnGroup(arg1: string): void;
/**
 * Unload a spawn group by handle
 */
declare function UnloadSpawnGroupByHandle(arg1: number): void;
declare function UpdateEventPoints(arg1: table): void;
declare function VectorAngles(arg1: Vector): QAngle;
/**
 * Get Qangles (with no roll) for a Vector.
 */
declare function VectorToAngles(arg1: Vector): QAngle;
/**
 * Gets the value of the given cvar, as a float.
 */
declare function cvar_getf(arg1: string): number;
/**
 * Sets the value of the given cvar, as a float.
 */
declare function cvar_setf(arg1: string, arg2: number): boolean;
/**
 * Add a rule to the decision database.
 */
declare function rr_AddDecisionRule(arg1: table): boolean;
/**
 * Commit the result of QueryBestResponse back to the given entity to play. Call with params (entity, airesponse)
 */
declare function rr_CommitAIResponse(arg1: table, arg2: table): boolean;
/**
 * Retrieve a table of all available expresser targets, in the form { name : handle, name: handle }.
 */
declare function rr_GetResponseTargets(): table;
/**
 * Params: (entity, query) : tests 'query' against entity's response system and returns the best response found (or null if none found).
 */
declare function rr_QueryBestResponse(arg1: table, arg2: table, arg3: table): boolean;
/**
 * !Access to global system functions
 */
interface GlobalSys {
    /**
     * CommandLineCheck(name) : returns true if the command line param was used, otherwise false.
     */
    CommandLineCheck(arg1: string): any;
    /**
     * CommandLineFloat(name) : returns the command line param as a float.
     */
    CommandLineFloat(arg1: string, arg2: number): any;
    /**
     * CommandLineInt(name) : returns the command line param as an int.
     */
    CommandLineInt(arg1: string, arg2: number): any;
    /**
     * CommandLineStr(name) : returns the command line param as a string.
     */
    CommandLineStr(arg1: string, arg2: string): any;
}
/**
 * !The grid navigation system
 */
interface GridNav {
    /**
     * Determine if it is possible to reach the specified end point from the specified start point. bool (vStart, vEnd)
     */
    CanFindPath(arg1: Vector, arg2: Vector): boolean;
    /**
     * Destroy all trees in the area(vPosition, flRadius, bFullCollision
     */
    DestroyTreesAroundPoint(arg1: Vector, arg2: number, arg3: boolean): void;
    /**
     * Find a path between the two points an return the length of the path. If there is not a path between the points the returned value will be -1. float (vStart, vEnd )
     */
    FindPathLength(arg1: Vector, arg2: Vector): number;
    /**
     * Returns a table full of tree HSCRIPTS (vPosition, flRadius, bFullCollision).
     */
    GetAllTreesAroundPoint(arg1: Vector, arg2: number, arg3: boolean): any;
    /**
     * Get the X position of the center of a given X index
     */
    GridPosToWorldCenterX(arg1: number): number;
    /**
     * Get the Y position of the center of a given Y index
     */
    GridPosToWorldCenterY(arg1: number): number;
    /**
     * Checks whether the given position is blocked
     */
    IsBlocked(arg1: Vector): boolean;
    /**
     * (position, radius, checkFullTreeRadius?) Checks whether there are any trees overlapping the given point
     */
    IsNearbyTree(arg1: Vector, arg2: number, arg3: boolean): boolean;
    /**
     * Checks whether the given position is traversable
     */
    IsTraversable(arg1: Vector): boolean;
    /**
     * Causes all trees in the map to regrow
     */
    RegrowAllTrees(): void;
    /**
     * Get the X index of a given world X position
     */
    WorldToGridPosX(arg1: number): number;
    /**
     * Get the Y index of a given world Y position
     */
    WorldToGridPosY(arg1: number): number;
}
/**
 * !The projectile manager
 */
interface ProjectileManager {
    /**
     * Update speed
     */
    ChangeTrackingProjectileSpeed(arg1: table, arg2: number): void;
    /**
     * Creates a linear projectile and returns the projectile ID
     */
    CreateLinearProjectile(projectileData: table): ProjectileID;
    /**
     * Creates a tracking projectile
     */
    CreateTrackingProjectile(projectileData: table): ProjectileID;
    /**
     * Destroys the linear projectile matching the argument ID
     */
    DestroyLinearProjectile(projectile: ProjectileID): void;
    /**
     * Returns current location of projectile
     */
    GetLinearProjectileLocation(projectile: ProjectileID): Vector;
    /**
     * Returns current radius of projectile
     */
    GetLinearProjectileRadius(projectile: ProjectileID): number;
    /**
     * Returns a vector representing the current velocity of the projectile.
     */
    GetLinearProjectileVelocity(projectile: ProjectileID): Vector;
    /**
     * Makes the specified unit dodge projectiles
     */
    ProjectileDodge(unit: CDOTA_BaseNPC): void;
    /**
     * Update velocity
     */
    UpdateLinearProjectileDirection(projectile: ProjectileID, direction: Vector, speed: number): void;
}
/**
 * Vector class
 */
declare function Vector(x: number, y: number, z: number): Vector;
/**
 * Vector class
 */
interface Vector {
    /**
     * Overloaded +. Adds vectors together
     */
    __add(a: Vector, b: Vector): Vector;
    /**
     * Overloaded /. Divides vectors
     */
    __div(a: Vector, b: Vector): Vector;
    /**
     * Overloaded ==. Tests for Equality
     */
    __eq(a: Vector, b: Vector): boolean;
    /**
     * Overloaded # returns the length of the vector
     */
    __len(): number;
    /**
     * Overloaded * returns the vectors multiplied together
     */
    __mul(a: Vector, b: Vector): Vector;
    /**
     * Overloaded -. Subtracts vectors
     */
    __sub(a: Vector, b: Vector): Vector;
    /**
     * Overloaded .. Converts vectors to strings
     */
    __tostring(): string;
    /**
     * Overloaded - operator
     */
    __unm(): Vector;
    /**
     * Cross product of two vectors
     */
    Cross(a: Vector, b: Vector): Vector;
    /**
     * Dot product of two vectors
     */
    Dot(a: Vector, b: Vector): number;
    /**
     * Length of the Vector
     */
    Length(): number;
    /**
     * Length of the Vector in the XY plane
     */
    Length2D(): number;
    /**
     * Returns the vector normalized
     */
    Normalized(): Vector;
}
interface CScriptHTTPRequest {
    /**
     * Send a HTTP request.
     */
    Send(callback: (result: CScriptHTTPResponse) => void): boolean;
    /**
     * Set the total timeout on the request.
     */
    SetHTTPRequestAbsoluteTimeoutMS(timeout: number): boolean;
    /**
     * Set a POST or GET parameter on the request.
     */
    SetHTTPRequestGetOrPostParameter(arg1: string, arg2: string): boolean;
    /**
     * Set a header value on the request.
     */
    SetHTTPRequestHeaderValue(arg1: string, arg2: string): boolean;
    /**
     * Set the network timeout on the request - this timer is reset when any data is received.
     */
    SetHTTPRequestNetworkActivityTimeout(timeout: number): boolean;
    /**
     * Set the literal body of a post - invalid after setting a post parameter.
     */
    SetHTTPRequestRawPostBody(arg1: string, arg2: string): boolean;
}
declare enum AbilityLearnResult_t {
    ABILITY_CAN_BE_UPGRADED = 0,
    ABILITY_CANNOT_BE_UPGRADED_NOT_UPGRADABLE = 1,
    ABILITY_CANNOT_BE_UPGRADED_AT_MAX = 2,
    ABILITY_CANNOT_BE_UPGRADED_REQUIRES_LEVEL = 3,
    ABILITY_NOT_LEARNABLE = 4
}
declare enum AttributeDerivedStats {
    DOTA_ATTRIBUTE_STRENGTH_DAMAGE = 0,
    DOTA_ATTRIBUTE_STRENGTH_HP = 1,
    DOTA_ATTRIBUTE_STRENGTH_HP_REGEN_PERCENT = 2,
    DOTA_ATTRIBUTE_STRENGTH_STATUS_RESISTANCE_PERCENT = 3,
    DOTA_ATTRIBUTE_AGILITY_DAMAGE = 4,
    DOTA_ATTRIBUTE_AGILITY_ARMOR = 5,
    DOTA_ATTRIBUTE_AGILITY_ATTACK_SPEED = 6,
    DOTA_ATTRIBUTE_AGILITY_MOVE_SPEED_PERCENT = 7,
    DOTA_ATTRIBUTE_INTELLIGENCE_DAMAGE = 8,
    DOTA_ATTRIBUTE_INTELLIGENCE_MANA = 9,
    DOTA_ATTRIBUTE_INTELLIGENCE_MANA_REGEN_PERCENT = 10,
    DOTA_ATTRIBUTE_INTELLIGENCE_SPELL_AMP_PERCENT = 11,
    DOTA_ATTRIBUTE_INTELLIGENCE_MAGIC_RESISTANCE_PERCENT = 12
}
declare enum Attributes {
    DOTA_ATTRIBUTE_STRENGTH = 0,
    DOTA_ATTRIBUTE_AGILITY = 1,
    DOTA_ATTRIBUTE_INTELLECT = 2,
    DOTA_ATTRIBUTE_MAX = 3,
    DOTA_ATTRIBUTE_INVALID = -1
}
declare enum DAMAGE_TYPES {
    DAMAGE_TYPE_NONE = 0,
    DAMAGE_TYPE_PHYSICAL = 1,
    DAMAGE_TYPE_MAGICAL = 2,
    DAMAGE_TYPE_PURE = 4,
    DAMAGE_TYPE_HP_REMOVAL = 8,
    DAMAGE_TYPE_ALL = 7
}
declare enum DOTAAbilitySpeakTrigger_t {
    DOTA_ABILITY_SPEAK_START_ACTION_PHASE = 0,
    DOTA_ABILITY_SPEAK_CAST = 1
}
declare enum DOTADamageFlag_t {
    DOTA_DAMAGE_FLAG_NONE = 0,
    DOTA_DAMAGE_FLAG_IGNORES_MAGIC_ARMOR = 1,
    DOTA_DAMAGE_FLAG_IGNORES_PHYSICAL_ARMOR = 2,
    DOTA_DAMAGE_FLAG_BYPASSES_INVULNERABILITY = 4,
    DOTA_DAMAGE_FLAG_BYPASSES_BLOCK = 8,
    DOTA_DAMAGE_FLAG_REFLECTION = 16,
    DOTA_DAMAGE_FLAG_HPLOSS = 32,
    DOTA_DAMAGE_FLAG_NO_DIRECTOR_EVENT = 64,
    DOTA_DAMAGE_FLAG_NON_LETHAL = 128,
    DOTA_DAMAGE_FLAG_USE_COMBAT_PROFICIENCY = 256,
    DOTA_DAMAGE_FLAG_NO_DAMAGE_MULTIPLIERS = 512,
    DOTA_DAMAGE_FLAG_NO_SPELL_AMPLIFICATION = 1024,
    DOTA_DAMAGE_FLAG_DONT_DISPLAY_DAMAGE_IF_SOURCE_HIDDEN = 2048,
    DOTA_DAMAGE_FLAG_NO_SPELL_LIFESTEAL = 4096
}
declare enum DOTAHUDVisibility_t {
    DOTA_HUD_VISIBILITY_INVALID = -1,
    DOTA_HUD_VISIBILITY_TOP_TIMEOFDAY = 0,
    DOTA_HUD_VISIBILITY_TOP_HEROES = 1,
    DOTA_HUD_VISIBILITY_TOP_SCOREBOARD = 2,
    DOTA_HUD_VISIBILITY_ACTION_PANEL = 3,
    DOTA_HUD_VISIBILITY_ACTION_MINIMAP = 4,
    DOTA_HUD_VISIBILITY_INVENTORY_PANEL = 5,
    DOTA_HUD_VISIBILITY_INVENTORY_SHOP = 6,
    DOTA_HUD_VISIBILITY_INVENTORY_ITEMS = 7,
    DOTA_HUD_VISIBILITY_INVENTORY_QUICKBUY = 8,
    DOTA_HUD_VISIBILITY_INVENTORY_COURIER = 9,
    DOTA_HUD_VISIBILITY_INVENTORY_PROTECT = 10,
    DOTA_HUD_VISIBILITY_INVENTORY_GOLD = 11,
    DOTA_HUD_VISIBILITY_SHOP_SUGGESTEDITEMS = 12,
    DOTA_HUD_VISIBILITY_HERO_SELECTION_TEAMS = 13,
    DOTA_HUD_VISIBILITY_HERO_SELECTION_GAME_NAME = 14,
    DOTA_HUD_VISIBILITY_HERO_SELECTION_CLOCK = 15,
    DOTA_HUD_VISIBILITY_TOP_MENU_BUTTONS = 16,
    DOTA_HUD_VISIBILITY_TOP_BAR_BACKGROUND = 17,
    DOTA_HUD_VISIBILITY_TOP_BAR_RADIANT_TEAM = 18,
    DOTA_HUD_VISIBILITY_TOP_BAR_DIRE_TEAM = 19,
    DOTA_HUD_VISIBILITY_TOP_BAR_SCORE = 20,
    DOTA_HUD_VISIBILITY_ENDGAME = 21,
    DOTA_HUD_VISIBILITY_ENDGAME_CHAT = 22,
    DOTA_HUD_VISIBILITY_QUICK_STATS = 23,
    DOTA_HUD_VISIBILITY_PREGAME_STRATEGYUI = 24,
    DOTA_HUD_VISIBILITY_KILLCAM = 25,
    DOTA_HUD_VISIBILITY_TOP_BAR = 26,
    DOTA_HUD_VISIBILITY_COUNT = 27
}
declare enum DOTAInventoryFlags_t {
    DOTA_INVENTORY_ALLOW_NONE = 0,
    DOTA_INVENTORY_ALLOW_MAIN = 1,
    DOTA_INVENTORY_ALLOW_STASH = 2,
    DOTA_INVENTORY_ALLOW_DROP_ON_GROUND = 4,
    DOTA_INVENTORY_ALLOW_DROP_AT_FOUNTAIN = 8,
    DOTA_INVENTORY_LIMIT_DROP_ON_GROUND = 16,
    DOTA_INVENTORY_ALL_ACCESS = 3
}
declare enum DOTALimits_t {
    /**
     * Max number of players connected to the server including spectators.
     */
    DOTA_MAX_PLAYERS = 64,
    /**
     * Max number of players per team.
     */
    DOTA_MAX_TEAM = 24,
    /**
     * Max number of player teams supported.
     */
    DOTA_MAX_PLAYER_TEAMS = 10,
    /**
     * Max number of non-spectator players supported.
     */
    DOTA_MAX_TEAM_PLAYERS = 24,
    /**
     * How many spectators can watch.
     */
    DOTA_MAX_SPECTATOR_TEAM_SIZE = 40,
    /**
     * Max number of viewers in a spectator lobby.
     */
    DOTA_MAX_SPECTATOR_LOBBY_SIZE = 15,
    /**
     * Default number of players per team.
     */
    DOTA_DEFAULT_MAX_TEAM = 5,
    /**
     * Default number of non-spectator players supported.
     */
    DOTA_DEFAULT_MAX_TEAM_PLAYERS = 10
}
declare enum DOTAMinimapEvent_t {
    DOTA_MINIMAP_EVENT_ANCIENT_UNDER_ATTACK = 2,
    DOTA_MINIMAP_EVENT_BASE_UNDER_ATTACK = 4,
    DOTA_MINIMAP_EVENT_BASE_GLYPHED = 8,
    DOTA_MINIMAP_EVENT_TEAMMATE_UNDER_ATTACK = 16,
    DOTA_MINIMAP_EVENT_TEAMMATE_TELEPORTING = 32,
    DOTA_MINIMAP_EVENT_TEAMMATE_DIED = 64,
    DOTA_MINIMAP_EVENT_TUTORIAL_TASK_ACTIVE = 128,
    DOTA_MINIMAP_EVENT_TUTORIAL_TASK_FINISHED = 256,
    DOTA_MINIMAP_EVENT_HINT_LOCATION = 512,
    DOTA_MINIMAP_EVENT_ENEMY_TELEPORTING = 1024,
    DOTA_MINIMAP_EVENT_CANCEL_TELEPORTING = 2048,
    DOTA_MINIMAP_EVENT_RADAR = 4096,
    DOTA_MINIMAP_EVENT_RADAR_TARGET = 8192
}
declare enum DOTAModifierAttribute_t {
    MODIFIER_ATTRIBUTE_NONE = 0,
    MODIFIER_ATTRIBUTE_PERMANENT = 1,
    MODIFIER_ATTRIBUTE_MULTIPLE = 2,
    MODIFIER_ATTRIBUTE_IGNORE_INVULNERABLE = 4,
    MODIFIER_ATTRIBUTE_AURA_PRIORITY = 8
}
declare enum DOTAMusicStatus_t {
    DOTA_MUSIC_STATUS_NONE = 0,
    DOTA_MUSIC_STATUS_EXPLORATION = 1,
    DOTA_MUSIC_STATUS_BATTLE = 2,
    DOTA_MUSIC_STATUS_PRE_GAME_EXPLORATION = 3,
    DOTA_MUSIC_STATUS_DEAD = 4,
    DOTA_MUSIC_STATUS_LAST = 5
}
declare enum DOTAProjectileAttachment_t {
    DOTA_PROJECTILE_ATTACHMENT_NONE = 0,
    DOTA_PROJECTILE_ATTACHMENT_ATTACK_1 = 1,
    DOTA_PROJECTILE_ATTACHMENT_ATTACK_2 = 2,
    DOTA_PROJECTILE_ATTACHMENT_HITLOCATION = 3,
    DOTA_PROJECTILE_ATTACHMENT_ATTACK_3 = 4,
    DOTA_PROJECTILE_ATTACHMENT_ATTACK_4 = 5,
    DOTA_PROJECTILE_ATTACHMENT_LAST = 6
}
declare enum DOTAScriptInventorySlot_t {
    DOTA_ITEM_SLOT_1 = 0,
    DOTA_ITEM_SLOT_2 = 1,
    DOTA_ITEM_SLOT_3 = 2,
    DOTA_ITEM_SLOT_4 = 3,
    DOTA_ITEM_SLOT_5 = 4,
    DOTA_ITEM_SLOT_6 = 5,
    DOTA_ITEM_SLOT_7 = 6,
    DOTA_ITEM_SLOT_8 = 7,
    DOTA_ITEM_SLOT_9 = 8,
    DOTA_STASH_SLOT_1 = 9,
    DOTA_STASH_SLOT_2 = 10,
    DOTA_STASH_SLOT_3 = 11,
    DOTA_STASH_SLOT_4 = 12,
    DOTA_STASH_SLOT_5 = 13,
    DOTA_STASH_SLOT_6 = 14
}
declare enum DOTASlotType_t {
    DOTA_LOADOUT_TYPE_INVALID = -1,
    DOTA_LOADOUT_TYPE_WEAPON = 0,
    DOTA_LOADOUT_TYPE_OFFHAND_WEAPON = 1,
    DOTA_LOADOUT_TYPE_WEAPON2 = 2,
    DOTA_LOADOUT_TYPE_OFFHAND_WEAPON2 = 3,
    DOTA_LOADOUT_TYPE_HEAD = 4,
    DOTA_LOADOUT_TYPE_SHOULDER = 5,
    DOTA_LOADOUT_TYPE_ARMS = 6,
    DOTA_LOADOUT_TYPE_ARMOR = 7,
    DOTA_LOADOUT_TYPE_BELT = 8,
    DOTA_LOADOUT_TYPE_NECK = 9,
    DOTA_LOADOUT_TYPE_BACK = 10,
    DOTA_LOADOUT_TYPE_LEGS = 11,
    DOTA_LOADOUT_TYPE_GLOVES = 12,
    DOTA_LOADOUT_TYPE_TAIL = 13,
    DOTA_LOADOUT_TYPE_MISC = 14,
    DOTA_LOADOUT_TYPE_BODY_HEAD = 15,
    DOTA_LOADOUT_TYPE_MOUNT = 16,
    DOTA_LOADOUT_TYPE_SUMMON = 17,
    DOTA_LOADOUT_TYPE_SHAPESHIFT = 18,
    DOTA_LOADOUT_TYPE_TAUNT = 19,
    DOTA_LOADOUT_TYPE_AMBIENT_EFFECTS = 20,
    DOTA_LOADOUT_TYPE_ABILITY_ATTACK = 21,
    DOTA_LOADOUT_TYPE_ABILITY1 = 22,
    DOTA_LOADOUT_TYPE_ABILITY2 = 23,
    DOTA_LOADOUT_TYPE_ABILITY3 = 24,
    DOTA_LOADOUT_TYPE_ABILITY4 = 25,
    DOTA_LOADOUT_TYPE_ABILITY_ULTIMATE = 26,
    DOTA_LOADOUT_TYPE_VOICE = 27,
    DOTA_LOADOUT_TYPE_ACTION_ITEM = 28,
    DOTA_LOADOUT_TYPE_COURIER = 29,
    DOTA_LOADOUT_TYPE_ANNOUNCER = 30,
    DOTA_LOADOUT_TYPE_MEGA_KILLS = 31,
    DOTA_LOADOUT_TYPE_MUSIC = 32,
    DOTA_LOADOUT_TYPE_WARD = 33,
    DOTA_LOADOUT_TYPE_HUD_SKIN = 34,
    DOTA_LOADOUT_TYPE_LOADING_SCREEN = 35,
    DOTA_LOADOUT_TYPE_WEATHER = 36,
    DOTA_LOADOUT_TYPE_HEROIC_STATUE = 37,
    DOTA_LOADOUT_TYPE_MULTIKILL_BANNER = 38,
    DOTA_LOADOUT_TYPE_CURSOR_PACK = 39,
    DOTA_LOADOUT_TYPE_TELEPORT_EFFECT = 40,
    DOTA_LOADOUT_TYPE_BLINK_EFFECT = 41,
    DOTA_LOADOUT_TYPE_RELIC = 42,
    DOTA_LOADOUT_TYPE_TERRAIN = 43,
    DOTA_PLAYER_LOADOUT_START = 28,
    DOTA_PLAYER_LOADOUT_END = 43,
    DOTA_LOADOUT_TYPE_NONE = 44,
    DOTA_LOADOUT_TYPE_COUNT = 45
}
declare enum DOTASpeechType_t {
    DOTA_SPEECH_USER_INVALID = 0,
    DOTA_SPEECH_USER_SINGLE = 1,
    DOTA_SPEECH_USER_TEAM = 2,
    DOTA_SPEECH_USER_TEAM_NEARBY = 3,
    DOTA_SPEECH_USER_NEARBY = 4,
    DOTA_SPEECH_USER_ALL = 5,
    DOTA_SPEECH_GOOD_TEAM = 6,
    DOTA_SPEECH_BAD_TEAM = 7,
    DOTA_SPEECH_SPECTATOR = 8,
    DOTA_SPEECH_RECIPIENT_TYPE_MAX = 9
}
declare enum DOTATeam_t {
    DOTA_TEAM_FIRST = 2,
    DOTA_TEAM_GOODGUYS = 2,
    DOTA_TEAM_BADGUYS = 3,
    DOTA_TEAM_NEUTRALS = 4,
    DOTA_TEAM_NOTEAM = 5,
    DOTA_TEAM_CUSTOM_1 = 6,
    DOTA_TEAM_CUSTOM_2 = 7,
    DOTA_TEAM_CUSTOM_3 = 8,
    DOTA_TEAM_CUSTOM_4 = 9,
    DOTA_TEAM_CUSTOM_5 = 10,
    DOTA_TEAM_CUSTOM_6 = 11,
    DOTA_TEAM_CUSTOM_7 = 12,
    DOTA_TEAM_CUSTOM_8 = 13,
    DOTA_TEAM_COUNT = 14,
    DOTA_TEAM_CUSTOM_MIN = 6,
    DOTA_TEAM_CUSTOM_MAX = 13,
    DOTA_TEAM_CUSTOM_COUNT = 8
}
declare enum DOTAUnitAttackCapability_t {
    DOTA_UNIT_CAP_NO_ATTACK = 0,
    DOTA_UNIT_CAP_MELEE_ATTACK = 1,
    DOTA_UNIT_CAP_RANGED_ATTACK = 2
}
declare enum DOTAUnitMoveCapability_t {
    DOTA_UNIT_CAP_MOVE_NONE = 0,
    DOTA_UNIT_CAP_MOVE_GROUND = 1,
    DOTA_UNIT_CAP_MOVE_FLY = 2
}
declare enum DOTA_ABILITY_BEHAVIOR {
    DOTA_ABILITY_BEHAVIOR_NONE = 0,
    DOTA_ABILITY_BEHAVIOR_HIDDEN = 1,
    DOTA_ABILITY_BEHAVIOR_PASSIVE = 2,
    DOTA_ABILITY_BEHAVIOR_NO_TARGET = 4,
    DOTA_ABILITY_BEHAVIOR_UNIT_TARGET = 8,
    DOTA_ABILITY_BEHAVIOR_POINT = 16,
    DOTA_ABILITY_BEHAVIOR_AOE = 32,
    DOTA_ABILITY_BEHAVIOR_NOT_LEARNABLE = 64,
    DOTA_ABILITY_BEHAVIOR_CHANNELLED = 128,
    DOTA_ABILITY_BEHAVIOR_ITEM = 256,
    DOTA_ABILITY_BEHAVIOR_TOGGLE = 512,
    DOTA_ABILITY_BEHAVIOR_DIRECTIONAL = 1024,
    DOTA_ABILITY_BEHAVIOR_IMMEDIATE = 2048,
    DOTA_ABILITY_BEHAVIOR_AUTOCAST = 4096,
    DOTA_ABILITY_BEHAVIOR_OPTIONAL_UNIT_TARGET = 8192,
    DOTA_ABILITY_BEHAVIOR_OPTIONAL_POINT = 16384,
    DOTA_ABILITY_BEHAVIOR_OPTIONAL_NO_TARGET = 32768,
    DOTA_ABILITY_BEHAVIOR_AURA = 65536,
    DOTA_ABILITY_BEHAVIOR_ATTACK = 131072,
    DOTA_ABILITY_BEHAVIOR_DONT_RESUME_MOVEMENT = 262144,
    DOTA_ABILITY_BEHAVIOR_ROOT_DISABLES = 524288,
    DOTA_ABILITY_BEHAVIOR_UNRESTRICTED = 1048576,
    DOTA_ABILITY_BEHAVIOR_IGNORE_PSEUDO_QUEUE = 2097152,
    DOTA_ABILITY_BEHAVIOR_IGNORE_CHANNEL = 4194304,
    DOTA_ABILITY_BEHAVIOR_DONT_CANCEL_MOVEMENT = 8388608,
    DOTA_ABILITY_BEHAVIOR_DONT_ALERT_TARGET = 16777216,
    DOTA_ABILITY_BEHAVIOR_DONT_RESUME_ATTACK = 33554432,
    DOTA_ABILITY_BEHAVIOR_NORMAL_WHEN_STOLEN = 67108864,
    DOTA_ABILITY_BEHAVIOR_IGNORE_BACKSWING = 134217728,
    DOTA_ABILITY_BEHAVIOR_RUNE_TARGET = 268435456,
    DOTA_ABILITY_BEHAVIOR_DONT_CANCEL_CHANNEL = 536870912,
    DOTA_ABILITY_BEHAVIOR_VECTOR_TARGETING = 1073741824,
    DOTA_ABILITY_BEHAVIOR_LAST_RESORT_POINT = -2147483648,
    DOTA_ABILITY_BEHAVIOR_CAN_SELF_CAST = 0
}
declare enum DOTA_GameState {
    DOTA_GAMERULES_STATE_INIT = 0,
    DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD = 1,
    DOTA_GAMERULES_STATE_HERO_SELECTION = 3,
    DOTA_GAMERULES_STATE_STRATEGY_TIME = 4,
    DOTA_GAMERULES_STATE_PRE_GAME = 7,
    DOTA_GAMERULES_STATE_GAME_IN_PROGRESS = 8,
    DOTA_GAMERULES_STATE_POST_GAME = 9,
    DOTA_GAMERULES_STATE_DISCONNECT = 10,
    DOTA_GAMERULES_STATE_TEAM_SHOWCASE = 5,
    DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP = 2,
    DOTA_GAMERULES_STATE_WAIT_FOR_MAP_TO_LOAD = 6
}
declare enum DOTA_HeroPickState {
    DOTA_HEROPICK_STATE_NONE = 0,
    DOTA_HEROPICK_STATE_AP_SELECT = 1,
    DOTA_HEROPICK_STATE_SD_SELECT = 2,
    DOTA_HEROPICK_STATE_INTRO_SELECT_UNUSED = 3,
    DOTA_HEROPICK_STATE_RD_SELECT_UNUSED = 4,
    DOTA_HEROPICK_STATE_CM_INTRO = 5,
    DOTA_HEROPICK_STATE_CM_CAPTAINPICK = 6,
    DOTA_HEROPICK_STATE_CM_BAN1 = 7,
    DOTA_HEROPICK_STATE_CM_BAN2 = 8,
    DOTA_HEROPICK_STATE_CM_BAN3 = 9,
    DOTA_HEROPICK_STATE_CM_BAN4 = 10,
    DOTA_HEROPICK_STATE_CM_BAN5 = 11,
    DOTA_HEROPICK_STATE_CM_BAN6 = 12,
    DOTA_HEROPICK_STATE_CM_BAN7 = 13,
    DOTA_HEROPICK_STATE_CM_BAN8 = 14,
    DOTA_HEROPICK_STATE_CM_BAN9 = 15,
    DOTA_HEROPICK_STATE_CM_BAN10 = 16,
    DOTA_HEROPICK_STATE_CM_BAN11 = 17,
    DOTA_HEROPICK_STATE_CM_BAN12 = 18,
    DOTA_HEROPICK_STATE_CM_SELECT1 = 19,
    DOTA_HEROPICK_STATE_CM_SELECT2 = 20,
    DOTA_HEROPICK_STATE_CM_SELECT3 = 21,
    DOTA_HEROPICK_STATE_CM_SELECT4 = 22,
    DOTA_HEROPICK_STATE_CM_SELECT5 = 23,
    DOTA_HEROPICK_STATE_CM_SELECT6 = 24,
    DOTA_HEROPICK_STATE_CM_SELECT7 = 25,
    DOTA_HEROPICK_STATE_CM_SELECT8 = 26,
    DOTA_HEROPICK_STATE_CM_SELECT9 = 27,
    DOTA_HEROPICK_STATE_CM_SELECT10 = 28,
    DOTA_HEROPICK_STATE_CM_PICK = 29,
    DOTA_HEROPICK_STATE_AR_SELECT = 30,
    DOTA_HEROPICK_STATE_MO_SELECT = 31,
    DOTA_HEROPICK_STATE_FH_SELECT = 32,
    DOTA_HEROPICK_STATE_CD_INTRO = 33,
    DOTA_HEROPICK_STATE_CD_CAPTAINPICK = 34,
    DOTA_HEROPICK_STATE_CD_BAN1 = 35,
    DOTA_HEROPICK_STATE_CD_BAN2 = 36,
    DOTA_HEROPICK_STATE_CD_BAN3 = 37,
    DOTA_HEROPICK_STATE_CD_BAN4 = 38,
    DOTA_HEROPICK_STATE_CD_BAN5 = 39,
    DOTA_HEROPICK_STATE_CD_BAN6 = 40,
    DOTA_HEROPICK_STATE_CD_SELECT1 = 41,
    DOTA_HEROPICK_STATE_CD_SELECT2 = 42,
    DOTA_HEROPICK_STATE_CD_SELECT3 = 43,
    DOTA_HEROPICK_STATE_CD_SELECT4 = 44,
    DOTA_HEROPICK_STATE_CD_SELECT5 = 45,
    DOTA_HEROPICK_STATE_CD_SELECT6 = 46,
    DOTA_HEROPICK_STATE_CD_SELECT7 = 47,
    DOTA_HEROPICK_STATE_CD_SELECT8 = 48,
    DOTA_HEROPICK_STATE_CD_SELECT9 = 49,
    DOTA_HEROPICK_STATE_CD_SELECT10 = 50,
    DOTA_HEROPICK_STATE_CD_PICK = 51,
    DOTA_HEROPICK_STATE_BD_SELECT = 52,
    DOTA_HERO_PICK_STATE_ABILITY_DRAFT_SELECT = 53,
    DOTA_HERO_PICK_STATE_ARDM_SELECT = 54,
    DOTA_HEROPICK_STATE_ALL_DRAFT_SELECT = 55,
    DOTA_HERO_PICK_STATE_CUSTOMGAME_SELECT = 56,
    DOTA_HEROPICK_STATE_SELECT_PENALTY = 57,
    DOTA_HEROPICK_STATE_CUSTOM_PICK_RULES = 58,
    DOTA_HEROPICK_STATE_COUNT = 59
}
declare enum DOTA_MOTION_CONTROLLER_PRIORITY {
    DOTA_MOTION_CONTROLLER_PRIORITY_LOWEST = 0,
    DOTA_MOTION_CONTROLLER_PRIORITY_LOW = 1,
    DOTA_MOTION_CONTROLLER_PRIORITY_MEDIUM = 2,
    DOTA_MOTION_CONTROLLER_PRIORITY_HIGH = 3,
    DOTA_MOTION_CONTROLLER_PRIORITY_HIGHEST = 4
}
declare enum DOTA_RUNES {
    DOTA_RUNE_INVALID = -1,
    DOTA_RUNE_DOUBLEDAMAGE = 0,
    DOTA_RUNE_HASTE = 1,
    DOTA_RUNE_ILLUSION = 2,
    DOTA_RUNE_INVISIBILITY = 3,
    DOTA_RUNE_REGENERATION = 4,
    DOTA_RUNE_BOUNTY = 5,
    DOTA_RUNE_ARCANE = 6,
    DOTA_RUNE_COUNT = 7
}
declare enum DOTA_SHOP_TYPE {
    DOTA_SHOP_HOME = 0,
    DOTA_SHOP_SIDE = 1,
    DOTA_SHOP_SECRET = 2,
    DOTA_SHOP_GROUND = 3,
    DOTA_SHOP_SIDE2 = 4,
    DOTA_SHOP_SECRET2 = 5,
    DOTA_SHOP_CUSTOM = 6,
    DOTA_SHOP_NONE = 7
}
declare enum DOTA_UNIT_TARGET_FLAGS {
    DOTA_UNIT_TARGET_FLAG_NONE = 0,
    DOTA_UNIT_TARGET_FLAG_RANGED_ONLY = 2,
    DOTA_UNIT_TARGET_FLAG_MELEE_ONLY = 4,
    DOTA_UNIT_TARGET_FLAG_DEAD = 8,
    DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES = 16,
    DOTA_UNIT_TARGET_FLAG_NOT_MAGIC_IMMUNE_ALLIES = 32,
    DOTA_UNIT_TARGET_FLAG_INVULNERABLE = 64,
    DOTA_UNIT_TARGET_FLAG_FOW_VISIBLE = 128,
    DOTA_UNIT_TARGET_FLAG_NO_INVIS = 256,
    DOTA_UNIT_TARGET_FLAG_NOT_ANCIENTS = 512,
    DOTA_UNIT_TARGET_FLAG_PLAYER_CONTROLLED = 1024,
    DOTA_UNIT_TARGET_FLAG_NOT_DOMINATED = 2048,
    DOTA_UNIT_TARGET_FLAG_NOT_SUMMONED = 4096,
    DOTA_UNIT_TARGET_FLAG_NOT_ILLUSIONS = 8192,
    DOTA_UNIT_TARGET_FLAG_NOT_ATTACK_IMMUNE = 16384,
    DOTA_UNIT_TARGET_FLAG_MANA_ONLY = 32768,
    DOTA_UNIT_TARGET_FLAG_CHECK_DISABLE_HELP = 65536,
    DOTA_UNIT_TARGET_FLAG_NOT_CREEP_HERO = 131072,
    DOTA_UNIT_TARGET_FLAG_OUT_OF_WORLD = 262144,
    DOTA_UNIT_TARGET_FLAG_NOT_NIGHTMARED = 524288,
    DOTA_UNIT_TARGET_FLAG_PREFER_ENEMIES = 1048576,
    DOTA_UNIT_TARGET_FLAG_RESPECT_OBSTRUCTIONS = 2097152
}
declare enum DOTA_UNIT_TARGET_TEAM {
    DOTA_UNIT_TARGET_TEAM_NONE = 0,
    DOTA_UNIT_TARGET_TEAM_FRIENDLY = 1,
    DOTA_UNIT_TARGET_TEAM_ENEMY = 2,
    DOTA_UNIT_TARGET_TEAM_CUSTOM = 4,
    DOTA_UNIT_TARGET_TEAM_BOTH = 3
}
declare enum DOTA_UNIT_TARGET_TYPE {
    DOTA_UNIT_TARGET_NONE = 0,
    DOTA_UNIT_TARGET_HERO = 1,
    DOTA_UNIT_TARGET_CREEP = 2,
    DOTA_UNIT_TARGET_BUILDING = 4,
    DOTA_UNIT_TARGET_COURIER = 16,
    DOTA_UNIT_TARGET_OTHER = 32,
    DOTA_UNIT_TARGET_TREE = 64,
    DOTA_UNIT_TARGET_CUSTOM = 128,
    DOTA_UNIT_TARGET_BASIC = 18,
    DOTA_UNIT_TARGET_ALL = 55
}
declare enum DamageCategory_t {
    DOTA_DAMAGE_CATEGORY_SPELL = 0,
    DOTA_DAMAGE_CATEGORY_ATTACK = 1
}
declare enum DotaDefaultUIElement_t {
    DOTA_DEFAULT_UI_INVALID = -1,
    DOTA_DEFAULT_UI_TOP_TIMEOFDAY = 0,
    DOTA_DEFAULT_UI_TOP_HEROES = 1,
    DOTA_DEFAULT_UI_FLYOUT_SCOREBOARD = 2,
    DOTA_DEFAULT_UI_ACTION_PANEL = 3,
    DOTA_DEFAULT_UI_ACTION_MINIMAP = 4,
    DOTA_DEFAULT_UI_INVENTORY_PANEL = 5,
    DOTA_DEFAULT_UI_INVENTORY_SHOP = 6,
    DOTA_DEFAULT_UI_INVENTORY_ITEMS = 7,
    DOTA_DEFAULT_UI_INVENTORY_QUICKBUY = 8,
    DOTA_DEFAULT_UI_INVENTORY_COURIER = 9,
    DOTA_DEFAULT_UI_INVENTORY_PROTECT = 10,
    DOTA_DEFAULT_UI_INVENTORY_GOLD = 11,
    DOTA_DEFAULT_UI_SHOP_SUGGESTEDITEMS = 12,
    DOTA_DEFAULT_UI_HERO_SELECTION_TEAMS = 13,
    DOTA_DEFAULT_UI_HERO_SELECTION_GAME_NAME = 14,
    DOTA_DEFAULT_UI_HERO_SELECTION_CLOCK = 15,
    DOTA_DEFAULT_UI_TOP_MENU_BUTTONS = 16,
    DOTA_DEFAULT_UI_TOP_BAR_BACKGROUND = 17,
    DOTA_DEFAULT_UI_TOP_BAR_RADIANT_TEAM = 18,
    DOTA_DEFAULT_UI_TOP_BAR_DIRE_TEAM = 19,
    DOTA_DEFAULT_UI_TOP_BAR_SCORE = 20,
    DOTA_DEFAULT_UI_ENDGAME = 21,
    DOTA_DEFAULT_UI_ENDGAME_CHAT = 22,
    DOTA_DEFAULT_UI_QUICK_STATS = 23,
    DOTA_DEFAULT_UI_PREGAME_STRATEGYUI = 24,
    DOTA_DEFAULT_UI_KILLCAM = 25,
    DOTA_DEFAULT_UI_TOP_BAR = 26,
    DOTA_DEFAULT_UI_ELEMENT_COUNT = 27
}
declare enum EDOTA_ModifyGold_Reason {
    DOTA_ModifyGold_Unspecified = 0,
    DOTA_ModifyGold_Death = 1,
    DOTA_ModifyGold_Buyback = 2,
    DOTA_ModifyGold_PurchaseConsumable = 3,
    DOTA_ModifyGold_PurchaseItem = 4,
    DOTA_ModifyGold_AbandonedRedistribute = 5,
    DOTA_ModifyGold_SellItem = 6,
    DOTA_ModifyGold_AbilityCost = 7,
    DOTA_ModifyGold_CheatCommand = 8,
    DOTA_ModifyGold_SelectionPenalty = 9,
    DOTA_ModifyGold_GameTick = 10,
    DOTA_ModifyGold_Building = 11,
    DOTA_ModifyGold_HeroKill = 12,
    DOTA_ModifyGold_CreepKill = 13,
    DOTA_ModifyGold_RoshanKill = 14,
    DOTA_ModifyGold_CourierKill = 15,
    DOTA_ModifyGold_SharedGold = 16
}
declare enum EDOTA_ModifyXP_Reason {
    DOTA_ModifyXP_Unspecified = 0,
    DOTA_ModifyXP_HeroKill = 1,
    DOTA_ModifyXP_CreepKill = 2,
    DOTA_ModifyXP_RoshanKill = 3
}
declare enum EShareAbility {
    ITEM_FULLY_SHAREABLE = 0,
    ITEM_PARTIALLY_SHAREABLE = 1,
    ITEM_NOT_SHAREABLE = 2
}
declare enum GameActivity_t {
    ACT_DOTA_IDLE = 1500,
    ACT_DOTA_IDLE_RARE = 1501,
    ACT_DOTA_RUN = 1502,
    ACT_DOTA_ATTACK = 1503,
    ACT_DOTA_ATTACK2 = 1504,
    ACT_DOTA_ATTACK_EVENT = 1505,
    ACT_DOTA_DIE = 1506,
    ACT_DOTA_FLINCH = 1507,
    ACT_DOTA_FLAIL = 1508,
    ACT_DOTA_DISABLED = 1509,
    ACT_DOTA_CAST_ABILITY_1 = 1510,
    ACT_DOTA_CAST_ABILITY_2 = 1511,
    ACT_DOTA_CAST_ABILITY_3 = 1512,
    ACT_DOTA_CAST_ABILITY_4 = 1513,
    ACT_DOTA_CAST_ABILITY_5 = 1514,
    ACT_DOTA_CAST_ABILITY_6 = 1515,
    ACT_DOTA_OVERRIDE_ABILITY_1 = 1516,
    ACT_DOTA_OVERRIDE_ABILITY_2 = 1517,
    ACT_DOTA_OVERRIDE_ABILITY_3 = 1518,
    ACT_DOTA_OVERRIDE_ABILITY_4 = 1519,
    ACT_DOTA_CHANNEL_ABILITY_1 = 1520,
    ACT_DOTA_CHANNEL_ABILITY_2 = 1521,
    ACT_DOTA_CHANNEL_ABILITY_3 = 1522,
    ACT_DOTA_CHANNEL_ABILITY_4 = 1523,
    ACT_DOTA_CHANNEL_ABILITY_5 = 1524,
    ACT_DOTA_CHANNEL_ABILITY_6 = 1525,
    ACT_DOTA_CHANNEL_END_ABILITY_1 = 1526,
    ACT_DOTA_CHANNEL_END_ABILITY_2 = 1527,
    ACT_DOTA_CHANNEL_END_ABILITY_3 = 1528,
    ACT_DOTA_CHANNEL_END_ABILITY_4 = 1529,
    ACT_DOTA_CHANNEL_END_ABILITY_5 = 1530,
    ACT_DOTA_CHANNEL_END_ABILITY_6 = 1531,
    ACT_DOTA_CONSTANT_LAYER = 1532,
    ACT_DOTA_CAPTURE = 1533,
    ACT_DOTA_SPAWN = 1534,
    ACT_DOTA_KILLTAUNT = 1535,
    ACT_DOTA_TAUNT = 1536,
    ACT_DOTA_THIRST = 1537,
    ACT_DOTA_CAST_DRAGONBREATH = 1538,
    ACT_DOTA_ECHO_SLAM = 1539,
    ACT_DOTA_CAST_ABILITY_1_END = 1540,
    ACT_DOTA_CAST_ABILITY_2_END = 1541,
    ACT_DOTA_CAST_ABILITY_3_END = 1542,
    ACT_DOTA_CAST_ABILITY_4_END = 1543,
    ACT_MIRANA_LEAP_END = 1544,
    ACT_WAVEFORM_START = 1545,
    ACT_WAVEFORM_END = 1546,
    ACT_DOTA_CAST_ABILITY_ROT = 1547,
    ACT_DOTA_DIE_SPECIAL = 1548,
    ACT_DOTA_RATTLETRAP_BATTERYASSAULT = 1549,
    ACT_DOTA_RATTLETRAP_POWERCOGS = 1550,
    ACT_DOTA_RATTLETRAP_HOOKSHOT_START = 1551,
    ACT_DOTA_RATTLETRAP_HOOKSHOT_LOOP = 1552,
    ACT_DOTA_RATTLETRAP_HOOKSHOT_END = 1553,
    ACT_STORM_SPIRIT_OVERLOAD_RUN_OVERRIDE = 1554,
    ACT_DOTA_TINKER_REARM1 = 1555,
    ACT_DOTA_TINKER_REARM2 = 1556,
    ACT_DOTA_TINKER_REARM3 = 1557,
    ACT_TINY_AVALANCHE = 1558,
    ACT_TINY_TOSS = 1559,
    ACT_TINY_GROWL = 1560,
    ACT_DOTA_WEAVERBUG_ATTACH = 1561,
    ACT_DOTA_CAST_WILD_AXES_END = 1562,
    ACT_DOTA_CAST_LIFE_BREAK_START = 1563,
    ACT_DOTA_CAST_LIFE_BREAK_END = 1564,
    ACT_DOTA_NIGHTSTALKER_TRANSITION = 1565,
    ACT_DOTA_LIFESTEALER_RAGE = 1566,
    ACT_DOTA_LIFESTEALER_OPEN_WOUNDS = 1567,
    ACT_DOTA_SAND_KING_BURROW_IN = 1568,
    ACT_DOTA_SAND_KING_BURROW_OUT = 1569,
    ACT_DOTA_EARTHSHAKER_TOTEM_ATTACK = 1570,
    ACT_DOTA_WHEEL_LAYER = 1571,
    ACT_DOTA_ALCHEMIST_CHEMICAL_RAGE_START = 1572,
    ACT_DOTA_ALCHEMIST_CONCOCTION = 1573,
    ACT_DOTA_JAKIRO_LIQUIDFIRE_START = 1574,
    ACT_DOTA_JAKIRO_LIQUIDFIRE_LOOP = 1575,
    ACT_DOTA_LIFESTEALER_INFEST = 1576,
    ACT_DOTA_LIFESTEALER_INFEST_END = 1577,
    ACT_DOTA_LASSO_LOOP = 1578,
    ACT_DOTA_ALCHEMIST_CONCOCTION_THROW = 1579,
    ACT_DOTA_ALCHEMIST_CHEMICAL_RAGE_END = 1580,
    ACT_DOTA_CAST_COLD_SNAP = 1581,
    ACT_DOTA_CAST_GHOST_WALK = 1582,
    ACT_DOTA_CAST_TORNADO = 1583,
    ACT_DOTA_CAST_EMP = 1584,
    ACT_DOTA_CAST_ALACRITY = 1585,
    ACT_DOTA_CAST_CHAOS_METEOR = 1586,
    ACT_DOTA_CAST_SUN_STRIKE = 1587,
    ACT_DOTA_CAST_FORGE_SPIRIT = 1588,
    ACT_DOTA_CAST_ICE_WALL = 1589,
    ACT_DOTA_CAST_DEAFENING_BLAST = 1590,
    ACT_DOTA_VICTORY = 1591,
    ACT_DOTA_DEFEAT = 1592,
    ACT_DOTA_SPIRIT_BREAKER_CHARGE_POSE = 1593,
    ACT_DOTA_SPIRIT_BREAKER_CHARGE_END = 1594,
    ACT_DOTA_TELEPORT = 1595,
    ACT_DOTA_TELEPORT_END = 1596,
    ACT_DOTA_CAST_REFRACTION = 1597,
    ACT_DOTA_CAST_ABILITY_7 = 1598,
    ACT_DOTA_CANCEL_SIREN_SONG = 1599,
    ACT_DOTA_CHANNEL_ABILITY_7 = 1600,
    ACT_DOTA_LOADOUT = 1601,
    ACT_DOTA_FORCESTAFF_END = 1602,
    ACT_DOTA_POOF_END = 1603,
    ACT_DOTA_SLARK_POUNCE = 1604,
    ACT_DOTA_MAGNUS_SKEWER_START = 1605,
    ACT_DOTA_MAGNUS_SKEWER_END = 1606,
    ACT_DOTA_MEDUSA_STONE_GAZE = 1607,
    ACT_DOTA_RELAX_START = 1608,
    ACT_DOTA_RELAX_LOOP = 1609,
    ACT_DOTA_RELAX_END = 1610,
    ACT_DOTA_CENTAUR_STAMPEDE = 1611,
    ACT_DOTA_BELLYACHE_START = 1612,
    ACT_DOTA_BELLYACHE_LOOP = 1613,
    ACT_DOTA_BELLYACHE_END = 1614,
    ACT_DOTA_ROQUELAIRE_LAND = 1615,
    ACT_DOTA_ROQUELAIRE_LAND_IDLE = 1616,
    ACT_DOTA_GREEVIL_CAST = 1617,
    ACT_DOTA_GREEVIL_OVERRIDE_ABILITY = 1618,
    ACT_DOTA_GREEVIL_HOOK_START = 1619,
    ACT_DOTA_GREEVIL_HOOK_END = 1620,
    ACT_DOTA_GREEVIL_BLINK_BONE = 1621,
    ACT_DOTA_IDLE_SLEEPING = 1622,
    ACT_DOTA_INTRO = 1623,
    ACT_DOTA_GESTURE_POINT = 1624,
    ACT_DOTA_GESTURE_ACCENT = 1625,
    ACT_DOTA_SLEEPING_END = 1626,
    ACT_DOTA_AMBUSH = 1627,
    ACT_DOTA_ITEM_LOOK = 1628,
    ACT_DOTA_STARTLE = 1629,
    ACT_DOTA_FRUSTRATION = 1630,
    ACT_DOTA_TELEPORT_REACT = 1631,
    ACT_DOTA_TELEPORT_END_REACT = 1632,
    ACT_DOTA_SHRUG = 1633,
    ACT_DOTA_RELAX_LOOP_END = 1634,
    ACT_DOTA_PRESENT_ITEM = 1635,
    ACT_DOTA_IDLE_IMPATIENT = 1636,
    ACT_DOTA_SHARPEN_WEAPON = 1637,
    ACT_DOTA_SHARPEN_WEAPON_OUT = 1638,
    ACT_DOTA_IDLE_SLEEPING_END = 1639,
    ACT_DOTA_BRIDGE_DESTROY = 1640,
    ACT_DOTA_TAUNT_SNIPER = 1641,
    ACT_DOTA_DEATH_BY_SNIPER = 1642,
    ACT_DOTA_LOOK_AROUND = 1643,
    ACT_DOTA_CAGED_CREEP_RAGE = 1644,
    ACT_DOTA_CAGED_CREEP_RAGE_OUT = 1645,
    ACT_DOTA_CAGED_CREEP_SMASH = 1646,
    ACT_DOTA_CAGED_CREEP_SMASH_OUT = 1647,
    ACT_DOTA_IDLE_IMPATIENT_SWORD_TAP = 1648,
    ACT_DOTA_INTRO_LOOP = 1649,
    ACT_DOTA_BRIDGE_THREAT = 1650,
    ACT_DOTA_DAGON = 1651,
    ACT_DOTA_CAST_ABILITY_2_ES_ROLL_START = 1652,
    ACT_DOTA_CAST_ABILITY_2_ES_ROLL = 1653,
    ACT_DOTA_CAST_ABILITY_2_ES_ROLL_END = 1654,
    ACT_DOTA_NIAN_PIN_START = 1655,
    ACT_DOTA_NIAN_PIN_LOOP = 1656,
    ACT_DOTA_NIAN_PIN_END = 1657,
    ACT_DOTA_LEAP_STUN = 1658,
    ACT_DOTA_LEAP_SWIPE = 1659,
    ACT_DOTA_NIAN_INTRO_LEAP = 1660,
    ACT_DOTA_AREA_DENY = 1661,
    ACT_DOTA_NIAN_PIN_TO_STUN = 1662,
    ACT_DOTA_RAZE_1 = 1663,
    ACT_DOTA_RAZE_2 = 1664,
    ACT_DOTA_RAZE_3 = 1665,
    ACT_DOTA_UNDYING_DECAY = 1666,
    ACT_DOTA_UNDYING_SOUL_RIP = 1667,
    ACT_DOTA_UNDYING_TOMBSTONE = 1668,
    ACT_DOTA_WHIRLING_AXES_RANGED = 1669,
    ACT_DOTA_SHALLOW_GRAVE = 1670,
    ACT_DOTA_COLD_FEET = 1671,
    ACT_DOTA_ICE_VORTEX = 1672,
    ACT_DOTA_CHILLING_TOUCH = 1673,
    ACT_DOTA_ENFEEBLE = 1674,
    ACT_DOTA_FATAL_BONDS = 1675,
    ACT_DOTA_MIDNIGHT_PULSE = 1676,
    ACT_DOTA_ANCESTRAL_SPIRIT = 1677,
    ACT_DOTA_THUNDER_STRIKE = 1678,
    ACT_DOTA_KINETIC_FIELD = 1679,
    ACT_DOTA_STATIC_STORM = 1680,
    ACT_DOTA_MINI_TAUNT = 1681,
    ACT_DOTA_ARCTIC_BURN_END = 1682,
    ACT_DOTA_LOADOUT_RARE = 1683,
    ACT_DOTA_SWIM = 1684,
    ACT_DOTA_FLEE = 1685,
    ACT_DOTA_TROT = 1686,
    ACT_DOTA_SHAKE = 1687,
    ACT_DOTA_SWIM_IDLE = 1688,
    ACT_DOTA_WAIT_IDLE = 1689,
    ACT_DOTA_GREET = 1690,
    ACT_DOTA_TELEPORT_COOP_START = 1691,
    ACT_DOTA_TELEPORT_COOP_WAIT = 1692,
    ACT_DOTA_TELEPORT_COOP_END = 1693,
    ACT_DOTA_TELEPORT_COOP_EXIT = 1694,
    ACT_DOTA_SHOPKEEPER_PET_INTERACT = 1695,
    ACT_DOTA_ITEM_PICKUP = 1696,
    ACT_DOTA_ITEM_DROP = 1697,
    ACT_DOTA_CAPTURE_PET = 1698,
    ACT_DOTA_PET_WARD_OBSERVER = 1699,
    ACT_DOTA_PET_WARD_SENTRY = 1700,
    ACT_DOTA_PET_LEVEL = 1701,
    ACT_DOTA_CAST_BURROW_END = 1702,
    ACT_DOTA_LIFESTEALER_ASSIMILATE = 1703,
    ACT_DOTA_LIFESTEALER_EJECT = 1704,
    ACT_DOTA_ATTACK_EVENT_BASH = 1705,
    ACT_DOTA_CAPTURE_RARE = 1706,
    ACT_DOTA_AW_MAGNETIC_FIELD = 1707,
    ACT_DOTA_CAST_GHOST_SHIP = 1708,
    ACT_DOTA_FXANIM = 1709,
    ACT_DOTA_VICTORY_START = 1710,
    ACT_DOTA_DEFEAT_START = 1711,
    ACT_DOTA_DP_SPIRIT_SIPHON = 1712,
    ACT_DOTA_TRICKS_END = 1713,
    ACT_DOTA_ES_STONE_CALLER = 1714,
    ACT_DOTA_MK_STRIKE = 1715,
    ACT_DOTA_VERSUS = 1716,
    ACT_DOTA_CAPTURE_CARD = 1717,
    ACT_DOTA_MK_SPRING_SOAR = 1718,
    ACT_DOTA_MK_SPRING_END = 1719,
    ACT_DOTA_MK_TREE_SOAR = 1720,
    ACT_DOTA_MK_TREE_END = 1721,
    ACT_DOTA_MK_FUR_ARMY = 1722,
    ACT_DOTA_MK_SPRING_CAST = 1723,
    ACT_DOTA_NECRO_GHOST_SHROUD = 1724,
    ACT_DOTA_OVERRIDE_ARCANA = 1725,
    ACT_DOTA_SLIDE = 1726,
    ACT_DOTA_SLIDE_LOOP = 1727,
    ACT_DOTA_GENERIC_CHANNEL_1 = 1728
}
declare enum LuaModifierType {
    LUA_MODIFIER_MOTION_NONE = 0,
    LUA_MODIFIER_MOTION_HORIZONTAL = 1,
    LUA_MODIFIER_MOTION_VERTICAL = 2,
    LUA_MODIFIER_MOTION_BOTH = 3,
    LUA_MODIFIER_INVALID = 4
}
declare enum ParticleAttachment_t {
    PATTACH_INVALID = -1,
    PATTACH_ABSORIGIN = 0,
    PATTACH_ABSORIGIN_FOLLOW = 1,
    PATTACH_CUSTOMORIGIN = 2,
    PATTACH_CUSTOMORIGIN_FOLLOW = 3,
    PATTACH_POINT = 4,
    PATTACH_POINT_FOLLOW = 5,
    PATTACH_EYES_FOLLOW = 6,
    PATTACH_OVERHEAD_FOLLOW = 7,
    PATTACH_WORLDORIGIN = 8,
    PATTACH_ROOTBONE_FOLLOW = 9,
    PATTACH_RENDERORIGIN_FOLLOW = 10,
    PATTACH_MAIN_VIEW = 11,
    PATTACH_WATERWAKE = 12,
    PATTACH_CENTER_FOLLOW = 13,
    MAX_PATTACH_TYPES = 14
}
declare enum UnitFilterResult {
    UF_SUCCESS = 0,
    UF_FAIL_FRIENDLY = 1,
    UF_FAIL_ENEMY = 2,
    UF_FAIL_HERO = 3,
    UF_FAIL_CONSIDERED_HERO = 4,
    UF_FAIL_CREEP = 5,
    UF_FAIL_BUILDING = 6,
    UF_FAIL_COURIER = 7,
    UF_FAIL_OTHER = 8,
    UF_FAIL_ANCIENT = 9,
    UF_FAIL_ILLUSION = 10,
    UF_FAIL_SUMMONED = 11,
    UF_FAIL_DOMINATED = 12,
    UF_FAIL_MELEE = 13,
    UF_FAIL_RANGED = 14,
    UF_FAIL_DEAD = 15,
    UF_FAIL_MAGIC_IMMUNE_ALLY = 16,
    UF_FAIL_MAGIC_IMMUNE_ENEMY = 17,
    UF_FAIL_INVULNERABLE = 18,
    UF_FAIL_IN_FOW = 19,
    UF_FAIL_INVISIBLE = 20,
    UF_FAIL_NOT_PLAYER_CONTROLLED = 21,
    UF_FAIL_ATTACK_IMMUNE = 22,
    UF_FAIL_CUSTOM = 23,
    UF_FAIL_INVALID_LOCATION = 24,
    UF_FAIL_DISABLE_HELP = 25,
    UF_FAIL_OUT_OF_WORLD = 26,
    UF_FAIL_NIGHTMARED = 27,
    UF_FAIL_OBSTRUCTED = 28
}
declare var ACT_RESET: number;
declare var ACT_IDLE: number;
declare var ACT_TRANSITION: number;
declare var ACT_COVER: number;
declare var ACT_COVER_MED: number;
declare var ACT_COVER_LOW: number;
declare var ACT_WALK: number;
declare var ACT_WALK_AIM: number;
declare var ACT_WALK_CROUCH: number;
declare var ACT_WALK_CROUCH_AIM: number;
declare var ACT_RUN: number;
declare var ACT_RUN_AIM: number;
declare var ACT_RUN_CROUCH: number;
declare var ACT_RUN_CROUCH_AIM: number;
declare var ACT_RUN_PROTECTED: number;
declare var ACT_SCRIPT_CUSTOM_MOVE: number;
declare var ACT_RANGE_ATTACK1: number;
declare var ACT_RANGE_ATTACK2: number;
declare var ACT_RANGE_ATTACK1_LOW: number;
declare var ACT_RANGE_ATTACK2_LOW: number;
declare var ACT_DIESIMPLE: number;
declare var ACT_DIEBACKWARD: number;
declare var ACT_DIEFORWARD: number;
declare var ACT_DIEVIOLENT: number;
declare var ACT_DIERAGDOLL: number;
declare var ACT_FLY: number;
declare var ACT_HOVER: number;
declare var ACT_GLIDE: number;
declare var ACT_SWIM: number;
declare var ACT_JUMP: number;
declare var ACT_HOP: number;
declare var ACT_LEAP: number;
declare var ACT_LAND: number;
declare var ACT_CLIMB_UP: number;
declare var ACT_CLIMB_DOWN: number;
declare var ACT_CLIMB_DISMOUNT: number;
declare var ACT_SHIPLADDER_UP: number;
declare var ACT_SHIPLADDER_DOWN: number;
declare var ACT_STRAFE_LEFT: number;
declare var ACT_STRAFE_RIGHT: number;
declare var ACT_ROLL_LEFT: number;
declare var ACT_ROLL_RIGHT: number;
declare var ACT_TURN_LEFT: number;
declare var ACT_TURN_RIGHT: number;
declare var ACT_CROUCH: number;
declare var ACT_CROUCHIDLE: number;
declare var ACT_STAND: number;
declare var ACT_USE: number;
declare var ACT_ALIEN_BURROW_IDLE: number;
declare var ACT_ALIEN_BURROW_OUT: number;
declare var ACT_SIGNAL1: number;
declare var ACT_SIGNAL2: number;
declare var ACT_SIGNAL3: number;
declare var ACT_SIGNAL_ADVANCE: number;
declare var ACT_SIGNAL_FORWARD: number;
declare var ACT_SIGNAL_GROUP: number;
declare var ACT_SIGNAL_HALT: number;
declare var ACT_SIGNAL_LEFT: number;
declare var ACT_SIGNAL_RIGHT: number;
declare var ACT_SIGNAL_TAKECOVER: number;
declare var ACT_LOOKBACK_RIGHT: number;
declare var ACT_LOOKBACK_LEFT: number;
declare var ACT_COWER: number;
declare var ACT_SMALL_FLINCH: number;
declare var ACT_BIG_FLINCH: number;
declare var ACT_MELEE_ATTACK1: number;
declare var ACT_MELEE_ATTACK2: number;
declare var ACT_RELOAD: number;
declare var ACT_RELOAD_START: number;
declare var ACT_RELOAD_FINISH: number;
declare var ACT_RELOAD_LOW: number;
declare var ACT_ARM: number;
declare var ACT_DISARM: number;
declare var ACT_DROP_WEAPON: number;
declare var ACT_DROP_WEAPON_SHOTGUN: number;
declare var ACT_PICKUP_GROUND: number;
declare var ACT_PICKUP_RACK: number;
declare var ACT_IDLE_ANGRY: number;
declare var ACT_IDLE_RELAXED: number;
declare var ACT_IDLE_STIMULATED: number;
declare var ACT_IDLE_AGITATED: number;
declare var ACT_IDLE_STEALTH: number;
declare var ACT_IDLE_HURT: number;
declare var ACT_WALK_RELAXED: number;
declare var ACT_WALK_STIMULATED: number;
declare var ACT_WALK_AGITATED: number;
declare var ACT_WALK_STEALTH: number;
declare var ACT_RUN_RELAXED: number;
declare var ACT_RUN_STIMULATED: number;
declare var ACT_RUN_AGITATED: number;
declare var ACT_RUN_STEALTH: number;
declare var ACT_IDLE_AIM_RELAXED: number;
declare var ACT_IDLE_AIM_STIMULATED: number;
declare var ACT_IDLE_AIM_AGITATED: number;
declare var ACT_IDLE_AIM_STEALTH: number;
declare var ACT_WALK_AIM_RELAXED: number;
declare var ACT_WALK_AIM_STIMULATED: number;
declare var ACT_WALK_AIM_AGITATED: number;
declare var ACT_WALK_AIM_STEALTH: number;
declare var ACT_RUN_AIM_RELAXED: number;
declare var ACT_RUN_AIM_STIMULATED: number;
declare var ACT_RUN_AIM_AGITATED: number;
declare var ACT_RUN_AIM_STEALTH: number;
declare var ACT_CROUCHIDLE_STIMULATED: number;
declare var ACT_CROUCHIDLE_AIM_STIMULATED: number;
declare var ACT_CROUCHIDLE_AGITATED: number;
declare var ACT_WALK_HURT: number;
declare var ACT_RUN_HURT: number;
declare var ACT_SPECIAL_ATTACK1: number;
declare var ACT_SPECIAL_ATTACK2: number;
declare var ACT_COMBAT_IDLE: number;
declare var ACT_WALK_SCARED: number;
declare var ACT_RUN_SCARED: number;
declare var ACT_VICTORY_DANCE: number;
declare var ACT_DIE_HEADSHOT: number;
declare var ACT_DIE_CHESTSHOT: number;
declare var ACT_DIE_GUTSHOT: number;
declare var ACT_DIE_BACKSHOT: number;
declare var ACT_FLINCH_HEAD: number;
declare var ACT_FLINCH_CHEST: number;
declare var ACT_FLINCH_STOMACH: number;
declare var ACT_FLINCH_LEFTARM: number;
declare var ACT_FLINCH_RIGHTARM: number;
declare var ACT_FLINCH_LEFTLEG: number;
declare var ACT_FLINCH_RIGHTLEG: number;
declare var ACT_FLINCH_PHYSICS: number;
declare var ACT_FLINCH_HEAD_BACK: number;
declare var ACT_FLINCH_CHEST_BACK: number;
declare var ACT_FLINCH_STOMACH_BACK: number;
declare var ACT_FLINCH_CROUCH_FRONT: number;
declare var ACT_FLINCH_CROUCH_BACK: number;
declare var ACT_FLINCH_CROUCH_LEFT: number;
declare var ACT_FLINCH_CROUCH_RIGHT: number;
declare var ACT_IDLE_ON_FIRE: number;
declare var ACT_WALK_ON_FIRE: number;
declare var ACT_RUN_ON_FIRE: number;
declare var ACT_RAPPEL_LOOP: number;
declare var ACT_180_LEFT: number;
declare var ACT_180_RIGHT: number;
declare var ACT_90_LEFT: number;
declare var ACT_90_RIGHT: number;
declare var ACT_STEP_LEFT: number;
declare var ACT_STEP_RIGHT: number;
declare var ACT_STEP_BACK: number;
declare var ACT_STEP_FORE: number;
declare var ACT_GESTURE_RANGE_ATTACK1: number;
declare var ACT_GESTURE_RANGE_ATTACK2: number;
declare var ACT_GESTURE_MELEE_ATTACK1: number;
declare var ACT_GESTURE_MELEE_ATTACK2: number;
declare var ACT_GESTURE_RANGE_ATTACK1_LOW: number;
declare var ACT_GESTURE_RANGE_ATTACK2_LOW: number;
declare var ACT_MELEE_ATTACK_SWING_GESTURE: number;
declare var ACT_GESTURE_SMALL_FLINCH: number;
declare var ACT_GESTURE_BIG_FLINCH: number;
declare var ACT_GESTURE_FLINCH_BLAST: number;
declare var ACT_GESTURE_FLINCH_BLAST_SHOTGUN: number;
declare var ACT_GESTURE_FLINCH_BLAST_DAMAGED: number;
declare var ACT_GESTURE_FLINCH_BLAST_DAMAGED_SHOTGUN: number;
declare var ACT_GESTURE_FLINCH_HEAD: number;
declare var ACT_GESTURE_FLINCH_CHEST: number;
declare var ACT_GESTURE_FLINCH_STOMACH: number;
declare var ACT_GESTURE_FLINCH_LEFTARM: number;
declare var ACT_GESTURE_FLINCH_RIGHTARM: number;
declare var ACT_GESTURE_FLINCH_LEFTLEG: number;
declare var ACT_GESTURE_FLINCH_RIGHTLEG: number;
declare var ACT_GESTURE_TURN_LEFT: number;
declare var ACT_GESTURE_TURN_RIGHT: number;
declare var ACT_GESTURE_TURN_LEFT45: number;
declare var ACT_GESTURE_TURN_RIGHT45: number;
declare var ACT_GESTURE_TURN_LEFT90: number;
declare var ACT_GESTURE_TURN_RIGHT90: number;
declare var ACT_GESTURE_TURN_LEFT45_FLAT: number;
declare var ACT_GESTURE_TURN_RIGHT45_FLAT: number;
declare var ACT_GESTURE_TURN_LEFT90_FLAT: number;
declare var ACT_GESTURE_TURN_RIGHT90_FLAT: number;
declare var ACT_BARNACLE_HIT: number;
declare var ACT_BARNACLE_PULL: number;
declare var ACT_BARNACLE_CHOMP: number;
declare var ACT_BARNACLE_CHEW: number;
declare var ACT_DO_NOT_DISTURB: number;
declare var ACT_SPECIFIC_SEQUENCE: number;
declare var ACT_VM_DEPLOY: number;
declare var ACT_VM_RELOAD_EMPTY: number;
declare var ACT_VM_DRAW: number;
declare var ACT_VM_HOLSTER: number;
declare var ACT_VM_IDLE: number;
declare var ACT_VM_FIDGET: number;
declare var ACT_VM_PULLBACK: number;
declare var ACT_VM_PULLBACK_HIGH: number;
declare var ACT_VM_PULLBACK_LOW: number;
declare var ACT_VM_THROW: number;
declare var ACT_VM_DROP: number;
declare var ACT_VM_PULLPIN: number;
declare var ACT_VM_PRIMARYATTACK: number;
declare var ACT_VM_SECONDARYATTACK: number;
declare var ACT_VM_RELOAD: number;
declare var ACT_VM_DRYFIRE: number;
declare var ACT_VM_HITLEFT: number;
declare var ACT_VM_HITLEFT2: number;
declare var ACT_VM_HITRIGHT: number;
declare var ACT_VM_HITRIGHT2: number;
declare var ACT_VM_HITCENTER: number;
declare var ACT_VM_HITCENTER2: number;
declare var ACT_VM_MISSLEFT: number;
declare var ACT_VM_MISSLEFT2: number;
declare var ACT_VM_MISSRIGHT: number;
declare var ACT_VM_MISSRIGHT2: number;
declare var ACT_VM_MISSCENTER: number;
declare var ACT_VM_MISSCENTER2: number;
declare var ACT_VM_HAULBACK: number;
declare var ACT_VM_SWINGHARD: number;
declare var ACT_VM_SWINGMISS: number;
declare var ACT_VM_SWINGHIT: number;
declare var ACT_VM_IDLE_TO_LOWERED: number;
declare var ACT_VM_IDLE_LOWERED: number;
declare var ACT_VM_LOWERED_TO_IDLE: number;
declare var ACT_VM_RECOIL1: number;
declare var ACT_VM_RECOIL2: number;
declare var ACT_VM_RECOIL3: number;
declare var ACT_VM_PICKUP: number;
declare var ACT_VM_RELEASE: number;
declare var ACT_VM_MAUL_LOOP: number;
declare var ACT_VM_ATTACH_SILENCER: number;
declare var ACT_VM_DETACH_SILENCER: number;
declare var ACT_SLAM_STICKWALL_IDLE: number;
declare var ACT_SLAM_STICKWALL_ND_IDLE: number;
declare var ACT_SLAM_STICKWALL_ATTACH: number;
declare var ACT_SLAM_STICKWALL_ATTACH2: number;
declare var ACT_SLAM_STICKWALL_ND_ATTACH: number;
declare var ACT_SLAM_STICKWALL_ND_ATTACH2: number;
declare var ACT_SLAM_STICKWALL_DETONATE: number;
declare var ACT_SLAM_STICKWALL_DETONATOR_HOLSTER: number;
declare var ACT_SLAM_STICKWALL_DRAW: number;
declare var ACT_SLAM_STICKWALL_ND_DRAW: number;
declare var ACT_SLAM_STICKWALL_TO_THROW: number;
declare var ACT_SLAM_STICKWALL_TO_THROW_ND: number;
declare var ACT_SLAM_STICKWALL_TO_TRIPMINE_ND: number;
declare var ACT_SLAM_THROW_IDLE: number;
declare var ACT_SLAM_THROW_ND_IDLE: number;
declare var ACT_SLAM_THROW_THROW: number;
declare var ACT_SLAM_THROW_THROW2: number;
declare var ACT_SLAM_THROW_THROW_ND: number;
declare var ACT_SLAM_THROW_THROW_ND2: number;
declare var ACT_SLAM_THROW_DRAW: number;
declare var ACT_SLAM_THROW_ND_DRAW: number;
declare var ACT_SLAM_THROW_TO_STICKWALL: number;
declare var ACT_SLAM_THROW_TO_STICKWALL_ND: number;
declare var ACT_SLAM_THROW_DETONATE: number;
declare var ACT_SLAM_THROW_DETONATOR_HOLSTER: number;
declare var ACT_SLAM_THROW_TO_TRIPMINE_ND: number;
declare var ACT_SLAM_TRIPMINE_IDLE: number;
declare var ACT_SLAM_TRIPMINE_DRAW: number;
declare var ACT_SLAM_TRIPMINE_ATTACH: number;
declare var ACT_SLAM_TRIPMINE_ATTACH2: number;
declare var ACT_SLAM_TRIPMINE_TO_STICKWALL_ND: number;
declare var ACT_SLAM_TRIPMINE_TO_THROW_ND: number;
declare var ACT_SLAM_DETONATOR_IDLE: number;
declare var ACT_SLAM_DETONATOR_DRAW: number;
declare var ACT_SLAM_DETONATOR_DETONATE: number;
declare var ACT_SLAM_DETONATOR_HOLSTER: number;
declare var ACT_SLAM_DETONATOR_STICKWALL_DRAW: number;
declare var ACT_SLAM_DETONATOR_THROW_DRAW: number;
declare var ACT_SHOTGUN_RELOAD_START: number;
declare var ACT_SHOTGUN_RELOAD_FINISH: number;
declare var ACT_SHOTGUN_PUMP: number;
declare var ACT_SMG2_IDLE2: number;
declare var ACT_SMG2_FIRE2: number;
declare var ACT_SMG2_DRAW2: number;
declare var ACT_SMG2_RELOAD2: number;
declare var ACT_SMG2_DRYFIRE2: number;
declare var ACT_SMG2_TOAUTO: number;
declare var ACT_SMG2_TOBURST: number;
declare var ACT_PHYSCANNON_UPGRADE: number;
declare var ACT_RANGE_ATTACK_AR1: number;
declare var ACT_RANGE_ATTACK_AR2: number;
declare var ACT_RANGE_ATTACK_AR2_LOW: number;
declare var ACT_RANGE_ATTACK_AR2_GRENADE: number;
declare var ACT_RANGE_ATTACK_HMG1: number;
declare var ACT_RANGE_ATTACK_ML: number;
declare var ACT_RANGE_ATTACK_SMG1: number;
declare var ACT_RANGE_ATTACK_SMG1_LOW: number;
declare var ACT_RANGE_ATTACK_SMG2: number;
declare var ACT_RANGE_ATTACK_SHOTGUN: number;
declare var ACT_RANGE_ATTACK_SHOTGUN_LOW: number;
declare var ACT_RANGE_ATTACK_PISTOL: number;
declare var ACT_RANGE_ATTACK_PISTOL_LOW: number;
declare var ACT_RANGE_ATTACK_SLAM: number;
declare var ACT_RANGE_ATTACK_TRIPWIRE: number;
declare var ACT_RANGE_ATTACK_THROW: number;
declare var ACT_RANGE_ATTACK_SNIPER_RIFLE: number;
declare var ACT_RANGE_ATTACK_RPG: number;
declare var ACT_MELEE_ATTACK_SWING: number;
declare var ACT_RANGE_AIM_LOW: number;
declare var ACT_RANGE_AIM_SMG1_LOW: number;
declare var ACT_RANGE_AIM_PISTOL_LOW: number;
declare var ACT_RANGE_AIM_AR2_LOW: number;
declare var ACT_COVER_PISTOL_LOW: number;
declare var ACT_COVER_SMG1_LOW: number;
declare var ACT_GESTURE_RANGE_ATTACK_AR1: number;
declare var ACT_GESTURE_RANGE_ATTACK_AR2: number;
declare var ACT_GESTURE_RANGE_ATTACK_AR2_GRENADE: number;
declare var ACT_GESTURE_RANGE_ATTACK_HMG1: number;
declare var ACT_GESTURE_RANGE_ATTACK_ML: number;
declare var ACT_GESTURE_RANGE_ATTACK_SMG1: number;
declare var ACT_GESTURE_RANGE_ATTACK_SMG1_LOW: number;
declare var ACT_GESTURE_RANGE_ATTACK_SMG2: number;
declare var ACT_GESTURE_RANGE_ATTACK_SHOTGUN: number;
declare var ACT_GESTURE_RANGE_ATTACK_PISTOL: number;
declare var ACT_GESTURE_RANGE_ATTACK_PISTOL_LOW: number;
declare var ACT_GESTURE_RANGE_ATTACK_SLAM: number;
declare var ACT_GESTURE_RANGE_ATTACK_TRIPWIRE: number;
declare var ACT_GESTURE_RANGE_ATTACK_THROW: number;
declare var ACT_GESTURE_RANGE_ATTACK_SNIPER_RIFLE: number;
declare var ACT_GESTURE_MELEE_ATTACK_SWING: number;
declare var ACT_IDLE_RIFLE: number;
declare var ACT_IDLE_SMG1: number;
declare var ACT_IDLE_ANGRY_SMG1: number;
declare var ACT_IDLE_PISTOL: number;
declare var ACT_IDLE_ANGRY_PISTOL: number;
declare var ACT_IDLE_ANGRY_SHOTGUN: number;
declare var ACT_IDLE_STEALTH_PISTOL: number;
declare var ACT_IDLE_PACKAGE: number;
declare var ACT_WALK_PACKAGE: number;
declare var ACT_IDLE_SUITCASE: number;
declare var ACT_WALK_SUITCASE: number;
declare var ACT_IDLE_SMG1_RELAXED: number;
declare var ACT_IDLE_SMG1_STIMULATED: number;
declare var ACT_WALK_RIFLE_RELAXED: number;
declare var ACT_RUN_RIFLE_RELAXED: number;
declare var ACT_WALK_RIFLE_STIMULATED: number;
declare var ACT_RUN_RIFLE_STIMULATED: number;
declare var ACT_IDLE_AIM_RIFLE_STIMULATED: number;
declare var ACT_WALK_AIM_RIFLE_STIMULATED: number;
declare var ACT_RUN_AIM_RIFLE_STIMULATED: number;
declare var ACT_IDLE_SHOTGUN_RELAXED: number;
declare var ACT_IDLE_SHOTGUN_STIMULATED: number;
declare var ACT_IDLE_SHOTGUN_AGITATED: number;
declare var ACT_WALK_ANGRY: number;
declare var ACT_POLICE_HARASS1: number;
declare var ACT_POLICE_HARASS2: number;
declare var ACT_IDLE_MANNEDGUN: number;
declare var ACT_IDLE_MELEE: number;
declare var ACT_IDLE_ANGRY_MELEE: number;
declare var ACT_IDLE_RPG_RELAXED: number;
declare var ACT_IDLE_RPG: number;
declare var ACT_IDLE_ANGRY_RPG: number;
declare var ACT_COVER_LOW_RPG: number;
declare var ACT_WALK_RPG: number;
declare var ACT_RUN_RPG: number;
declare var ACT_WALK_CROUCH_RPG: number;
declare var ACT_RUN_CROUCH_RPG: number;
declare var ACT_WALK_RPG_RELAXED: number;
declare var ACT_RUN_RPG_RELAXED: number;
declare var ACT_WALK_RIFLE: number;
declare var ACT_WALK_AIM_RIFLE: number;
declare var ACT_WALK_CROUCH_RIFLE: number;
declare var ACT_WALK_CROUCH_AIM_RIFLE: number;
declare var ACT_RUN_RIFLE: number;
declare var ACT_RUN_AIM_RIFLE: number;
declare var ACT_RUN_CROUCH_RIFLE: number;
declare var ACT_RUN_CROUCH_AIM_RIFLE: number;
declare var ACT_RUN_STEALTH_PISTOL: number;
declare var ACT_WALK_AIM_SHOTGUN: number;
declare var ACT_RUN_AIM_SHOTGUN: number;
declare var ACT_WALK_PISTOL: number;
declare var ACT_RUN_PISTOL: number;
declare var ACT_WALK_AIM_PISTOL: number;
declare var ACT_RUN_AIM_PISTOL: number;
declare var ACT_WALK_STEALTH_PISTOL: number;
declare var ACT_WALK_AIM_STEALTH_PISTOL: number;
declare var ACT_RUN_AIM_STEALTH_PISTOL: number;
declare var ACT_RELOAD_PISTOL: number;
declare var ACT_RELOAD_PISTOL_LOW: number;
declare var ACT_RELOAD_SMG1: number;
declare var ACT_RELOAD_SMG1_LOW: number;
declare var ACT_RELOAD_SHOTGUN: number;
declare var ACT_RELOAD_SHOTGUN_LOW: number;
declare var ACT_GESTURE_RELOAD: number;
declare var ACT_GESTURE_RELOAD_PISTOL: number;
declare var ACT_GESTURE_RELOAD_SMG1: number;
declare var ACT_GESTURE_RELOAD_SHOTGUN: number;
declare var ACT_BUSY_LEAN_LEFT: number;
declare var ACT_BUSY_LEAN_LEFT_ENTRY: number;
declare var ACT_BUSY_LEAN_LEFT_EXIT: number;
declare var ACT_BUSY_LEAN_BACK: number;
declare var ACT_BUSY_LEAN_BACK_ENTRY: number;
declare var ACT_BUSY_LEAN_BACK_EXIT: number;
declare var ACT_BUSY_SIT_GROUND: number;
declare var ACT_BUSY_SIT_GROUND_ENTRY: number;
declare var ACT_BUSY_SIT_GROUND_EXIT: number;
declare var ACT_BUSY_SIT_CHAIR: number;
declare var ACT_BUSY_SIT_CHAIR_ENTRY: number;
declare var ACT_BUSY_SIT_CHAIR_EXIT: number;
declare var ACT_BUSY_STAND: number;
declare var ACT_BUSY_QUEUE: number;
declare var ACT_DUCK_DODGE: number;
declare var ACT_DIE_BARNACLE_SWALLOW: number;
declare var ACT_GESTURE_BARNACLE_STRANGLE: number;
declare var ACT_PHYSCANNON_DETACH: number;
declare var ACT_PHYSCANNON_ANIMATE: number;
declare var ACT_PHYSCANNON_ANIMATE_PRE: number;
declare var ACT_PHYSCANNON_ANIMATE_POST: number;
declare var ACT_DIE_FRONTSIDE: number;
declare var ACT_DIE_RIGHTSIDE: number;
declare var ACT_DIE_BACKSIDE: number;
declare var ACT_DIE_LEFTSIDE: number;
declare var ACT_DIE_CROUCH_FRONTSIDE: number;
declare var ACT_DIE_CROUCH_RIGHTSIDE: number;
declare var ACT_DIE_CROUCH_BACKSIDE: number;
declare var ACT_DIE_CROUCH_LEFTSIDE: number;
declare var ACT_DIE_INCAP: number;
declare var ACT_DIE_STANDING: number;
declare var ACT_OPEN_DOOR: number;
declare var ACT_DI_ALYX_ZOMBIE_MELEE: number;
declare var ACT_DI_ALYX_ZOMBIE_TORSO_MELEE: number;
declare var ACT_DI_ALYX_HEADCRAB_MELEE: number;
declare var ACT_DI_ALYX_ANTLION: number;
declare var ACT_DI_ALYX_ZOMBIE_SHOTGUN64: number;
declare var ACT_DI_ALYX_ZOMBIE_SHOTGUN26: number;
declare var ACT_READINESS_RELAXED_TO_STIMULATED: number;
declare var ACT_READINESS_RELAXED_TO_STIMULATED_WALK: number;
declare var ACT_READINESS_AGITATED_TO_STIMULATED: number;
declare var ACT_READINESS_STIMULATED_TO_RELAXED: number;
declare var ACT_READINESS_PISTOL_RELAXED_TO_STIMULATED: number;
declare var ACT_READINESS_PISTOL_RELAXED_TO_STIMULATED_WALK: number;
declare var ACT_READINESS_PISTOL_AGITATED_TO_STIMULATED: number;
declare var ACT_READINESS_PISTOL_STIMULATED_TO_RELAXED: number;
declare var ACT_IDLE_CARRY: number;
declare var ACT_WALK_CARRY: number;
declare var ACT_STARTDYING: number;
declare var ACT_DYINGLOOP: number;
declare var ACT_DYINGTODEAD: number;
declare var ACT_RIDE_MANNED_GUN: number;
declare var ACT_VM_SPRINT_ENTER: number;
declare var ACT_VM_SPRINT_IDLE: number;
declare var ACT_VM_SPRINT_LEAVE: number;
declare var ACT_FIRE_START: number;
declare var ACT_FIRE_LOOP: number;
declare var ACT_FIRE_END: number;
declare var ACT_CROUCHING_GRENADEIDLE: number;
declare var ACT_CROUCHING_GRENADEREADY: number;
declare var ACT_CROUCHING_PRIMARYATTACK: number;
declare var ACT_OVERLAY_GRENADEIDLE: number;
declare var ACT_OVERLAY_GRENADEREADY: number;
declare var ACT_OVERLAY_PRIMARYATTACK: number;
declare var ACT_OVERLAY_SHIELD_UP: number;
declare var ACT_OVERLAY_SHIELD_DOWN: number;
declare var ACT_OVERLAY_SHIELD_UP_IDLE: number;
declare var ACT_OVERLAY_SHIELD_ATTACK: number;
declare var ACT_OVERLAY_SHIELD_KNOCKBACK: number;
declare var ACT_SHIELD_UP: number;
declare var ACT_SHIELD_DOWN: number;
declare var ACT_SHIELD_UP_IDLE: number;
declare var ACT_SHIELD_ATTACK: number;
declare var ACT_SHIELD_KNOCKBACK: number;
declare var ACT_CROUCHING_SHIELD_UP: number;
declare var ACT_CROUCHING_SHIELD_DOWN: number;
declare var ACT_CROUCHING_SHIELD_UP_IDLE: number;
declare var ACT_CROUCHING_SHIELD_ATTACK: number;
declare var ACT_CROUCHING_SHIELD_KNOCKBACK: number;
declare var ACT_TURNRIGHT45: number;
declare var ACT_TURNLEFT45: number;
declare var ACT_TURN: number;
declare var ACT_OBJ_ASSEMBLING: number;
declare var ACT_OBJ_DISMANTLING: number;
declare var ACT_OBJ_STARTUP: number;
declare var ACT_OBJ_RUNNING: number;
declare var ACT_OBJ_IDLE: number;
declare var ACT_OBJ_PLACING: number;
declare var ACT_OBJ_DETERIORATING: number;
declare var ACT_OBJ_UPGRADING: number;
declare var ACT_DEPLOY: number;
declare var ACT_DEPLOY_IDLE: number;
declare var ACT_UNDEPLOY: number;
declare var ACT_CROSSBOW_DRAW_UNLOADED: number;
declare var ACT_GAUSS_SPINUP: number;
declare var ACT_GAUSS_SPINCYCLE: number;
declare var ACT_VM_PRIMARYATTACK_SILENCED: number;
declare var ACT_VM_RELOAD_SILENCED: number;
declare var ACT_VM_DRYFIRE_SILENCED: number;
declare var ACT_VM_IDLE_SILENCED: number;
declare var ACT_VM_DRAW_SILENCED: number;
declare var ACT_VM_IDLE_EMPTY_LEFT: number;
declare var ACT_VM_DRYFIRE_LEFT: number;
declare var ACT_VM_IS_DRAW: number;
declare var ACT_VM_IS_HOLSTER: number;
declare var ACT_VM_IS_IDLE: number;
declare var ACT_VM_IS_PRIMARYATTACK: number;
declare var ACT_PLAYER_IDLE_FIRE: number;
declare var ACT_PLAYER_CROUCH_FIRE: number;
declare var ACT_PLAYER_CROUCH_WALK_FIRE: number;
declare var ACT_PLAYER_WALK_FIRE: number;
declare var ACT_PLAYER_RUN_FIRE: number;
declare var ACT_IDLETORUN: number;
declare var ACT_RUNTOIDLE: number;
declare var ACT_VM_DRAW_DEPLOYED: number;
declare var ACT_HL2MP_IDLE_MELEE: number;
declare var ACT_HL2MP_RUN_MELEE: number;
declare var ACT_HL2MP_IDLE_CROUCH_MELEE: number;
declare var ACT_HL2MP_WALK_CROUCH_MELEE: number;
declare var ACT_HL2MP_GESTURE_RANGE_ATTACK_MELEE: number;
declare var ACT_HL2MP_GESTURE_RELOAD_MELEE: number;
declare var ACT_HL2MP_JUMP_MELEE: number;
declare var ACT_MP_STAND_IDLE: number;
declare var ACT_MP_CROUCH_IDLE: number;
declare var ACT_MP_CROUCH_DEPLOYED_IDLE: number;
declare var ACT_MP_CROUCH_DEPLOYED: number;
declare var ACT_MP_DEPLOYED_IDLE: number;
declare var ACT_MP_RUN: number;
declare var ACT_MP_WALK: number;
declare var ACT_MP_AIRWALK: number;
declare var ACT_MP_CROUCHWALK: number;
declare var ACT_MP_SPRINT: number;
declare var ACT_MP_JUMP: number;
declare var ACT_MP_JUMP_START: number;
declare var ACT_MP_JUMP_FLOAT: number;
declare var ACT_MP_JUMP_LAND: number;
declare var ACT_MP_DOUBLEJUMP: number;
declare var ACT_MP_SWIM: number;
declare var ACT_MP_DEPLOYED: number;
declare var ACT_MP_SWIM_DEPLOYED: number;
declare var ACT_MP_VCD: number;
declare var ACT_MP_ATTACK_STAND_PRIMARYFIRE: number;
declare var ACT_MP_ATTACK_STAND_PRIMARYFIRE_DEPLOYED: number;
declare var ACT_MP_ATTACK_STAND_SECONDARYFIRE: number;
declare var ACT_MP_ATTACK_STAND_GRENADE: number;
declare var ACT_MP_ATTACK_CROUCH_PRIMARYFIRE: number;
declare var ACT_MP_ATTACK_CROUCH_PRIMARYFIRE_DEPLOYED: number;
declare var ACT_MP_ATTACK_CROUCH_SECONDARYFIRE: number;
declare var ACT_MP_ATTACK_CROUCH_GRENADE: number;
declare var ACT_MP_ATTACK_SWIM_PRIMARYFIRE: number;
declare var ACT_MP_ATTACK_SWIM_SECONDARYFIRE: number;
declare var ACT_MP_ATTACK_SWIM_GRENADE: number;
declare var ACT_MP_ATTACK_AIRWALK_PRIMARYFIRE: number;
declare var ACT_MP_ATTACK_AIRWALK_SECONDARYFIRE: number;
declare var ACT_MP_ATTACK_AIRWALK_GRENADE: number;
declare var ACT_MP_RELOAD_STAND: number;
declare var ACT_MP_RELOAD_STAND_LOOP: number;
declare var ACT_MP_RELOAD_STAND_END: number;
declare var ACT_MP_RELOAD_CROUCH: number;
declare var ACT_MP_RELOAD_CROUCH_LOOP: number;
declare var ACT_MP_RELOAD_CROUCH_END: number;
declare var ACT_MP_RELOAD_SWIM: number;
declare var ACT_MP_RELOAD_SWIM_LOOP: number;
declare var ACT_MP_RELOAD_SWIM_END: number;
declare var ACT_MP_RELOAD_AIRWALK: number;
declare var ACT_MP_RELOAD_AIRWALK_LOOP: number;
declare var ACT_MP_RELOAD_AIRWALK_END: number;
declare var ACT_MP_ATTACK_STAND_PREFIRE: number;
declare var ACT_MP_ATTACK_STAND_POSTFIRE: number;
declare var ACT_MP_ATTACK_STAND_STARTFIRE: number;
declare var ACT_MP_ATTACK_CROUCH_PREFIRE: number;
declare var ACT_MP_ATTACK_CROUCH_POSTFIRE: number;
declare var ACT_MP_ATTACK_SWIM_PREFIRE: number;
declare var ACT_MP_ATTACK_SWIM_POSTFIRE: number;
declare var ACT_MP_STAND_PRIMARY: number;
declare var ACT_MP_CROUCH_PRIMARY: number;
declare var ACT_MP_RUN_PRIMARY: number;
declare var ACT_MP_WALK_PRIMARY: number;
declare var ACT_MP_AIRWALK_PRIMARY: number;
declare var ACT_MP_CROUCHWALK_PRIMARY: number;
declare var ACT_MP_JUMP_PRIMARY: number;
declare var ACT_MP_JUMP_START_PRIMARY: number;
declare var ACT_MP_JUMP_FLOAT_PRIMARY: number;
declare var ACT_MP_JUMP_LAND_PRIMARY: number;
declare var ACT_MP_SWIM_PRIMARY: number;
declare var ACT_MP_DEPLOYED_PRIMARY: number;
declare var ACT_MP_SWIM_DEPLOYED_PRIMARY: number;
declare var ACT_MP_ATTACK_STAND_PRIMARY: number;
declare var ACT_MP_ATTACK_STAND_PRIMARY_DEPLOYED: number;
declare var ACT_MP_ATTACK_CROUCH_PRIMARY: number;
declare var ACT_MP_ATTACK_CROUCH_PRIMARY_DEPLOYED: number;
declare var ACT_MP_ATTACK_SWIM_PRIMARY: number;
declare var ACT_MP_ATTACK_AIRWALK_PRIMARY: number;
declare var ACT_MP_RELOAD_STAND_PRIMARY: number;
declare var ACT_MP_RELOAD_STAND_PRIMARY_LOOP: number;
declare var ACT_MP_RELOAD_STAND_PRIMARY_END: number;
declare var ACT_MP_RELOAD_CROUCH_PRIMARY: number;
declare var ACT_MP_RELOAD_CROUCH_PRIMARY_LOOP: number;
declare var ACT_MP_RELOAD_CROUCH_PRIMARY_END: number;
declare var ACT_MP_RELOAD_SWIM_PRIMARY: number;
declare var ACT_MP_RELOAD_SWIM_PRIMARY_LOOP: number;
declare var ACT_MP_RELOAD_SWIM_PRIMARY_END: number;
declare var ACT_MP_RELOAD_AIRWALK_PRIMARY: number;
declare var ACT_MP_RELOAD_AIRWALK_PRIMARY_LOOP: number;
declare var ACT_MP_RELOAD_AIRWALK_PRIMARY_END: number;
declare var ACT_MP_ATTACK_STAND_GRENADE_PRIMARY: number;
declare var ACT_MP_ATTACK_CROUCH_GRENADE_PRIMARY: number;
declare var ACT_MP_ATTACK_SWIM_GRENADE_PRIMARY: number;
declare var ACT_MP_ATTACK_AIRWALK_GRENADE_PRIMARY: number;
declare var ACT_MP_STAND_SECONDARY: number;
declare var ACT_MP_CROUCH_SECONDARY: number;
declare var ACT_MP_RUN_SECONDARY: number;
declare var ACT_MP_WALK_SECONDARY: number;
declare var ACT_MP_AIRWALK_SECONDARY: number;
declare var ACT_MP_CROUCHWALK_SECONDARY: number;
declare var ACT_MP_JUMP_SECONDARY: number;
declare var ACT_MP_JUMP_START_SECONDARY: number;
declare var ACT_MP_JUMP_FLOAT_SECONDARY: number;
declare var ACT_MP_JUMP_LAND_SECONDARY: number;
declare var ACT_MP_SWIM_SECONDARY: number;
declare var ACT_MP_ATTACK_STAND_SECONDARY: number;
declare var ACT_MP_ATTACK_CROUCH_SECONDARY: number;
declare var ACT_MP_ATTACK_SWIM_SECONDARY: number;
declare var ACT_MP_ATTACK_AIRWALK_SECONDARY: number;
declare var ACT_MP_RELOAD_STAND_SECONDARY: number;
declare var ACT_MP_RELOAD_STAND_SECONDARY_LOOP: number;
declare var ACT_MP_RELOAD_STAND_SECONDARY_END: number;
declare var ACT_MP_RELOAD_CROUCH_SECONDARY: number;
declare var ACT_MP_RELOAD_CROUCH_SECONDARY_LOOP: number;
declare var ACT_MP_RELOAD_CROUCH_SECONDARY_END: number;
declare var ACT_MP_RELOAD_SWIM_SECONDARY: number;
declare var ACT_MP_RELOAD_SWIM_SECONDARY_LOOP: number;
declare var ACT_MP_RELOAD_SWIM_SECONDARY_END: number;
declare var ACT_MP_RELOAD_AIRWALK_SECONDARY: number;
declare var ACT_MP_RELOAD_AIRWALK_SECONDARY_LOOP: number;
declare var ACT_MP_RELOAD_AIRWALK_SECONDARY_END: number;
declare var ACT_MP_ATTACK_STAND_GRENADE_SECONDARY: number;
declare var ACT_MP_ATTACK_CROUCH_GRENADE_SECONDARY: number;
declare var ACT_MP_ATTACK_SWIM_GRENADE_SECONDARY: number;
declare var ACT_MP_ATTACK_AIRWALK_GRENADE_SECONDARY: number;
declare var ACT_MP_STAND_MELEE: number;
declare var ACT_MP_CROUCH_MELEE: number;
declare var ACT_MP_RUN_MELEE: number;
declare var ACT_MP_WALK_MELEE: number;
declare var ACT_MP_AIRWALK_MELEE: number;
declare var ACT_MP_CROUCHWALK_MELEE: number;
declare var ACT_MP_JUMP_MELEE: number;
declare var ACT_MP_JUMP_START_MELEE: number;
declare var ACT_MP_JUMP_FLOAT_MELEE: number;
declare var ACT_MP_JUMP_LAND_MELEE: number;
declare var ACT_MP_SWIM_MELEE: number;
declare var ACT_MP_ATTACK_STAND_MELEE: number;
declare var ACT_MP_ATTACK_STAND_MELEE_SECONDARY: number;
declare var ACT_MP_ATTACK_CROUCH_MELEE: number;
declare var ACT_MP_ATTACK_CROUCH_MELEE_SECONDARY: number;
declare var ACT_MP_ATTACK_SWIM_MELEE: number;
declare var ACT_MP_ATTACK_AIRWALK_MELEE: number;
declare var ACT_MP_ATTACK_STAND_GRENADE_MELEE: number;
declare var ACT_MP_ATTACK_CROUCH_GRENADE_MELEE: number;
declare var ACT_MP_ATTACK_SWIM_GRENADE_MELEE: number;
declare var ACT_MP_ATTACK_AIRWALK_GRENADE_MELEE: number;
declare var ACT_MP_STAND_ITEM1: number;
declare var ACT_MP_CROUCH_ITEM1: number;
declare var ACT_MP_RUN_ITEM1: number;
declare var ACT_MP_WALK_ITEM1: number;
declare var ACT_MP_AIRWALK_ITEM1: number;
declare var ACT_MP_CROUCHWALK_ITEM1: number;
declare var ACT_MP_JUMP_ITEM1: number;
declare var ACT_MP_JUMP_START_ITEM1: number;
declare var ACT_MP_JUMP_FLOAT_ITEM1: number;
declare var ACT_MP_JUMP_LAND_ITEM1: number;
declare var ACT_MP_SWIM_ITEM1: number;
declare var ACT_MP_ATTACK_STAND_ITEM1: number;
declare var ACT_MP_ATTACK_STAND_ITEM1_SECONDARY: number;
declare var ACT_MP_ATTACK_CROUCH_ITEM1: number;
declare var ACT_MP_ATTACK_CROUCH_ITEM1_SECONDARY: number;
declare var ACT_MP_ATTACK_SWIM_ITEM1: number;
declare var ACT_MP_ATTACK_AIRWALK_ITEM1: number;
declare var ACT_MP_STAND_ITEM2: number;
declare var ACT_MP_CROUCH_ITEM2: number;
declare var ACT_MP_RUN_ITEM2: number;
declare var ACT_MP_WALK_ITEM2: number;
declare var ACT_MP_AIRWALK_ITEM2: number;
declare var ACT_MP_CROUCHWALK_ITEM2: number;
declare var ACT_MP_JUMP_ITEM2: number;
declare var ACT_MP_JUMP_START_ITEM2: number;
declare var ACT_MP_JUMP_FLOAT_ITEM2: number;
declare var ACT_MP_JUMP_LAND_ITEM2: number;
declare var ACT_MP_SWIM_ITEM2: number;
declare var ACT_MP_ATTACK_STAND_ITEM2: number;
declare var ACT_MP_ATTACK_STAND_ITEM2_SECONDARY: number;
declare var ACT_MP_ATTACK_CROUCH_ITEM2: number;
declare var ACT_MP_ATTACK_CROUCH_ITEM2_SECONDARY: number;
declare var ACT_MP_ATTACK_SWIM_ITEM2: number;
declare var ACT_MP_ATTACK_AIRWALK_ITEM2: number;
declare var ACT_MP_GESTURE_FLINCH: number;
declare var ACT_MP_GESTURE_FLINCH_PRIMARY: number;
declare var ACT_MP_GESTURE_FLINCH_SECONDARY: number;
declare var ACT_MP_GESTURE_FLINCH_MELEE: number;
declare var ACT_MP_GESTURE_FLINCH_ITEM1: number;
declare var ACT_MP_GESTURE_FLINCH_ITEM2: number;
declare var ACT_MP_GESTURE_FLINCH_HEAD: number;
declare var ACT_MP_GESTURE_FLINCH_CHEST: number;
declare var ACT_MP_GESTURE_FLINCH_STOMACH: number;
declare var ACT_MP_GESTURE_FLINCH_LEFTARM: number;
declare var ACT_MP_GESTURE_FLINCH_RIGHTARM: number;
declare var ACT_MP_GESTURE_FLINCH_LEFTLEG: number;
declare var ACT_MP_GESTURE_FLINCH_RIGHTLEG: number;
declare var ACT_MP_GRENADE1_DRAW: number;
declare var ACT_MP_GRENADE1_IDLE: number;
declare var ACT_MP_GRENADE1_ATTACK: number;
declare var ACT_MP_GRENADE2_DRAW: number;
declare var ACT_MP_GRENADE2_IDLE: number;
declare var ACT_MP_GRENADE2_ATTACK: number;
declare var ACT_MP_PRIMARY_GRENADE1_DRAW: number;
declare var ACT_MP_PRIMARY_GRENADE1_IDLE: number;
declare var ACT_MP_PRIMARY_GRENADE1_ATTACK: number;
declare var ACT_MP_PRIMARY_GRENADE2_DRAW: number;
declare var ACT_MP_PRIMARY_GRENADE2_IDLE: number;
declare var ACT_MP_PRIMARY_GRENADE2_ATTACK: number;
declare var ACT_MP_SECONDARY_GRENADE1_DRAW: number;
declare var ACT_MP_SECONDARY_GRENADE1_IDLE: number;
declare var ACT_MP_SECONDARY_GRENADE1_ATTACK: number;
declare var ACT_MP_SECONDARY_GRENADE2_DRAW: number;
declare var ACT_MP_SECONDARY_GRENADE2_IDLE: number;
declare var ACT_MP_SECONDARY_GRENADE2_ATTACK: number;
declare var ACT_MP_MELEE_GRENADE1_DRAW: number;
declare var ACT_MP_MELEE_GRENADE1_IDLE: number;
declare var ACT_MP_MELEE_GRENADE1_ATTACK: number;
declare var ACT_MP_MELEE_GRENADE2_DRAW: number;
declare var ACT_MP_MELEE_GRENADE2_IDLE: number;
declare var ACT_MP_MELEE_GRENADE2_ATTACK: number;
declare var ACT_MP_ITEM1_GRENADE1_DRAW: number;
declare var ACT_MP_ITEM1_GRENADE1_IDLE: number;
declare var ACT_MP_ITEM1_GRENADE1_ATTACK: number;
declare var ACT_MP_ITEM1_GRENADE2_DRAW: number;
declare var ACT_MP_ITEM1_GRENADE2_IDLE: number;
declare var ACT_MP_ITEM1_GRENADE2_ATTACK: number;
declare var ACT_MP_ITEM2_GRENADE1_DRAW: number;
declare var ACT_MP_ITEM2_GRENADE1_IDLE: number;
declare var ACT_MP_ITEM2_GRENADE1_ATTACK: number;
declare var ACT_MP_ITEM2_GRENADE2_DRAW: number;
declare var ACT_MP_ITEM2_GRENADE2_IDLE: number;
declare var ACT_MP_ITEM2_GRENADE2_ATTACK: number;
declare var ACT_MP_STAND_BUILDING: number;
declare var ACT_MP_CROUCH_BUILDING: number;
declare var ACT_MP_RUN_BUILDING: number;
declare var ACT_MP_WALK_BUILDING: number;
declare var ACT_MP_AIRWALK_BUILDING: number;
declare var ACT_MP_CROUCHWALK_BUILDING: number;
declare var ACT_MP_JUMP_BUILDING: number;
declare var ACT_MP_JUMP_START_BUILDING: number;
declare var ACT_MP_JUMP_FLOAT_BUILDING: number;
declare var ACT_MP_JUMP_LAND_BUILDING: number;
declare var ACT_MP_SWIM_BUILDING: number;
declare var ACT_MP_ATTACK_STAND_BUILDING: number;
declare var ACT_MP_ATTACK_CROUCH_BUILDING: number;
declare var ACT_MP_ATTACK_SWIM_BUILDING: number;
declare var ACT_MP_ATTACK_AIRWALK_BUILDING: number;
declare var ACT_MP_ATTACK_STAND_GRENADE_BUILDING: number;
declare var ACT_MP_ATTACK_CROUCH_GRENADE_BUILDING: number;
declare var ACT_MP_ATTACK_SWIM_GRENADE_BUILDING: number;
declare var ACT_MP_ATTACK_AIRWALK_GRENADE_BUILDING: number;
declare var ACT_MP_STAND_PDA: number;
declare var ACT_MP_CROUCH_PDA: number;
declare var ACT_MP_RUN_PDA: number;
declare var ACT_MP_WALK_PDA: number;
declare var ACT_MP_AIRWALK_PDA: number;
declare var ACT_MP_CROUCHWALK_PDA: number;
declare var ACT_MP_JUMP_PDA: number;
declare var ACT_MP_JUMP_START_PDA: number;
declare var ACT_MP_JUMP_FLOAT_PDA: number;
declare var ACT_MP_JUMP_LAND_PDA: number;
declare var ACT_MP_SWIM_PDA: number;
declare var ACT_MP_ATTACK_STAND_PDA: number;
declare var ACT_MP_ATTACK_SWIM_PDA: number;
declare var ACT_MP_GESTURE_VC_HANDMOUTH: number;
declare var ACT_MP_GESTURE_VC_FINGERPOINT: number;
declare var ACT_MP_GESTURE_VC_FISTPUMP: number;
declare var ACT_MP_GESTURE_VC_THUMBSUP: number;
declare var ACT_MP_GESTURE_VC_NODYES: number;
declare var ACT_MP_GESTURE_VC_NODNO: number;
declare var ACT_MP_GESTURE_VC_HANDMOUTH_PRIMARY: number;
declare var ACT_MP_GESTURE_VC_FINGERPOINT_PRIMARY: number;
declare var ACT_MP_GESTURE_VC_FISTPUMP_PRIMARY: number;
declare var ACT_MP_GESTURE_VC_THUMBSUP_PRIMARY: number;
declare var ACT_MP_GESTURE_VC_NODYES_PRIMARY: number;
declare var ACT_MP_GESTURE_VC_NODNO_PRIMARY: number;
declare var ACT_MP_GESTURE_VC_HANDMOUTH_SECONDARY: number;
declare var ACT_MP_GESTURE_VC_FINGERPOINT_SECONDARY: number;
declare var ACT_MP_GESTURE_VC_FISTPUMP_SECONDARY: number;
declare var ACT_MP_GESTURE_VC_THUMBSUP_SECONDARY: number;
declare var ACT_MP_GESTURE_VC_NODYES_SECONDARY: number;
declare var ACT_MP_GESTURE_VC_NODNO_SECONDARY: number;
declare var ACT_MP_GESTURE_VC_HANDMOUTH_MELEE: number;
declare var ACT_MP_GESTURE_VC_FINGERPOINT_MELEE: number;
declare var ACT_MP_GESTURE_VC_FISTPUMP_MELEE: number;
declare var ACT_MP_GESTURE_VC_THUMBSUP_MELEE: number;
declare var ACT_MP_GESTURE_VC_NODYES_MELEE: number;
declare var ACT_MP_GESTURE_VC_NODNO_MELEE: number;
declare var ACT_MP_GESTURE_VC_HANDMOUTH_ITEM1: number;
declare var ACT_MP_GESTURE_VC_FINGERPOINT_ITEM1: number;
declare var ACT_MP_GESTURE_VC_FISTPUMP_ITEM1: number;
declare var ACT_MP_GESTURE_VC_THUMBSUP_ITEM1: number;
declare var ACT_MP_GESTURE_VC_NODYES_ITEM1: number;
declare var ACT_MP_GESTURE_VC_NODNO_ITEM1: number;
declare var ACT_MP_GESTURE_VC_HANDMOUTH_ITEM2: number;
declare var ACT_MP_GESTURE_VC_FINGERPOINT_ITEM2: number;
declare var ACT_MP_GESTURE_VC_FISTPUMP_ITEM2: number;
declare var ACT_MP_GESTURE_VC_THUMBSUP_ITEM2: number;
declare var ACT_MP_GESTURE_VC_NODYES_ITEM2: number;
declare var ACT_MP_GESTURE_VC_NODNO_ITEM2: number;
declare var ACT_MP_GESTURE_VC_HANDMOUTH_BUILDING: number;
declare var ACT_MP_GESTURE_VC_FINGERPOINT_BUILDING: number;
declare var ACT_MP_GESTURE_VC_FISTPUMP_BUILDING: number;
declare var ACT_MP_GESTURE_VC_THUMBSUP_BUILDING: number;
declare var ACT_MP_GESTURE_VC_NODYES_BUILDING: number;
declare var ACT_MP_GESTURE_VC_NODNO_BUILDING: number;
declare var ACT_MP_GESTURE_VC_HANDMOUTH_PDA: number;
declare var ACT_MP_GESTURE_VC_FINGERPOINT_PDA: number;
declare var ACT_MP_GESTURE_VC_FISTPUMP_PDA: number;
declare var ACT_MP_GESTURE_VC_THUMBSUP_PDA: number;
declare var ACT_MP_GESTURE_VC_NODYES_PDA: number;
declare var ACT_MP_GESTURE_VC_NODNO_PDA: number;
declare var ACT_VM_UNUSABLE: number;
declare var ACT_VM_UNUSABLE_TO_USABLE: number;
declare var ACT_VM_USABLE_TO_UNUSABLE: number;
declare var ACT_PRIMARY_VM_DRAW: number;
declare var ACT_PRIMARY_VM_HOLSTER: number;
declare var ACT_PRIMARY_VM_IDLE: number;
declare var ACT_PRIMARY_VM_PULLBACK: number;
declare var ACT_PRIMARY_VM_PRIMARYATTACK: number;
declare var ACT_PRIMARY_VM_SECONDARYATTACK: number;
declare var ACT_PRIMARY_VM_RELOAD: number;
declare var ACT_PRIMARY_VM_DRYFIRE: number;
declare var ACT_PRIMARY_VM_IDLE_TO_LOWERED: number;
declare var ACT_PRIMARY_VM_IDLE_LOWERED: number;
declare var ACT_PRIMARY_VM_LOWERED_TO_IDLE: number;
declare var ACT_SECONDARY_VM_DRAW: number;
declare var ACT_SECONDARY_VM_HOLSTER: number;
declare var ACT_SECONDARY_VM_IDLE: number;
declare var ACT_SECONDARY_VM_PULLBACK: number;
declare var ACT_SECONDARY_VM_PRIMARYATTACK: number;
declare var ACT_SECONDARY_VM_SECONDARYATTACK: number;
declare var ACT_SECONDARY_VM_RELOAD: number;
declare var ACT_SECONDARY_VM_DRYFIRE: number;
declare var ACT_SECONDARY_VM_IDLE_TO_LOWERED: number;
declare var ACT_SECONDARY_VM_IDLE_LOWERED: number;
declare var ACT_SECONDARY_VM_LOWERED_TO_IDLE: number;
declare var ACT_MELEE_VM_DRAW: number;
declare var ACT_MELEE_VM_HOLSTER: number;
declare var ACT_MELEE_VM_IDLE: number;
declare var ACT_MELEE_VM_PULLBACK: number;
declare var ACT_MELEE_VM_PRIMARYATTACK: number;
declare var ACT_MELEE_VM_SECONDARYATTACK: number;
declare var ACT_MELEE_VM_RELOAD: number;
declare var ACT_MELEE_VM_DRYFIRE: number;
declare var ACT_MELEE_VM_IDLE_TO_LOWERED: number;
declare var ACT_MELEE_VM_IDLE_LOWERED: number;
declare var ACT_MELEE_VM_LOWERED_TO_IDLE: number;
declare var ACT_PDA_VM_DRAW: number;
declare var ACT_PDA_VM_HOLSTER: number;
declare var ACT_PDA_VM_IDLE: number;
declare var ACT_PDA_VM_PULLBACK: number;
declare var ACT_PDA_VM_PRIMARYATTACK: number;
declare var ACT_PDA_VM_SECONDARYATTACK: number;
declare var ACT_PDA_VM_RELOAD: number;
declare var ACT_PDA_VM_DRYFIRE: number;
declare var ACT_PDA_VM_IDLE_TO_LOWERED: number;
declare var ACT_PDA_VM_IDLE_LOWERED: number;
declare var ACT_PDA_VM_LOWERED_TO_IDLE: number;
declare var ACT_ITEM1_VM_DRAW: number;
declare var ACT_ITEM1_VM_HOLSTER: number;
declare var ACT_ITEM1_VM_IDLE: number;
declare var ACT_ITEM1_VM_PULLBACK: number;
declare var ACT_ITEM1_VM_PRIMARYATTACK: number;
declare var ACT_ITEM1_VM_SECONDARYATTACK: number;
declare var ACT_ITEM1_VM_RELOAD: number;
declare var ACT_ITEM1_VM_DRYFIRE: number;
declare var ACT_ITEM1_VM_IDLE_TO_LOWERED: number;
declare var ACT_ITEM1_VM_IDLE_LOWERED: number;
declare var ACT_ITEM1_VM_LOWERED_TO_IDLE: number;
declare var ACT_ITEM2_VM_DRAW: number;
declare var ACT_ITEM2_VM_HOLSTER: number;
declare var ACT_ITEM2_VM_IDLE: number;
declare var ACT_ITEM2_VM_PULLBACK: number;
declare var ACT_ITEM2_VM_PRIMARYATTACK: number;
declare var ACT_ITEM2_VM_SECONDARYATTACK: number;
declare var ACT_ITEM2_VM_RELOAD: number;
declare var ACT_ITEM2_VM_DRYFIRE: number;
declare var ACT_ITEM2_VM_IDLE_TO_LOWERED: number;
declare var ACT_ITEM2_VM_IDLE_LOWERED: number;
declare var ACT_ITEM2_VM_LOWERED_TO_IDLE: number;
declare var ACT_RELOAD_SUCCEED: number;
declare var ACT_RELOAD_FAIL: number;
declare var ACT_WALK_AIM_AUTOGUN: number;
declare var ACT_RUN_AIM_AUTOGUN: number;
declare var ACT_IDLE_AUTOGUN: number;
declare var ACT_IDLE_AIM_AUTOGUN: number;
declare var ACT_RELOAD_AUTOGUN: number;
declare var ACT_CROUCH_IDLE_AUTOGUN: number;
declare var ACT_RANGE_ATTACK_AUTOGUN: number;
declare var ACT_JUMP_AUTOGUN: number;
declare var ACT_IDLE_AIM_PISTOL: number;
declare var ACT_WALK_AIM_DUAL: number;
declare var ACT_RUN_AIM_DUAL: number;
declare var ACT_IDLE_DUAL: number;
declare var ACT_IDLE_AIM_DUAL: number;
declare var ACT_RELOAD_DUAL: number;
declare var ACT_CROUCH_IDLE_DUAL: number;
declare var ACT_RANGE_ATTACK_DUAL: number;
declare var ACT_JUMP_DUAL: number;
declare var ACT_IDLE_AIM_SHOTGUN: number;
declare var ACT_CROUCH_IDLE_SHOTGUN: number;
declare var ACT_IDLE_AIM_RIFLE: number;
declare var ACT_CROUCH_IDLE_RIFLE: number;
declare var ACT_RANGE_ATTACK_RIFLE: number;
declare var ACT_SLEEP: number;
declare var ACT_WAKE: number;
declare var ACT_FLICK_LEFT: number;
declare var ACT_FLICK_LEFT_MIDDLE: number;
declare var ACT_FLICK_RIGHT_MIDDLE: number;
declare var ACT_FLICK_RIGHT: number;
declare var ACT_SPINAROUND: number;
declare var ACT_PREP_TO_FIRE: number;
declare var ACT_FIRE: number;
declare var ACT_FIRE_RECOVER: number;
declare var ACT_SPRAY: number;
declare var ACT_PREP_EXPLODE: number;
declare var ACT_EXPLODE: number;
declare var ACT_SCRIPT_CUSTOM_0: number;
declare var ACT_SCRIPT_CUSTOM_1: number;
declare var ACT_SCRIPT_CUSTOM_2: number;
declare var ACT_SCRIPT_CUSTOM_3: number;
declare var ACT_SCRIPT_CUSTOM_4: number;
declare var ACT_SCRIPT_CUSTOM_5: number;
declare var ACT_SCRIPT_CUSTOM_6: number;
declare var ACT_SCRIPT_CUSTOM_7: number;
declare var ACT_SCRIPT_CUSTOM_8: number;
declare var ACT_SCRIPT_CUSTOM_9: number;
declare var ACT_SCRIPT_CUSTOM_10: number;
declare var ACT_SCRIPT_CUSTOM_11: number;
declare var ACT_SCRIPT_CUSTOM_12: number;
declare var ACT_SCRIPT_CUSTOM_13: number;
declare var ACT_SCRIPT_CUSTOM_14: number;
declare var ACT_SCRIPT_CUSTOM_15: number;
declare var ACT_SCRIPT_CUSTOM_16: number;
declare var ACT_SCRIPT_CUSTOM_17: number;
declare var ACT_SCRIPT_CUSTOM_18: number;
declare var ACT_SCRIPT_CUSTOM_19: number;
declare var ACT_SCRIPT_CUSTOM_20: number;
declare var ACT_SCRIPT_CUSTOM_21: number;
declare var ACT_SCRIPT_CUSTOM_22: number;
declare var ACT_SCRIPT_CUSTOM_23: number;
declare var ACT_SCRIPT_CUSTOM_24: number;
declare var ACT_SCRIPT_CUSTOM_25: number;
declare var ACT_SCRIPT_CUSTOM_26: number;
declare var ACT_SCRIPT_CUSTOM_27: number;
declare var ACT_SCRIPT_CUSTOM_28: number;
declare var ACT_SCRIPT_CUSTOM_29: number;
declare var ACT_SCRIPT_CUSTOM_30: number;
declare var ACT_SCRIPT_CUSTOM_31: number;
declare var ACT_VR_PISTOL_LAST_SHOT: number;
declare var ACT_VR_PISTOL_SLIDE_RELEASE: number;
declare var ACT_VR_PISTOL_CLIP_OUT_CHAMBERED: number;
declare var ACT_VR_PISTOL_CLIP_OUT_SLIDE_BACK: number;
declare var ACT_VR_PISTOL_CLIP_IN_CHAMBERED: number;
declare var ACT_VR_PISTOL_CLIP_IN_SLIDE_BACK: number;
declare var ACT_VR_PISTOL_IDLE_SLIDE_BACK: number;
declare var ACT_VR_PISTOL_IDLE_SLIDE_BACK_CLIP_READY: number;
declare var ACT_RAGDOLL_RECOVERY_FRONT: number;
declare var ACT_RAGDOLL_RECOVERY_BACK: number;
declare var ACT_RAGDOLL_RECOVERY_LEFT: number;
declare var ACT_RAGDOLL_RECOVERY_RIGHT: number;
declare var ACT_GRABBITYGLOVES_GRAB: number;
declare var ACT_GRABBITYGLOVES_RELEASE: number;
declare var ACT_GRABBITYGLOVES_GRAB_IDLE: number;
declare var ACT_GRABBITYGLOVES_ACTIVE: number;
declare var ACT_GRABBITYGLOVES_ACTIVE_IDLE: number;
declare var ACT_GRABBITYGLOVES_DEACTIVATE: number;
declare var ACT_GRABBITYGLOVES_PULL: number;
declare var ACT_HEADCRAB_SMOKE_BOMB: number;
declare var ACT_HEADCRAB_SPIT: number;
declare var ACT_ZOMBIE_TRIP: number;
declare var ACT_ZOMBIE_LUNGE: number;
declare var ACT_NEUTRAL_REF_POSE: number;
declare var ACT_ANTLION_SCUTTLE_FORWARD: number;
declare var ACT_ANTLION_SCUTTLE_BACK: number;
declare var ACT_ANTLION_SCUTTLE_LEFT: number;
declare var ACT_ANTLION_SCUTTLE_RIGHT: number;
declare var ACT_DOTA_IDLE: number;
declare var ACT_DOTA_IDLE_RARE: number;
declare var ACT_DOTA_RUN: number;
declare var ACT_DOTA_ATTACK: number;
declare var ACT_DOTA_ATTACK2: number;
declare var ACT_DOTA_ATTACK_EVENT: number;
declare var ACT_DOTA_DIE: number;
declare var ACT_DOTA_FLINCH: number;
declare var ACT_DOTA_FLAIL: number;
declare var ACT_DOTA_DISABLED: number;
declare var ACT_DOTA_CAST_ABILITY_1: number;
declare var ACT_DOTA_CAST_ABILITY_2: number;
declare var ACT_DOTA_CAST_ABILITY_3: number;
declare var ACT_DOTA_CAST_ABILITY_4: number;
declare var ACT_DOTA_CAST_ABILITY_5: number;
declare var ACT_DOTA_CAST_ABILITY_6: number;
declare var ACT_DOTA_OVERRIDE_ABILITY_1: number;
declare var ACT_DOTA_OVERRIDE_ABILITY_2: number;
declare var ACT_DOTA_OVERRIDE_ABILITY_3: number;
declare var ACT_DOTA_OVERRIDE_ABILITY_4: number;
declare var ACT_DOTA_CHANNEL_ABILITY_1: number;
declare var ACT_DOTA_CHANNEL_ABILITY_2: number;
declare var ACT_DOTA_CHANNEL_ABILITY_3: number;
declare var ACT_DOTA_CHANNEL_ABILITY_4: number;
declare var ACT_DOTA_CHANNEL_ABILITY_5: number;
declare var ACT_DOTA_CHANNEL_ABILITY_6: number;
declare var ACT_DOTA_CHANNEL_END_ABILITY_1: number;
declare var ACT_DOTA_CHANNEL_END_ABILITY_2: number;
declare var ACT_DOTA_CHANNEL_END_ABILITY_3: number;
declare var ACT_DOTA_CHANNEL_END_ABILITY_4: number;
declare var ACT_DOTA_CHANNEL_END_ABILITY_5: number;
declare var ACT_DOTA_CHANNEL_END_ABILITY_6: number;
declare var ACT_DOTA_CONSTANT_LAYER: number;
declare var ACT_DOTA_CAPTURE: number;
declare var ACT_DOTA_SPAWN: number;
declare var ACT_DOTA_KILLTAUNT: number;
declare var ACT_DOTA_TAUNT: number;
declare var ACT_DOTA_THIRST: number;
declare var ACT_DOTA_CAST_DRAGONBREATH: number;
declare var ACT_DOTA_ECHO_SLAM: number;
declare var ACT_DOTA_CAST_ABILITY_1_END: number;
declare var ACT_DOTA_CAST_ABILITY_2_END: number;
declare var ACT_DOTA_CAST_ABILITY_3_END: number;
declare var ACT_DOTA_CAST_ABILITY_4_END: number;
declare var ACT_MIRANA_LEAP_END: number;
declare var ACT_WAVEFORM_START: number;
declare var ACT_WAVEFORM_END: number;
declare var ACT_DOTA_CAST_ABILITY_ROT: number;
declare var ACT_DOTA_DIE_SPECIAL: number;
declare var ACT_DOTA_RATTLETRAP_BATTERYASSAULT: number;
declare var ACT_DOTA_RATTLETRAP_POWERCOGS: number;
declare var ACT_DOTA_RATTLETRAP_HOOKSHOT_START: number;
declare var ACT_DOTA_RATTLETRAP_HOOKSHOT_LOOP: number;
declare var ACT_DOTA_RATTLETRAP_HOOKSHOT_END: number;
declare var ACT_STORM_SPIRIT_OVERLOAD_RUN_OVERRIDE: number;
declare var ACT_DOTA_TINKER_REARM1: number;
declare var ACT_DOTA_TINKER_REARM2: number;
declare var ACT_DOTA_TINKER_REARM3: number;
declare var ACT_TINY_AVALANCHE: number;
declare var ACT_TINY_TOSS: number;
declare var ACT_TINY_GROWL: number;
declare var ACT_DOTA_WEAVERBUG_ATTACH: number;
declare var ACT_DOTA_CAST_WILD_AXES_END: number;
declare var ACT_DOTA_CAST_LIFE_BREAK_START: number;
declare var ACT_DOTA_CAST_LIFE_BREAK_END: number;
declare var ACT_DOTA_NIGHTSTALKER_TRANSITION: number;
declare var ACT_DOTA_LIFESTEALER_RAGE: number;
declare var ACT_DOTA_LIFESTEALER_OPEN_WOUNDS: number;
declare var ACT_DOTA_SAND_KING_BURROW_IN: number;
declare var ACT_DOTA_SAND_KING_BURROW_OUT: number;
declare var ACT_DOTA_EARTHSHAKER_TOTEM_ATTACK: number;
declare var ACT_DOTA_WHEEL_LAYER: number;
declare var ACT_DOTA_ALCHEMIST_CHEMICAL_RAGE_START: number;
declare var ACT_DOTA_ALCHEMIST_CONCOCTION: number;
declare var ACT_DOTA_JAKIRO_LIQUIDFIRE_START: number;
declare var ACT_DOTA_JAKIRO_LIQUIDFIRE_LOOP: number;
declare var ACT_DOTA_LIFESTEALER_INFEST: number;
declare var ACT_DOTA_LIFESTEALER_INFEST_END: number;
declare var ACT_DOTA_LASSO_LOOP: number;
declare var ACT_DOTA_ALCHEMIST_CONCOCTION_THROW: number;
declare var ACT_DOTA_ALCHEMIST_CHEMICAL_RAGE_END: number;
declare var ACT_DOTA_CAST_COLD_SNAP: number;
declare var ACT_DOTA_CAST_GHOST_WALK: number;
declare var ACT_DOTA_CAST_TORNADO: number;
declare var ACT_DOTA_CAST_EMP: number;
declare var ACT_DOTA_CAST_ALACRITY: number;
declare var ACT_DOTA_CAST_CHAOS_METEOR: number;
declare var ACT_DOTA_CAST_SUN_STRIKE: number;
declare var ACT_DOTA_CAST_FORGE_SPIRIT: number;
declare var ACT_DOTA_CAST_ICE_WALL: number;
declare var ACT_DOTA_CAST_DEAFENING_BLAST: number;
declare var ACT_DOTA_VICTORY: number;
declare var ACT_DOTA_DEFEAT: number;
declare var ACT_DOTA_SPIRIT_BREAKER_CHARGE_POSE: number;
declare var ACT_DOTA_SPIRIT_BREAKER_CHARGE_END: number;
declare var ACT_DOTA_TELEPORT: number;
declare var ACT_DOTA_TELEPORT_END: number;
declare var ACT_DOTA_CAST_REFRACTION: number;
declare var ACT_DOTA_CAST_ABILITY_7: number;
declare var ACT_DOTA_CANCEL_SIREN_SONG: number;
declare var ACT_DOTA_CHANNEL_ABILITY_7: number;
declare var ACT_DOTA_LOADOUT: number;
declare var ACT_DOTA_FORCESTAFF_END: number;
declare var ACT_DOTA_POOF_END: number;
declare var ACT_DOTA_SLARK_POUNCE: number;
declare var ACT_DOTA_MAGNUS_SKEWER_START: number;
declare var ACT_DOTA_MAGNUS_SKEWER_END: number;
declare var ACT_DOTA_MEDUSA_STONE_GAZE: number;
declare var ACT_DOTA_RELAX_START: number;
declare var ACT_DOTA_RELAX_LOOP: number;
declare var ACT_DOTA_RELAX_END: number;
declare var ACT_DOTA_CENTAUR_STAMPEDE: number;
declare var ACT_DOTA_BELLYACHE_START: number;
declare var ACT_DOTA_BELLYACHE_LOOP: number;
declare var ACT_DOTA_BELLYACHE_END: number;
declare var ACT_DOTA_ROQUELAIRE_LAND: number;
declare var ACT_DOTA_ROQUELAIRE_LAND_IDLE: number;
declare var ACT_DOTA_GREEVIL_CAST: number;
declare var ACT_DOTA_GREEVIL_OVERRIDE_ABILITY: number;
declare var ACT_DOTA_GREEVIL_HOOK_START: number;
declare var ACT_DOTA_GREEVIL_HOOK_END: number;
declare var ACT_DOTA_GREEVIL_BLINK_BONE: number;
declare var ACT_DOTA_IDLE_SLEEPING: number;
declare var ACT_DOTA_INTRO: number;
declare var ACT_DOTA_GESTURE_POINT: number;
declare var ACT_DOTA_GESTURE_ACCENT: number;
declare var ACT_DOTA_SLEEPING_END: number;
declare var ACT_DOTA_AMBUSH: number;
declare var ACT_DOTA_ITEM_LOOK: number;
declare var ACT_DOTA_STARTLE: number;
declare var ACT_DOTA_FRUSTRATION: number;
declare var ACT_DOTA_TELEPORT_REACT: number;
declare var ACT_DOTA_TELEPORT_END_REACT: number;
declare var ACT_DOTA_SHRUG: number;
declare var ACT_DOTA_RELAX_LOOP_END: number;
declare var ACT_DOTA_PRESENT_ITEM: number;
declare var ACT_DOTA_IDLE_IMPATIENT: number;
declare var ACT_DOTA_SHARPEN_WEAPON: number;
declare var ACT_DOTA_SHARPEN_WEAPON_OUT: number;
declare var ACT_DOTA_IDLE_SLEEPING_END: number;
declare var ACT_DOTA_BRIDGE_DESTROY: number;
declare var ACT_DOTA_TAUNT_SNIPER: number;
declare var ACT_DOTA_DEATH_BY_SNIPER: number;
declare var ACT_DOTA_LOOK_AROUND: number;
declare var ACT_DOTA_CAGED_CREEP_RAGE: number;
declare var ACT_DOTA_CAGED_CREEP_RAGE_OUT: number;
declare var ACT_DOTA_CAGED_CREEP_SMASH: number;
declare var ACT_DOTA_CAGED_CREEP_SMASH_OUT: number;
declare var ACT_DOTA_IDLE_IMPATIENT_SWORD_TAP: number;
declare var ACT_DOTA_INTRO_LOOP: number;
declare var ACT_DOTA_BRIDGE_THREAT: number;
declare var ACT_DOTA_DAGON: number;
declare var ACT_DOTA_CAST_ABILITY_2_ES_ROLL_START: number;
declare var ACT_DOTA_CAST_ABILITY_2_ES_ROLL: number;
declare var ACT_DOTA_CAST_ABILITY_2_ES_ROLL_END: number;
declare var ACT_DOTA_NIAN_PIN_START: number;
declare var ACT_DOTA_NIAN_PIN_LOOP: number;
declare var ACT_DOTA_NIAN_PIN_END: number;
declare var ACT_DOTA_LEAP_STUN: number;
declare var ACT_DOTA_LEAP_SWIPE: number;
declare var ACT_DOTA_NIAN_INTRO_LEAP: number;
declare var ACT_DOTA_AREA_DENY: number;
declare var ACT_DOTA_NIAN_PIN_TO_STUN: number;
declare var ACT_DOTA_RAZE_1: number;
declare var ACT_DOTA_RAZE_2: number;
declare var ACT_DOTA_RAZE_3: number;
declare var ACT_DOTA_UNDYING_DECAY: number;
declare var ACT_DOTA_UNDYING_SOUL_RIP: number;
declare var ACT_DOTA_UNDYING_TOMBSTONE: number;
declare var ACT_DOTA_WHIRLING_AXES_RANGED: number;
declare var ACT_DOTA_SHALLOW_GRAVE: number;
declare var ACT_DOTA_COLD_FEET: number;
declare var ACT_DOTA_ICE_VORTEX: number;
declare var ACT_DOTA_CHILLING_TOUCH: number;
declare var ACT_DOTA_ENFEEBLE: number;
declare var ACT_DOTA_FATAL_BONDS: number;
declare var ACT_DOTA_MIDNIGHT_PULSE: number;
declare var ACT_DOTA_ANCESTRAL_SPIRIT: number;
declare var ACT_DOTA_THUNDER_STRIKE: number;
declare var ACT_DOTA_KINETIC_FIELD: number;
declare var ACT_DOTA_STATIC_STORM: number;
declare var ACT_DOTA_MINI_TAUNT: number;
declare var ACT_DOTA_ARCTIC_BURN_END: number;
declare var ACT_DOTA_LOADOUT_RARE: number;
declare var ACT_DOTA_SWIM: number;
declare var ACT_DOTA_FLEE: number;
declare var ACT_DOTA_TROT: number;
declare var ACT_DOTA_SHAKE: number;
declare var ACT_DOTA_SWIM_IDLE: number;
declare var ACT_DOTA_WAIT_IDLE: number;
declare var ACT_DOTA_GREET: number;
declare var ACT_DOTA_TELEPORT_COOP_START: number;
declare var ACT_DOTA_TELEPORT_COOP_WAIT: number;
declare var ACT_DOTA_TELEPORT_COOP_END: number;
declare var ACT_DOTA_TELEPORT_COOP_EXIT: number;
declare var ACT_DOTA_SHOPKEEPER_PET_INTERACT: number;
declare var ACT_DOTA_ITEM_PICKUP: number;
declare var ACT_DOTA_ITEM_DROP: number;
declare var ACT_DOTA_CAPTURE_PET: number;
declare var ACT_DOTA_PET_WARD_OBSERVER: number;
declare var ACT_DOTA_PET_WARD_SENTRY: number;
declare var ACT_DOTA_PET_LEVEL: number;
declare var ACT_DOTA_CAST_BURROW_END: number;
declare var ACT_DOTA_LIFESTEALER_ASSIMILATE: number;
declare var ACT_DOTA_LIFESTEALER_EJECT: number;
declare var ACT_DOTA_ATTACK_EVENT_BASH: number;
declare var ACT_DOTA_CAPTURE_RARE: number;
declare var ACT_DOTA_AW_MAGNETIC_FIELD: number;
declare var ACT_DOTA_CAST_GHOST_SHIP: number;
declare var ACT_DOTA_FXANIM: number;
declare var ACT_DOTA_VICTORY_START: number;
declare var ACT_DOTA_DEFEAT_START: number;
declare var ACT_DOTA_DP_SPIRIT_SIPHON: number;
declare var ACT_DOTA_TRICKS_END: number;
declare var ACT_DOTA_ES_STONE_CALLER: number;
declare var ACT_DOTA_MK_STRIKE: number;
declare var ACT_DOTA_VERSUS: number;
declare var ACT_DOTA_CAPTURE_CARD: number;
declare var ACT_DOTA_MK_SPRING_SOAR: number;
declare var ACT_DOTA_MK_SPRING_END: number;
declare var ACT_DOTA_MK_TREE_SOAR: number;
declare var ACT_DOTA_MK_TREE_END: number;
declare var ACT_DOTA_MK_FUR_ARMY: number;
declare var ACT_DOTA_MK_SPRING_CAST: number;
declare var ACT_DOTA_NECRO_GHOST_SHROUD: number;
declare var ACT_DOTA_OVERRIDE_ARCANA: number;
declare var ACT_DOTA_SLIDE: number;
declare var ACT_DOTA_SLIDE_LOOP: number;
declare var AE_EMPTY: number;
declare var AE_NPC_LEFTFOOT: number;
declare var AE_NPC_RIGHTFOOT: number;
declare var AE_NPC_BODYDROP_LIGHT: number;
declare var AE_NPC_BODYDROP_HEAVY: number;
declare var AE_NPC_SWISHSOUND: number;
declare var AE_NPC_180TURN: number;
declare var AE_NPC_ITEM_PICKUP: number;
declare var AE_NPC_WEAPON_DROP: number;
declare var AE_NPC_WEAPON_SET_SEQUENCE_NAME: number;
declare var AE_NPC_WEAPON_SET_SEQUENCE_NUMBER: number;
declare var AE_NPC_WEAPON_SET_ACTIVITY: number;
declare var AE_NPC_HOLSTER: number;
declare var AE_NPC_DRAW: number;
declare var AE_NPC_WEAPON_FIRE: number;
declare var AE_CL_PLAYSOUND: number;
declare var AE_CL_PLAYSOUND_ATTACHMENT: number;
declare var AE_SV_PLAYSOUND: number;
declare var AE_CL_STOPSOUND: number;
declare var AE_START_SCRIPTED_EFFECT: number;
declare var AE_STOP_SCRIPTED_EFFECT: number;
declare var AE_CLIENT_EFFECT_ATTACH: number;
declare var AE_MUZZLEFLASH: number;
declare var AE_NPC_MUZZLEFLASH: number;
declare var AE_THUMPER_THUMP: number;
declare var AE_AMMOCRATE_PICKUP_AMMO: number;
declare var AE_NPC_RAGDOLL: number;
declare var AE_NPC_ADDGESTURE: number;
declare var AE_NPC_RESTARTGESTURE: number;
declare var AE_NPC_ATTACK_BROADCAST: number;
declare var AE_NPC_HURT_INTERACTION_PARTNER: number;
declare var AE_NPC_SET_INTERACTION_CANTDIE: number;
declare var AE_SV_DUSTTRAIL: number;
declare var AE_CL_CREATE_PARTICLE_EFFECT: number;
declare var AE_CL_STOP_PARTICLE_EFFECT: number;
declare var AE_CL_ADD_PARTICLE_EFFECT_CP: number;
declare var AE_CL_CREATE_PARTICLE_BRASS: number;
declare var AE_RAGDOLL: number;
declare var AE_CL_ENABLE_BODYGROUP: number;
declare var AE_CL_DISABLE_BODYGROUP: number;
declare var AE_CL_BODYGROUP_SET_VALUE: number;
declare var AE_CL_BODYGROUP_SET_VALUE_CMODEL_WPN: number;
declare var AE_WPN_PRIMARYATTACK: number;
declare var AE_WPN_INCREMENTAMMO: number;
declare var AE_WPN_HIDE: number;
declare var AE_WPN_UNHIDE: number;
declare var AE_WPN_PLAYWPNSOUND: number;
declare var AE_MARINE_FOOTSTEP: number;
declare var AE_MARINE_RELOAD_SOUND_A: number;
declare var AE_MARINE_RELOAD_SOUND_B: number;
declare var AE_MARINE_RELOAD_SOUND_C: number;
declare var AE_REMOVE_CLIENT_AIM: number;
declare var AE_FOOTSTEP_LEFT: number;
declare var AE_FOOTSTEP_RIGHT: number;
declare var AE_ATTACK_START: number;
declare var AE_ATTACK_HIT: number;
declare var AE_ATTACK_END: number;
declare var AE_OPTIONAL_END: number;
declare var AE_HIDE_WEAPON: number;
declare var AE_SHOW_WEAPON: number;
declare var AE_PICKUP_CLIPIN: number;
declare var AE_PICKUP_CHARGING: number;
declare var AE_PICKUP_FASSIST: number;
declare var AE_RELOAD_CLIPOUT: number;
declare var AE_RELOAD_CLIPIN: number;
declare var AE_RELOAD_EMPTY_CLIPOUT: number;
declare var AE_RELOAD_EMPTY_CLIPIN: number;
declare var AE_RELOAD_EMPTY_CLIPIN2: number;
declare var AE_RELOAD_SHELL_INSERT: number;
declare var AE_RELOAD_PUMPEND: number;
declare var AE_LOCK_STATE_CHANGED: number;
declare var AE_TUG_INCAP: number;
declare var AE_CHARGER_POUND_IMPACT: number;
declare var AE_CHARGER_POUND_VOCALIZE: number;
declare var AE_CHARGER_POUND_SOUND: number;
declare var AE_DEFIBRILLATOR_SHOCK: number;
declare var AE_HIT_HEAD_FRONT: number;
declare var AE_HIT_HEAD_BACK: number;
declare var AE_HIT_STOMACH: number;
declare var AE_HIT_CHEST: number;
declare var AE_HIT_BACK_UPPER: number;
declare var AE_HIT_BACK_LOWER: number;
declare var AE_HIT_SHOULDER_RIGHT_FRONT: number;
declare var AE_HIT_SHOULDER_RIGHT_BACK: number;
declare var AE_HIT_SHOULDER_LEFT_FRONT: number;
declare var AE_HIT_SHOULDER_LEFT_BACK: number;
declare var AE_HIT_LEG_RIGHT_FRONT: number;
declare var AE_HIT_LEG_RIGHT_BACK: number;
declare var AE_HIT_LEG_LEFT_FRONT: number;
declare var AE_HIT_LEG_LEFT_BACK: number;
declare var AE_HIT_ARM_RIGHT_SEVERED: number;
declare var AE_HIT_ARM_LEFT_SEVERED: number;
declare var AE_HIT_LEG_RIGHT_SEVERED: number;
declare var AE_HIT_LEG_LEFT_SEVERED: number;
declare var AE_HIT_FRONT: number;
declare var AE_HIT_BACK: number;
declare var AE_HIT_LEFT: number;
declare var AE_HIT_RIGHT: number;
declare var AE_FIRE_INPUT: number;
declare var AE_SV_FOOTSTEP_LEFT: number;
declare var AE_SV_FOOTSTEP_RIGHT: number;
declare var AE_CL_FOOTSTEP_LEFT: number;
declare var AE_CL_FOOTSTEP_RIGHT: number;
declare var AE_CL_MFOOTSTEP_LEFT: number;
declare var AE_CL_MFOOTSTEP_RIGHT: number;
declare var AE_CL_MFOOTSTEP_LEFT_LOUD: number;
declare var AE_CL_MFOOTSTEP_RIGHT_LOUD: number;
declare var AE_WEAPON_MELEE_HIT: number;
declare var AE_WEAPON_SMG1: number;
declare var AE_WEAPON_MELEE_SWISH: number;
declare var AE_WEAPON_SHOTGUN_FIRE: number;
declare var AE_WEAPON_THROW: number;
declare var AE_WEAPON_AR1: number;
declare var AE_WEAPON_AR2: number;
declare var AE_WEAPON_HMG1: number;
declare var AE_WEAPON_SMG2: number;
declare var AE_WEAPON_MISSILE_FIRE: number;
declare var AE_WEAPON_SNIPER_RIFLE_FIRE: number;
declare var AE_WEAPON_AR2_GRENADE: number;
declare var AE_WEAPON_THROW2: number;
declare var AE_WEAPON_PISTOL_FIRE: number;
declare var AE_WEAPON_RELOAD: number;
declare var AE_WEAPON_THROW3: number;
declare var AE_WEAPON_RELOAD_SOUND: number;
declare var AE_WEAPON_RELOAD_FILL_CLIP: number;
declare var AE_WEAPON_SMG1_BURST1: number;
declare var AE_WEAPON_SMG1_BURSTN: number;
declare var AE_WEAPON_AR2_ALTFIRE: number;
declare var AE_WEAPON_SEQUENCE_FINISHED: number;
declare var AE_CL_SPEECH: number;
declare var AE_MELEE_START_COLLISION_DAMAGE: number;
declare var AE_MELEE_STOP_COLLISION_DAMAGE: number;
declare var AE_MELEE_FORCE_START_WEAPON_TRAIL: number;
declare var AE_MELEE_FORCE_STOP_WEAPON_TRAIL: number;
declare var AE_ACTION_ENTERING_IDLE: number;
declare var AE_ACTION_OVERLAP_MOVE: number;
declare var AE_ACTION_ALLOW_MOVE_INTERRUPT: number;
declare var AE_ACTION_AVOID_DAMAGE: number;
declare var AE_ACTION_STOP_AVOIDING_DAMAGE: number;
declare var AE_ACTION_SET_TURN_RATE_SCALE: number;
declare var AE_ACTION_ALLOW_COMBO: number;
declare var AE_ACTION_PREVENT_COMBO: number;
declare var AE_ACTION_ALLOW_DODGE: number;
declare var AE_ACTION_PREVENT_DODGE: number;
declare var AE_ABILITY_START_EVENT: number;
declare var AE_ABILITY_END_EVENT: number;
declare var AE_ABILITY_TICK: number;
declare var AE_ACTION_START_TURN: number;
declare var AE_ACTION_END_TURN: number;
declare var AE_ACTION_USE: number;
declare var AE_SHEATHE_WEAPONS: number;
declare var AE_DRAW_WEAPONS: number;
declare var AE_PICK_UP_ITEM: number;
declare var AE_DROP_ITEM: number;
declare var AE_TOSS_ITEM: number;
declare var AE_EF_NODRAW: number;
declare var AE_EF_DRAW: number;
declare var AE_WEAPON_SLAM_GROUND: number;
declare var AE_MANTLE_LEAP: number;
declare var AE_MANTLE_GRAB: number;
declare var AE_DROP_PRIMARY_WEAPON: number;
declare var AE_CL_PLAYSOUND_POSITION: number;
declare var AE_KEYFIELD_SOUND: number;
declare var AE_ACTION_DROP_ITEM: number;
declare var AE_SCRIPT_EVENT_NOINTERRUPT: number;
declare var AE_SCRIPT_EVENT_CANINTERRUPT: number;
declare var AE_SCRIPT_EVENT_FIREEVENT: number;
declare var AE_SCRIPT_EVENT_DEAD: number;
declare var AE_SCRIPT_EVENT_NOT_DEAD: number;
declare var AE_SCRIPT_EVENT_FIRE_INPUT: number;
declare var AE_NPC_BECOME_TEMPORARY_RAGDOLL: number;
declare var AE_CL_PLAYSOUND_LOOPING: number;
declare var AE_IK_SET_LOCK_ROTATION_ALPHA: number;
declare var AE_IK_ALLOW_PLANE_TILT_NORMAL_UPDATES: number;
declare var DMG_GENERIC: number;
declare var DMG_CRUSH: number;
declare var DMG_BULLET: number;
declare var DMG_SLASH: number;
declare var DMG_BURN: number;
declare var DMG_VEHICLE: number;
declare var DMG_FALL: number;
declare var DMG_BLAST: number;
declare var DMG_CLUB: number;
declare var DMG_SHOCK: number;
declare var DMG_SONIC: number;
declare var DMG_ENERGYBEAM: number;
declare var DMG_PREVENT_PHYSICS_FORCE: number;
declare var DMG_NEVERGIB: number;
declare var DMG_ALWAYSGIB: number;
declare var DMG_DROWN: number;
declare var DMG_PARALYZE: number;
declare var DMG_NERVEGAS: number;
declare var DMG_POISON: number;
declare var DMG_RADIATION: number;
declare var DMG_DROWNRECOVER: number;
declare var DMG_ACID: number;
declare var DMG_SLOWBURN: number;
declare var DMG_REMOVENORAGDOLL: number;
declare var DMG_PHYSGUN: number;
declare var DMG_PLASMA: number;
declare var DMG_AIRBOAT: number;
declare var DMG_DISSOLVE: number;
declare var DMG_BLAST_SURFACE: number;
declare var DMG_DIRECT: number;
declare var DMG_BUCKSHOT: number;
declare var EMPTY: number;
declare var SINGLE_SHOT: number;
declare var SINGLE_SHOT_NPC: number;
declare var DOUBLE_SHOT: number;
declare var DOUBLE_SHOT_NPC: number;
declare var BURST: number;
declare var RELOAD: number;
declare var RELOAD_NPC: number;
declare var MELEE_MISS: number;
declare var MELEE_HIT: number;
declare var MELEE_HIT_WORLD: number;
declare var SPECIAL1: number;
declare var SPECIAL2: number;
declare var SPECIAL3: number;
declare var TAUNT: number;
declare var FASTRELOAD: number;
declare var Entities: CEntities;
declare var Convars: Convars;
declare var GlobalSys: GlobalSys;
declare var FCVAR_UNREGISTERED: number;
declare var FCVAR_DEVELOPMENTONLY: number;
declare var FCVAR_HIDDEN: number;
declare var FCVAR_PROTECTED: number;
declare var FCVAR_SPONLY: number;
declare var FCVAR_ARCHIVE: number;
declare var FCVAR_NOTIFY: number;
declare var FCVAR_USERINFO: number;
declare var FCVAR_PRINTABLEONLY: number;
declare var FCVAR_UNLOGGED: number;
declare var FCVAR_NEVER_AS_STRING: number;
declare var FCVAR_REPLICATED: number;
declare var FCVAR_CHEAT: number;
declare var FCVAR_SS: number;
declare var FCVAR_DEMO: number;
declare var FCVAR_DONTRECORD: number;
declare var FCVAR_NOT_CONNECTED: number;
declare var FCVAR_VCONSOLE_SET_FOCUS: number;
declare var ACTIVATE_TYPE_INITIAL_CREATION: number;
declare var ACTIVATE_TYPE_DATAUPDATE_CREATION: number;
declare var ACTIVATE_TYPE_ONRESTORE: number;
declare var PATTACH_ABSORIGIN: number;
declare var PATTACH_ABSORIGIN_FOLLOW: number;
declare var PATTACH_CUSTOMORIGIN: number;
declare var PATTACH_CUSTOMORIGIN_FOLLOW: number;
declare var PATTACH_POINT: number;
declare var PATTACH_POINT_FOLLOW: number;
declare var PATTACH_EYES_FOLLOW: number;
declare var PATTACH_OVERHEAD_FOLLOW: number;
declare var PATTACH_WORLDORIGIN: number;
declare var PATTACH_ROOTBONE_FOLLOW: number;
declare var PATTACH_RENDERORIGIN_FOLLOW: number;
declare var MAX_PATTACH_TYPES: number;
declare var SERVER_DLL: number;
declare var vec3_origin: Vector;
declare var vec3_invalid: Vector;
declare var DOTA_ITEM_MAX: number;
declare var DOTA_ITEM_INVENTORY_SIZE: number;
declare var DOTA_ITEM_STASH_SIZE: number;
declare var DOTA_ITEM_STASH_MIN: number;
declare var DOTA_ITEM_STASH_MAX: number;
declare var DOTA_ITEM_TRANSIENT_ITEM: number;
declare var DOTA_ITEM_TRANSIENT_RECIPE: number;
declare var DOTA_ITEM_TRANSIENT_CAST_ITEM: number;
declare var DOTA_GC_TEAM_GOOD_GUYS: number;
declare var DOTA_GC_TEAM_BAD_GUYS: number;
declare var DOTA_GC_TEAM_BROADCASTER: number;
declare var DOTA_GC_TEAM_SPECTATOR: number;
declare var DOTA_GC_TEAM_PLAYER_POOL: number;
declare var DOTA_GC_TEAM_NOTEAM: number;
declare var DOTA_CONNECTION_STATE_UNKNOWN: number;
declare var DOTA_CONNECTION_STATE_NOT_YET_CONNECTED: number;
declare var DOTA_CONNECTION_STATE_CONNECTED: number;
declare var DOTA_CONNECTION_STATE_DISCONNECTED: number;
declare var DOTA_CONNECTION_STATE_ABANDONED: number;
declare var DOTA_CONNECTION_STATE_LOADING: number;
declare var DOTA_CONNECTION_STATE_FAILED: number;
declare var DOTA_UNIT_ORDER_NONE: number;
declare var DOTA_UNIT_ORDER_MOVE_TO_POSITION: number;
declare var DOTA_UNIT_ORDER_MOVE_TO_TARGET: number;
declare var DOTA_UNIT_ORDER_ATTACK_MOVE: number;
declare var DOTA_UNIT_ORDER_ATTACK_TARGET: number;
declare var DOTA_UNIT_ORDER_CAST_POSITION: number;
declare var DOTA_UNIT_ORDER_CAST_TARGET: number;
declare var DOTA_UNIT_ORDER_CAST_TARGET_TREE: number;
declare var DOTA_UNIT_ORDER_CAST_NO_TARGET: number;
declare var DOTA_UNIT_ORDER_CAST_TOGGLE: number;
declare var DOTA_UNIT_ORDER_HOLD_POSITION: number;
declare var DOTA_UNIT_ORDER_TRAIN_ABILITY: number;
declare var DOTA_UNIT_ORDER_DROP_ITEM: number;
declare var DOTA_UNIT_ORDER_GIVE_ITEM: number;
declare var DOTA_UNIT_ORDER_PICKUP_ITEM: number;
declare var DOTA_UNIT_ORDER_PICKUP_RUNE: number;
declare var DOTA_UNIT_ORDER_PURCHASE_ITEM: number;
declare var DOTA_UNIT_ORDER_SELL_ITEM: number;
declare var DOTA_UNIT_ORDER_DISASSEMBLE_ITEM: number;
declare var DOTA_UNIT_ORDER_MOVE_ITEM: number;
declare var DOTA_UNIT_ORDER_CAST_TOGGLE_AUTO: number;
declare var DOTA_UNIT_ORDER_STOP: number;
declare var DOTA_UNIT_ORDER_TAUNT: number;
declare var DOTA_UNIT_ORDER_BUYBACK: number;
declare var DOTA_UNIT_ORDER_GLYPH: number;
declare var DOTA_UNIT_ORDER_EJECT_ITEM_FROM_STASH: number;
declare var DOTA_UNIT_ORDER_CAST_RUNE: number;
declare var DOTA_UNIT_ORDER_PING_ABILITY: number;
declare var DOTA_UNIT_ORDER_MOVE_TO_DIRECTION: number;
declare var DOTA_UNIT_ORDER_PATROL: number;
declare var DOTA_UNIT_ORDER_VECTOR_TARGET_POSITION: number;
declare var DOTA_UNIT_ORDER_RADAR: number;
declare var DOTA_UNIT_ORDER_SET_ITEM_COMBINE_LOCK: number;
declare var DOTA_UNIT_ORDER_CONTINUE: number;
declare var DOTA_UNIT_ORDER_VECTOR_TARGET_CANCELED: number;
declare var DOTA_UNIT_ORDER_CAST_RIVER_PAINT: number;
declare var DOTA_SHOWGENERICPOPUP_TINT_SCREEN: number;
declare var DOTA_SHOWGENERICPOPUP_SHOW_NO_OTHER_DIALOGS: number;
declare var OVERHEAD_ALERT_GOLD: number;
declare var OVERHEAD_ALERT_DENY: number;
declare var OVERHEAD_ALERT_CRITICAL: number;
declare var OVERHEAD_ALERT_XP: number;
declare var OVERHEAD_ALERT_BONUS_SPELL_DAMAGE: number;
declare var OVERHEAD_ALERT_MISS: number;
declare var OVERHEAD_ALERT_DAMAGE: number;
declare var OVERHEAD_ALERT_EVADE: number;
declare var OVERHEAD_ALERT_BLOCK: number;
declare var OVERHEAD_ALERT_BONUS_POISON_DAMAGE: number;
declare var OVERHEAD_ALERT_HEAL: number;
declare var OVERHEAD_ALERT_MANA_ADD: number;
declare var OVERHEAD_ALERT_MANA_LOSS: number;
declare var OVERHEAD_ALERT_LAST_HIT_EARLY: number;
declare var OVERHEAD_ALERT_LAST_HIT_CLOSE: number;
declare var OVERHEAD_ALERT_LAST_HIT_MISS: number;
declare var OVERHEAD_ALERT_MAGICAL_BLOCK: number;
declare var OVERHEAD_ALERT_INCOMING_DAMAGE: number;
declare var OVERHEAD_ALERT_OUTGOING_DAMAGE: number;
declare var OVERHEAD_ALERT_DISABLE_RESIST: number;
declare var OVERHEAD_ALERT_DEATH: number;
declare var EF_NODRAW: number;
declare var HeroList: CScriptHeroList;
declare var GridNav: GridNav;
declare var ProjectileManager: ProjectileManager;
declare var DOTAGameManager: CDOTAGameManager;
declare var ParticleManager: CScriptParticleManager;
declare var FIND_UNITS_EVERYWHERE: number;
declare var FIND_CLOSEST: number;
declare var FIND_FARTHEST: number;
declare var FIND_ANY_ORDER: number;
declare var DOTA_PROJECTILE_ATTACHMENT_NONE: number;
declare var DOTA_PROJECTILE_ATTACHMENT_ATTACK_1: number;
declare var DOTA_PROJECTILE_ATTACHMENT_ATTACK_2: number;
declare var DOTA_PROJECTILE_ATTACHMENT_HITLOCATION: number;
declare var DOTA_PROJECTILE_ATTACHMENT_ATTACK_3: number;
declare var DOTA_PROJECTILE_ATTACHMENT_ATTACK_4: number;
declare var DOTA_PROJECTILE_ATTACHMENT_LAST: number;
declare var NativeFunctions: any;
declare var GameRules: CDOTAGamerules;
declare var Tutorial: CDOTATutorial;
declare var CustomGameEventManager: CCustomGameEventManager;
declare var VoteSystem: CDOTAVoteSystem;
declare var CustomNetTables: CCustomNetTableManager;
declare var CustomUI: CDOTA_CustomUIManager;
declare enum attackfail {
    DOTA_ATTACK_RECORD_FAIL_NO = 0,
    DOTA_ATTACK_RECORD_FAIL_TERRAIN_MISS = 1,
    DOTA_ATTACK_RECORD_FAIL_SOURCE_MISS = 2,
    DOTA_ATTACK_RECORD_FAIL_TARGET_EVADED = 3,
    DOTA_ATTACK_RECORD_FAIL_TARGET_INVULNERABLE = 4,
    DOTA_ATTACK_RECORD_FAIL_TARGET_OUT_OF_RANGE = 5,
    DOTA_ATTACK_RECORD_CANNOT_FAIL = 6
}
declare enum modifierfunction {
    /**
     * GetModifierPreAttack_BonusDamage
     */
    MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE = 0,
    /**
     * GetModifierPreAttack_BonusDamage_Proc
     */
    MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE_PROC = 1,
    /**
     * GetModifierPreAttack_BonusDamagePostCrit
     */
    MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE_POST_CRIT = 2,
    /**
     * GetModifierBaseAttack_BonusDamage
     */
    MODIFIER_PROPERTY_BASEATTACK_BONUSDAMAGE = 3,
    /**
     * GetModifierProcAttack_BonusDamage_Physical
     */
    MODIFIER_PROPERTY_PROCATTACK_BONUS_DAMAGE_PHYSICAL = 4,
    /**
     * GetModifierProcAttack_BonusDamage_Magical
     */
    MODIFIER_PROPERTY_PROCATTACK_BONUS_DAMAGE_MAGICAL = 5,
    /**
     * GetModifierProcAttack_BonusDamage_Pure
     */
    MODIFIER_PROPERTY_PROCATTACK_BONUS_DAMAGE_PURE = 6,
    /**
     * GetModifierProcAttack_Feedback
     */
    MODIFIER_PROPERTY_PROCATTACK_FEEDBACK = 7,
    /**
     * GetModifierOverrideAttackDamage
     */
    MODIFIER_PROPERTY_OVERRIDE_ATTACK_DAMAGE = 8,
    /**
     * GetModifierPreAttack
     */
    MODIFIER_PROPERTY_PRE_ATTACK = 9,
    /**
     * GetModifierInvisibilityLevel
     */
    MODIFIER_PROPERTY_INVISIBILITY_LEVEL = 10,
    /**
     * GetModifierPersistentInvisibility
     */
    MODIFIER_PROPERTY_PERSISTENT_INVISIBILITY = 11,
    /**
     * GetModifierMoveSpeedBonus_Constant
     */
    MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT = 12,
    /**
     * GetModifierMoveSpeedOverride
     */
    MODIFIER_PROPERTY_MOVESPEED_BASE_OVERRIDE = 13,
    /**
     * GetModifierMoveSpeedBonus_Percentage
     */
    MODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE = 14,
    /**
     * GetModifierMoveSpeedBonus_Percentage_Unique
     */
    MODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE_UNIQUE = 15,
    /**
     * GetModifierMoveSpeedBonus_Percentage_Unique_2
     */
    MODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE_UNIQUE_2 = 16,
    /**
     * GetModifierMoveSpeedBonus_Special_Boots
     */
    MODIFIER_PROPERTY_MOVESPEED_BONUS_UNIQUE = 17,
    /**
     * GetModifierMoveSpeedBonus_Special_Boots_2
     */
    MODIFIER_PROPERTY_MOVESPEED_BONUS_UNIQUE_2 = 18,
    /**
     * GetModifierMoveSpeed_Absolute
     */
    MODIFIER_PROPERTY_MOVESPEED_ABSOLUTE = 19,
    /**
     * GetModifierMoveSpeed_AbsoluteMin
     */
    MODIFIER_PROPERTY_MOVESPEED_ABSOLUTE_MIN = 20,
    /**
     * GetModifierMoveSpeed_Limit
     */
    MODIFIER_PROPERTY_MOVESPEED_LIMIT = 21,
    /**
     * GetModifierMoveSpeed_Max
     */
    MODIFIER_PROPERTY_MOVESPEED_MAX = 22,
    /**
     * GetModifierAttackSpeedBaseOverride
     */
    MODIFIER_PROPERTY_ATTACKSPEED_BASE_OVERRIDE = 23,
    /**
     * GetModifierFixedAttackRate
     */
    MODIFIER_PROPERTY_FIXED_ATTACK_RATE = 24,
    /**
     * GetModifierAttackSpeedBonus_Constant
     */
    MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT = 25,
    /**
     * GetModifierCooldownReduction_Constant
     */
    MODIFIER_PROPERTY_COOLDOWN_REDUCTION_CONSTANT = 26,
    /**
     * GetModifierBaseAttackTimeConstant
     */
    MODIFIER_PROPERTY_BASE_ATTACK_TIME_CONSTANT = 27,
    /**
     * GetModifierAttackPointConstant
     */
    MODIFIER_PROPERTY_ATTACK_POINT_CONSTANT = 28,
    /**
     * GetModifierDamageOutgoing_Percentage
     */
    MODIFIER_PROPERTY_DAMAGEOUTGOING_PERCENTAGE = 29,
    /**
     * GetModifierDamageOutgoing_Percentage_Illusion
     */
    MODIFIER_PROPERTY_DAMAGEOUTGOING_PERCENTAGE_ILLUSION = 30,
    /**
     * GetModifierTotalDamageOutgoing_Percentage
     */
    MODIFIER_PROPERTY_TOTALDAMAGEOUTGOING_PERCENTAGE = 31,
    /**
     * GetModifierSpellAmplify_Percentage
     */
    MODIFIER_PROPERTY_SPELL_AMPLIFY_PERCENTAGE = 32,
    /**
     * GetModifierSpellAmplify_PercentageUnique
     */
    MODIFIER_PROPERTY_SPELL_AMPLIFY_PERCENTAGE_UNIQUE = 33,
    /**
     * GetModifierHPRegenAmplify_Percentage
     */
    MODIFIER_PROPERTY_HP_REGEN_AMPLIFY_PERCENTAGE = 34,
    /**
     * GetModifierMPRegenAmplify_Percentage
     */
    MODIFIER_PROPERTY_MP_REGEN_AMPLIFY_PERCENTAGE = 35,
    /**
     * GetModifierMagicDamageOutgoing_Percentage
     */
    MODIFIER_PROPERTY_MAGICDAMAGEOUTGOING_PERCENTAGE = 36,
    /**
     * GetModifierBaseDamageOutgoing_Percentage
     */
    MODIFIER_PROPERTY_BASEDAMAGEOUTGOING_PERCENTAGE = 37,
    /**
     * GetModifierBaseDamageOutgoing_PercentageUnique
     */
    MODIFIER_PROPERTY_BASEDAMAGEOUTGOING_PERCENTAGE_UNIQUE = 38,
    /**
     * GetModifierIncomingDamage_Percentage
     */
    MODIFIER_PROPERTY_INCOMING_DAMAGE_PERCENTAGE = 39,
    /**
     * GetModifierIncomingPhysicalDamage_Percentage
     */
    MODIFIER_PROPERTY_INCOMING_PHYSICAL_DAMAGE_PERCENTAGE = 40,
    /**
     * GetModifierIncomingPhysicalDamageConstant
     */
    MODIFIER_PROPERTY_INCOMING_PHYSICAL_DAMAGE_CONSTANT = 41,
    /**
     * GetModifierIncomingSpellDamageConstant
     */
    MODIFIER_PROPERTY_INCOMING_SPELL_DAMAGE_CONSTANT = 42,
    /**
     * GetModifierEvasion_Constant
     */
    MODIFIER_PROPERTY_EVASION_CONSTANT = 43,
    /**
     * GetModifierNegativeEvasion_Constant
     */
    MODIFIER_PROPERTY_NEGATIVE_EVASION_CONSTANT = 44,
    /**
     * GetModifierStatusResistance
     */
    MODIFIER_PROPERTY_STATUS_RESISTANCE = 45,
    /**
     * GetModifierStatusResistanceStacking
     */
    MODIFIER_PROPERTY_STATUS_RESISTANCE_STACKING = 46,
    /**
     * GetModifierAvoidDamage
     */
    MODIFIER_PROPERTY_AVOID_DAMAGE = 47,
    /**
     * GetModifierAvoidSpell
     */
    MODIFIER_PROPERTY_AVOID_SPELL = 48,
    /**
     * GetModifierMiss_Percentage
     */
    MODIFIER_PROPERTY_MISS_PERCENTAGE = 49,
    /**
     * GetModifierPhysicalArmorBonus
     */
    MODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS = 50,
    /**
     * GetModifierPhysicalArmorBonusUnique
     */
    MODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS_UNIQUE = 51,
    /**
     * GetModifierPhysicalArmorBonusUniqueActive
     */
    MODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS_UNIQUE_ACTIVE = 52,
    /**
     * GetModifierIgnorePhysicalArmor
     */
    MODIFIER_PROPERTY_IGNORE_PHYSICAL_ARMOR = 53,
    /**
     * GetModifierMagicalResistanceDirectModification
     */
    MODIFIER_PROPERTY_MAGICAL_RESISTANCE_DIRECT_MODIFICATION = 54,
    /**
     * GetModifierMagicalResistanceBonus
     */
    MODIFIER_PROPERTY_MAGICAL_RESISTANCE_BONUS = 55,
    /**
     * GetModifierMagicalResistanceDecrepifyUnique
     */
    MODIFIER_PROPERTY_MAGICAL_RESISTANCE_DECREPIFY_UNIQUE = 56,
    /**
     * GetModifierBaseRegen
     */
    MODIFIER_PROPERTY_BASE_MANA_REGEN = 57,
    /**
     * GetModifierConstantManaRegen
     */
    MODIFIER_PROPERTY_MANA_REGEN_CONSTANT = 58,
    /**
     * GetModifierConstantManaRegenUnique
     */
    MODIFIER_PROPERTY_MANA_REGEN_CONSTANT_UNIQUE = 59,
    /**
     * GetModifierTotalPercentageManaRegen
     */
    MODIFIER_PROPERTY_MANA_REGEN_TOTAL_PERCENTAGE = 60,
    /**
     * GetModifierConstantHealthRegen
     */
    MODIFIER_PROPERTY_HEALTH_REGEN_CONSTANT = 61,
    /**
     * GetModifierHealthRegenPercentage
     */
    MODIFIER_PROPERTY_HEALTH_REGEN_PERCENTAGE = 62,
    /**
     * GetModifierHealthRegenPercentageUnique
     */
    MODIFIER_PROPERTY_HEALTH_REGEN_PERCENTAGE_UNIQUE = 63,
    /**
     * GetModifierHealthBonus
     */
    MODIFIER_PROPERTY_HEALTH_BONUS = 64,
    /**
     * GetModifierManaBonus
     */
    MODIFIER_PROPERTY_MANA_BONUS = 65,
    /**
     * GetModifierExtraStrengthBonus
     */
    MODIFIER_PROPERTY_EXTRA_STRENGTH_BONUS = 66,
    /**
     * GetModifierExtraHealthBonus
     */
    MODIFIER_PROPERTY_EXTRA_HEALTH_BONUS = 67,
    /**
     * GetModifierExtraManaBonus
     */
    MODIFIER_PROPERTY_EXTRA_MANA_BONUS = 68,
    /**
     * GetModifierExtraHealthPercentage
     */
    MODIFIER_PROPERTY_EXTRA_HEALTH_PERCENTAGE = 69,
    /**
     * GetModifierBonusStats_Strength
     */
    MODIFIER_PROPERTY_STATS_STRENGTH_BONUS = 70,
    /**
     * GetModifierBonusStats_Agility
     */
    MODIFIER_PROPERTY_STATS_AGILITY_BONUS = 71,
    /**
     * GetModifierBonusStats_Intellect
     */
    MODIFIER_PROPERTY_STATS_INTELLECT_BONUS = 72,
    /**
     * GetModifierCastRangeBonus
     */
    MODIFIER_PROPERTY_CAST_RANGE_BONUS = 73,
    /**
     * GetModifierCastRangeBonusTarget
     */
    MODIFIER_PROPERTY_CAST_RANGE_BONUS_TARGET = 74,
    /**
     * GetModifierCastRangeBonusStacking
     */
    MODIFIER_PROPERTY_CAST_RANGE_BONUS_STACKING = 75,
    /**
     * GetModifierAttackRangeOverride
     */
    MODIFIER_PROPERTY_ATTACK_RANGE_BASE_OVERRIDE = 76,
    /**
     * GetModifierAttackRangeBonus
     */
    MODIFIER_PROPERTY_ATTACK_RANGE_BONUS = 77,
    /**
     * GetModifierAttackRangeBonusUnique
     */
    MODIFIER_PROPERTY_ATTACK_RANGE_BONUS_UNIQUE = 78,
    /**
     * GetModifierMaxAttackRange
     */
    MODIFIER_PROPERTY_MAX_ATTACK_RANGE = 79,
    /**
     * GetModifierProjectileSpeedBonus
     */
    MODIFIER_PROPERTY_PROJECTILE_SPEED_BONUS = 80,
    /**
     * GetModifierProjectileName
     */
    MODIFIER_PROPERTY_PROJECTILE_NAME = 81,
    /**
     * ReincarnateTime
     */
    MODIFIER_PROPERTY_REINCARNATION = 82,
    /**
     * GetModifierConstantRespawnTime
     */
    MODIFIER_PROPERTY_RESPAWNTIME = 83,
    /**
     * GetModifierPercentageRespawnTime
     */
    MODIFIER_PROPERTY_RESPAWNTIME_PERCENTAGE = 84,
    /**
     * GetModifierStackingRespawnTime
     */
    MODIFIER_PROPERTY_RESPAWNTIME_STACKING = 85,
    /**
     * GetModifierPercentageCooldown
     */
    MODIFIER_PROPERTY_COOLDOWN_PERCENTAGE = 86,
    /**
     * GetModifierPercentageCooldownStacking
     */
    MODIFIER_PROPERTY_COOLDOWN_PERCENTAGE_STACKING = 87,
    /**
     * GetModifierPercentageCasttime
     */
    MODIFIER_PROPERTY_CASTTIME_PERCENTAGE = 88,
    /**
     * GetModifierPercentageManacost
     */
    MODIFIER_PROPERTY_MANACOST_PERCENTAGE = 89,
    /**
     * GetModifierPercentageManacostStacking
     */
    MODIFIER_PROPERTY_MANACOST_PERCENTAGE_STACKING = 90,
    /**
     * GetModifierConstantDeathGoldCost
     */
    MODIFIER_PROPERTY_DEATHGOLDCOST = 91,
    /**
     * GetModifierPercentageExpRateBoost
     */
    MODIFIER_PROPERTY_EXP_RATE_BOOST = 92,
    /**
     * GetModifierPreAttack_CriticalStrike
     */
    MODIFIER_PROPERTY_PREATTACK_CRITICALSTRIKE = 93,
    /**
     * GetModifierPreAttack_Target_CriticalStrike
     */
    MODIFIER_PROPERTY_PREATTACK_TARGET_CRITICALSTRIKE = 94,
    /**
     * GetModifierMagical_ConstantBlock
     */
    MODIFIER_PROPERTY_MAGICAL_CONSTANT_BLOCK = 95,
    /**
     * GetModifierPhysical_ConstantBlock
     */
    MODIFIER_PROPERTY_PHYSICAL_CONSTANT_BLOCK = 96,
    /**
     * GetModifierPhysical_ConstantBlockSpecial
     */
    MODIFIER_PROPERTY_PHYSICAL_CONSTANT_BLOCK_SPECIAL = 97,
    /**
     * GetModifierPhysical_ConstantBlockUnavoidablePreArmor
     */
    MODIFIER_PROPERTY_TOTAL_CONSTANT_BLOCK_UNAVOIDABLE_PRE_ARMOR = 98,
    /**
     * GetModifierTotal_ConstantBlock
     */
    MODIFIER_PROPERTY_TOTAL_CONSTANT_BLOCK = 99,
    /**
     * GetOverrideAnimation
     */
    MODIFIER_PROPERTY_OVERRIDE_ANIMATION = 100,
    /**
     * GetOverrideAnimationWeight
     */
    MODIFIER_PROPERTY_OVERRIDE_ANIMATION_WEIGHT = 101,
    /**
     * GetOverrideAnimationRate
     */
    MODIFIER_PROPERTY_OVERRIDE_ANIMATION_RATE = 102,
    /**
     * GetAbsorbSpell
     */
    MODIFIER_PROPERTY_ABSORB_SPELL = 103,
    /**
     * GetReflectSpell
     */
    MODIFIER_PROPERTY_REFLECT_SPELL = 104,
    /**
     * GetDisableAutoAttack
     */
    MODIFIER_PROPERTY_DISABLE_AUTOATTACK = 105,
    /**
     * GetBonusDayVision
     */
    MODIFIER_PROPERTY_BONUS_DAY_VISION = 106,
    /**
     * GetBonusNightVision
     */
    MODIFIER_PROPERTY_BONUS_NIGHT_VISION = 107,
    /**
     * GetBonusNightVisionUnique
     */
    MODIFIER_PROPERTY_BONUS_NIGHT_VISION_UNIQUE = 108,
    /**
     * GetBonusVisionPercentage
     */
    MODIFIER_PROPERTY_BONUS_VISION_PERCENTAGE = 109,
    /**
     * GetFixedDayVision
     */
    MODIFIER_PROPERTY_FIXED_DAY_VISION = 110,
    /**
     * GetFixedNightVision
     */
    MODIFIER_PROPERTY_FIXED_NIGHT_VISION = 111,
    /**
     * GetMinHealth
     */
    MODIFIER_PROPERTY_MIN_HEALTH = 112,
    /**
     * GetAbsoluteNoDamagePhysical
     */
    MODIFIER_PROPERTY_ABSOLUTE_NO_DAMAGE_PHYSICAL = 113,
    /**
     * GetAbsoluteNoDamageMagical
     */
    MODIFIER_PROPERTY_ABSOLUTE_NO_DAMAGE_MAGICAL = 114,
    /**
     * GetAbsoluteNoDamagePure
     */
    MODIFIER_PROPERTY_ABSOLUTE_NO_DAMAGE_PURE = 115,
    /**
     * GetIsIllusion
     */
    MODIFIER_PROPERTY_IS_ILLUSION = 116,
    /**
     * GetModifierIllusionLabel
     */
    MODIFIER_PROPERTY_ILLUSION_LABEL = 117,
    /**
     * GetModifierSuperIllusion
     */
    MODIFIER_PROPERTY_SUPER_ILLUSION = 118,
    /**
     * GetModifierSuperIllusionWithUltimate
     */
    MODIFIER_PROPERTY_SUPER_ILLUSION_WITH_ULTIMATE = 119,
    /**
     * GetModifierTurnRate_Percentage
     */
    MODIFIER_PROPERTY_TURN_RATE_PERCENTAGE = 120,
    /**
     * GetDisableHealing
     */
    MODIFIER_PROPERTY_DISABLE_HEALING = 121,
    /**
     * GetAlwaysAllowAttack
     */
    MODIFIER_PROPERTY_ALWAYS_ALLOW_ATTACK = 122,
    /**
     * GetOverrideAttackMagical
     */
    MODIFIER_PROPERTY_OVERRIDE_ATTACK_MAGICAL = 123,
    /**
     * GetModifierUnitStatsNeedsRefresh
     */
    MODIFIER_PROPERTY_UNIT_STATS_NEEDS_REFRESH = 124,
    /**
     * GetModifierBountyCreepMultiplier
     */
    MODIFIER_PROPERTY_BOUNTY_CREEP_MULTIPLIER = 125,
    /**
     * GetModifierBountyOtherMultiplier
     */
    MODIFIER_PROPERTY_BOUNTY_OTHER_MULTIPLIER = 126,
    /**
     * GetModifierUnitDisllowUpgrading
     */
    MODIFIER_PROPERTY_UNIT_DISALLOW_UPGRADING = 127,
    /**
     * GetModifierDodgeProjectile
     */
    MODIFIER_PROPERTY_DODGE_PROJECTILE = 128,
    /**
     * OnSpellTargetReady
     */
    MODIFIER_EVENT_ON_SPELL_TARGET_READY = 129,
    /**
     * OnAttackRecord
     */
    MODIFIER_EVENT_ON_ATTACK_RECORD = 130,
    /**
     * OnAttackStart
     */
    MODIFIER_EVENT_ON_ATTACK_START = 131,
    /**
     * OnAttack
     */
    MODIFIER_EVENT_ON_ATTACK = 132,
    /**
     * OnAttackLanded
     */
    MODIFIER_EVENT_ON_ATTACK_LANDED = 133,
    /**
     * OnAttackFail
     */
    MODIFIER_EVENT_ON_ATTACK_FAIL = 134,
    /**
     * OnAttackAllied
     */
    MODIFIER_EVENT_ON_ATTACK_ALLIED = 135,
    /**
     * OnProjectileDodge
     */
    MODIFIER_EVENT_ON_PROJECTILE_DODGE = 136,
    /**
     * OnOrder
     */
    MODIFIER_EVENT_ON_ORDER = 137,
    /**
     * OnUnitMoved
     */
    MODIFIER_EVENT_ON_UNIT_MOVED = 138,
    /**
     * OnAbilityStart
     */
    MODIFIER_EVENT_ON_ABILITY_START = 139,
    /**
     * OnAbilityExecuted
     */
    MODIFIER_EVENT_ON_ABILITY_EXECUTED = 140,
    /**
     * OnAbilityFullyCast
     */
    MODIFIER_EVENT_ON_ABILITY_FULLY_CAST = 141,
    /**
     * OnBreakInvisibility
     */
    MODIFIER_EVENT_ON_BREAK_INVISIBILITY = 142,
    /**
     * OnAbilityEndChannel
     */
    MODIFIER_EVENT_ON_ABILITY_END_CHANNEL = 143,
    MODIFIER_EVENT_ON_PROCESS_UPGRADE = 144,
    MODIFIER_EVENT_ON_REFRESH = 145,
    /**
     * OnTakeDamage
     */
    MODIFIER_EVENT_ON_TAKEDAMAGE = 146,
    /**
     * OnStateChanged
     */
    MODIFIER_EVENT_ON_STATE_CHANGED = 147,
    MODIFIER_EVENT_ON_ORB_EFFECT = 148,
    /**
     * OnAttacked
     */
    MODIFIER_EVENT_ON_ATTACKED = 149,
    /**
     * OnDeath
     */
    MODIFIER_EVENT_ON_DEATH = 150,
    /**
     * OnRespawn
     */
    MODIFIER_EVENT_ON_RESPAWN = 151,
    /**
     * OnSpentMana
     */
    MODIFIER_EVENT_ON_SPENT_MANA = 152,
    /**
     * OnTeleporting
     */
    MODIFIER_EVENT_ON_TELEPORTING = 153,
    /**
     * OnTeleported
     */
    MODIFIER_EVENT_ON_TELEPORTED = 154,
    /**
     * OnSetLocation
     */
    MODIFIER_EVENT_ON_SET_LOCATION = 155,
    /**
     * OnHealthGained
     */
    MODIFIER_EVENT_ON_HEALTH_GAINED = 156,
    /**
     * OnManaGained
     */
    MODIFIER_EVENT_ON_MANA_GAINED = 157,
    /**
     * OnTakeDamageKillCredit
     */
    MODIFIER_EVENT_ON_TAKEDAMAGE_KILLCREDIT = 158,
    /**
     * OnHeroKilled
     */
    MODIFIER_EVENT_ON_HERO_KILLED = 159,
    /**
     * OnHealReceived
     */
    MODIFIER_EVENT_ON_HEAL_RECEIVED = 160,
    /**
     * OnBuildingKilled
     */
    MODIFIER_EVENT_ON_BUILDING_KILLED = 161,
    /**
     * OnModelChanged
     */
    MODIFIER_EVENT_ON_MODEL_CHANGED = 162,
    /**
     * OnModifierAdded
     */
    MODIFIER_EVENT_ON_MODIFIER_ADDED = 163,
    /**
     * OnTooltip
     */
    MODIFIER_PROPERTY_TOOLTIP = 164,
    /**
     * GetModifierModelChange
     */
    MODIFIER_PROPERTY_MODEL_CHANGE = 165,
    /**
     * GetModifierModelScale
     */
    MODIFIER_PROPERTY_MODEL_SCALE = 166,
    /**
     * GetModifierScepter
     */
    MODIFIER_PROPERTY_IS_SCEPTER = 167,
    /**
     * GetActivityTranslationModifiers
     */
    MODIFIER_PROPERTY_TRANSLATE_ACTIVITY_MODIFIERS = 168,
    /**
     * GetAttackSound
     */
    MODIFIER_PROPERTY_TRANSLATE_ATTACK_SOUND = 169,
    /**
     * GetUnitLifetimeFraction
     */
    MODIFIER_PROPERTY_LIFETIME_FRACTION = 170,
    /**
     * GetModifierProvidesFOWVision
     */
    MODIFIER_PROPERTY_PROVIDES_FOW_POSITION = 171,
    /**
     * GetModifierSpellsRequireHP
     */
    MODIFIER_PROPERTY_SPELLS_REQUIRE_HP = 172,
    /**
     * GetForceDrawOnMinimap
     */
    MODIFIER_PROPERTY_FORCE_DRAW_MINIMAP = 173,
    /**
     * GetModifierDisableTurning
     */
    MODIFIER_PROPERTY_DISABLE_TURNING = 174,
    /**
     * GetModifierIgnoreCastAngle
     */
    MODIFIER_PROPERTY_IGNORE_CAST_ANGLE = 175,
    /**
     * GetModifierChangeAbilityValue
     */
    MODIFIER_PROPERTY_CHANGE_ABILITY_VALUE = 176,
    /**
     * GetModifierAbilityLayout
     */
    MODIFIER_PROPERTY_ABILITY_LAYOUT = 177,
    /**
     * OnDominated
     */
    MODIFIER_EVENT_ON_DOMINATED = 178,
    /**
     * GetModifierTempestDouble
     */
    MODIFIER_PROPERTY_TEMPEST_DOUBLE = 179,
    /**
     * PreserveParticlesOnModelChanged
     */
    MODIFIER_PROPERTY_PRESERVE_PARTICLES_ON_MODEL_CHANGE = 180,
    /**
     * OnAttackFinished
     */
    MODIFIER_EVENT_ON_ATTACK_FINISHED = 181,
    /**
     * GetModifierIgnoreCooldown
     */
    MODIFIER_PROPERTY_IGNORE_COOLDOWN = 182,
    /**
     * GetModifierCanAttackTrees
     */
    MODIFIER_PROPERTY_CAN_ATTACK_TREES = 183,
    /**
     * GetVisualZDelta
     */
    MODIFIER_PROPERTY_VISUAL_Z_DELTA = 184,
    MODIFIER_PROPERTY_INCOMING_DAMAGE_ILLUSION = 185,
    MODIFIER_FUNCTION_LAST = 186,
    MODIFIER_FUNCTION_INVALID = 255
}
declare enum modifierpriority {
    MODIFIER_PRIORITY_LOW = 0,
    MODIFIER_PRIORITY_NORMAL = 1,
    MODIFIER_PRIORITY_HIGH = 2,
    MODIFIER_PRIORITY_ULTRA = 3,
    MODIFIER_PRIORITY_SUPER_ULTRA = 4
}
declare enum modifierremove {
    DOTA_BUFF_REMOVE_ALL = 0,
    DOTA_BUFF_REMOVE_ENEMY = 1,
    DOTA_BUFF_REMOVE_ALLY = 2
}
declare enum modifierstate {
    MODIFIER_STATE_ROOTED = 0,
    MODIFIER_STATE_DISARMED = 1,
    MODIFIER_STATE_ATTACK_IMMUNE = 2,
    MODIFIER_STATE_SILENCED = 3,
    MODIFIER_STATE_MUTED = 4,
    MODIFIER_STATE_STUNNED = 5,
    MODIFIER_STATE_HEXED = 6,
    MODIFIER_STATE_INVISIBLE = 7,
    MODIFIER_STATE_INVULNERABLE = 8,
    MODIFIER_STATE_MAGIC_IMMUNE = 9,
    MODIFIER_STATE_PROVIDES_VISION = 10,
    MODIFIER_STATE_NIGHTMARED = 11,
    MODIFIER_STATE_BLOCK_DISABLED = 12,
    MODIFIER_STATE_EVADE_DISABLED = 13,
    MODIFIER_STATE_UNSELECTABLE = 14,
    MODIFIER_STATE_CANNOT_TARGET_ENEMIES = 15,
    MODIFIER_STATE_CANNOT_MISS = 16,
    MODIFIER_STATE_SPECIALLY_DENIABLE = 17,
    MODIFIER_STATE_FROZEN = 18,
    MODIFIER_STATE_COMMAND_RESTRICTED = 19,
    MODIFIER_STATE_NOT_ON_MINIMAP = 20,
    MODIFIER_STATE_NOT_ON_MINIMAP_FOR_ENEMIES = 21,
    MODIFIER_STATE_LOW_ATTACK_PRIORITY = 22,
    MODIFIER_STATE_NO_HEALTH_BAR = 23,
    MODIFIER_STATE_FLYING = 24,
    MODIFIER_STATE_NO_UNIT_COLLISION = 25,
    MODIFIER_STATE_NO_TEAM_MOVE_TO = 26,
    MODIFIER_STATE_NO_TEAM_SELECT = 27,
    MODIFIER_STATE_PASSIVES_DISABLED = 28,
    MODIFIER_STATE_DOMINATED = 29,
    MODIFIER_STATE_BLIND = 30,
    MODIFIER_STATE_OUT_OF_GAME = 31,
    MODIFIER_STATE_FAKE_ALLY = 32,
    MODIFIER_STATE_FLYING_FOR_PATHING_PURPOSES_ONLY = 33,
    MODIFIER_STATE_TRUESIGHT_IMMUNE = 34,
    MODIFIER_STATE_UNTARGETABLE = 35,
    MODIFIER_STATE_LAST = 36
}
declare enum quest_text_replace_values_t {
    QUEST_TEXT_REPLACE_VALUE_CURRENT_VALUE = 0,
    QUEST_TEXT_REPLACE_VALUE_TARGET_VALUE = 1,
    QUEST_TEXT_REPLACE_VALUE_ROUND = 2,
    QUEST_TEXT_REPLACE_VALUE_REWARD = 3,
    QUEST_NUM_TEXT_REPLACE_VALUES = 4
}
declare enum subquest_text_replace_values_t {
    SUBQUEST_TEXT_REPLACE_VALUE_CURRENT_VALUE = 0,
    SUBQUEST_TEXT_REPLACE_VALUE_TARGET_VALUE = 1,
    SUBQUEST_NUM_TEXT_REPLACE_VALUES = 2
}
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "modifier_event", callback: (event: {
            eventname: string;
            caster: number;
            ability: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_kill", callback: (event: {
            victim_userid: number;
            killer1_userid: number;
            killer2_userid: number;
            killer3_userid: number;
            killer4_userid: number;
            killer5_userid: number;
            bounty: number;
            neutral: number;
            greevil: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_deny", callback: (event: {
            killer_userid: number;
            victim_userid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_barracks_kill", callback: (event: {
            barracks_id: number;
            killer_playerid: number;
            killer_team: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_tower_kill", callback: (event: {
            killer_userid: number;
            teamnumber: number;
            gold: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_effigy_kill", callback: (event: {
            owner_userid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_roshan_kill", callback: (event: {
            teamnumber: number;
            gold: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_courier_lost", callback: (event: {
            teamnumber: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_courier_respawned", callback: (event: {
            teamnumber: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_glyph_used", callback: (event: {
            teamnumber: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_super_creeps", callback: (event: {
            teamnumber: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_purchase", callback: (event: {
            userid: number;
            item_ability_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_gifted", callback: (event: {
            userid: number;
            item_ability_id: number;
            sourceid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_rune_pickup", callback: (event: {
            userid: number;
            type: number;
            rune: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_rune_spotted", callback: (event: {
            userid: number;
            rune: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_spotted", callback: (event: {
            userid: number;
            item_ability_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_no_battle_points", callback: (event: {
            userid: number;
            reason: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_chat_informational", callback: (event: {
            userid: number;
            type: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_action_item", callback: (event: {
            reason: number;
            itemdef: number;
            message: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_chat_ban_notification", callback: (event: {
            userid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_chat_event", callback: (event: {
            userid: number;
            gold: number;
            message: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_chat_timed_reward", callback: (event: {
            userid: number;
            itmedef: number;
            message: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_pause_event", callback: (event: {
            userid: number;
            value: number;
            message: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_chat_kill_streak", callback: (event: {
            gold: number;
            killer_id: number;
            killer_streak: number;
            killer_multikill: number;
            victim_id: number;
            victim_streak: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_chat_first_blood", callback: (event: {
            gold: number;
            killer_id: number;
            victim_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_chat_assassin_announce", callback: (event: {
            assassin_id: number;
            target_id: number;
            message: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_chat_assassin_denied", callback: (event: {
            assassin_id: number;
            target_id: number;
            message: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_chat_assassin_success", callback: (event: {
            assassin_id: number;
            target_id: number;
            message: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_update_hero_selection", callback: (event: {
            tabcycle: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_update_selected_unit", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_update_query_unit", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_update_killcam_unit", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_take_tower_damage", callback: (event: {
            PlayerID: number;
            damage: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_hud_error_message", callback: (event: {
            reason: number;
            message: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_action_success", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_starting_position_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_money_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_enemy_money_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_portrait_unit_stats_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_portrait_unit_modifiers_changed", callback: (event: {
            modifier_affects_abilities: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_force_portrait_update", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_inventory_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_suggestions_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_estimated_match_duration_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_hero_ability_points_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_picked_up", callback: (event: {
            itemname: string;
            PlayerID: number;
            ItemEntityIndex: number;
            HeroEntityIndex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_inventory_item_changed", callback: (event: {
            entityIndex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_ability_changed", callback: (event: {
            entityIndex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_spectator_talent_changed", callback: (event: {
            abilityname: string;
            playerid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_portrait_ability_layout_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_inventory_item_added", callback: (event: {
            itemname: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_inventory_changed_query_unit", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_link_clicked", callback: (event: {
            link: string;
            nav: boolean;
            nav_back: boolean;
            recipe: number;
            shop: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_set_quick_buy", callback: (event: {
            item: string;
            recipe: number;
            toggle: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_quick_buy_changed", callback: (event: {
            item: string;
            recipe: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_shop_changed", callback: (event: {
            prevshopmask: number;
            shopmask: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_show_killcam", callback: (event: {
            nodes: number;
            player: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_show_minikillcam", callback: (event: {
            nodes: number;
            player: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "gc_user_session_created", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "team_data_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "guild_data_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "guild_open_parties_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "fantasy_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "fantasy_league_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "fantasy_score_info_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "league_admin_info_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "league_series_info_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "player_info_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "player_info_individual_updated", callback: (event: {
            account_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "game_rules_state_change", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "match_history_updated", callback: (event: {
            SteamID: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "match_details_updated", callback: (event: {
            matchID: number;
            result: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "team_details_updated", callback: (event: {
            teamID: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "live_games_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "recent_matches_updated", callback: (event: {
            Page: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "news_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "persona_updated", callback: (event: {
            SteamID: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "tournament_state_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "party_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "lobby_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dashboard_caches_cleared", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "last_hit", callback: (event: {
            PlayerID: number;
            EntKilled: number;
            FirstBlood: boolean;
            HeroKill: boolean;
            TowerKill: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "player_completed_game", callback: (event: {
            PlayerID: number;
            Winner: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "player_reconnected", callback: (event: {
            PlayerID: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "nommed_tree", callback: (event: {
            PlayerID: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_rune_activated_server", callback: (event: {
            PlayerID: number;
            rune: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_gained_level", callback: (event: {
            PlayerID: number;
            level: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_learned_ability", callback: (event: {
            PlayerID: number;
            player: number;
            abilityname: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_used_ability", callback: (event: {
            PlayerID: number;
            abilityname: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_non_player_used_ability", callback: (event: {
            abilityname: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_begin_cast", callback: (event: {
            PlayerID: number;
            abilityname: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_non_player_begin_cast", callback: (event: {
            abilityname: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_ability_channel_finished", callback: (event: {
            abilityname: string;
            interrupted: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_holdout_revive_complete", callback: (event: {
            caster: number;
            target: number;
            channel_time: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_killed", callback: (event: {
            PlayerID: number;
            HeroKill: boolean;
            TowerKill: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "bindpanel_open", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "bindpanel_close", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "keybind_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_drag_begin", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_drag_end", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_shop_item_drag_begin", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_shop_item_drag_end", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_purchased", callback: (event: {
            PlayerID: number;
            itemname: string;
            itemcost: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_combined", callback: (event: {
            PlayerID: number;
            itemname: string;
            itemcost: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_used", callback: (event: {
            PlayerID: number;
            itemname: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_auto_purchase", callback: (event: {
            item_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_unit_event", callback: (event: {
            victim: number;
            attacker: number;
            basepriority: number;
            priority: number;
            eventtype: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_quest_started", callback: (event: {
            questIndex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_quest_completed", callback: (event: {
            questIndex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "gameui_activated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "gameui_hidden", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "player_fullyjoined", callback: (event: {
            userid: number;
            name: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_spectate_hero", callback: (event: {
            entindex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_match_done", callback: (event: {
            winningteam: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_match_done_client", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "set_instructor_group_enabled", callback: (event: {
            group: string;
            enabled: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "joined_chat_channel", callback: (event: {
            channelName: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "left_chat_channel", callback: (event: {
            channelName: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "gc_chat_channel_list_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "today_messages_updated", callback: (event: {
            num_messages: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "file_downloaded", callback: (event: {
            success: boolean;
            local_filename: string;
            remote_url: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "player_report_counts_updated", callback: (event: {
            positive_remaining: number;
            negative_remaining: number;
            positive_total: number;
            negative_total: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "scaleform_file_download_complete", callback: (event: {
            success: boolean;
            local_filename: string;
            remote_url: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "item_purchased", callback: (event: {
            itemid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "gc_mismatched_version", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "demo_skip", callback: (event: {
            playback_tick: number;
            skipto_tick: number;
            user_message_list: any;
            dota_hero_chase_list: any;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "demo_start", callback: (event: {
            dota_combatlog_list: any;
            dota_hero_chase_list: any;
            dota_pick_hero_list: any;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "demo_stop", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "map_shutdown", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_workshop_fileselected", callback: (event: {
            filename: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_workshop_filecanceled", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "rich_presence_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "live_leagues_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_hero_random", callback: (event: {
            userid: number;
            heroid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_river_painted", callback: (event: {
            userid: number;
            riverid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_scan_used", callback: (event: {
            teamnumber: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_rd_chat_turn", callback: (event: {
            userid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_ad_nominated_ban", callback: (event: {
            heroid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_ad_ban", callback: (event: {
            heroid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_ad_ban_count", callback: (event: {
            count: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_favorite_heroes_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "profile_opened", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "profile_closed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "item_preview_closed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dashboard_switched_section", callback: (event: {
            section: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_tournament_item_event", callback: (event: {
            winner_count: number;
            event_type: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_hero_swap", callback: (event: {
            playerid1: number;
            playerid2: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_reset_suggested_items", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "halloween_high_score_received", callback: (event: {
            round: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "halloween_phase_end", callback: (event: {
            phase: number;
            team: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "halloween_high_score_request_failed", callback: (event: {
            round: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_hud_skin_changed", callback: (event: {
            skin: string;
            style: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_inventory_player_got_item", callback: (event: {
            itemname: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "player_is_experienced", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "player_is_notexperienced", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_tutorial_lesson_start", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_tutorial_task_advance", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_tutorial_shop_toggled", callback: (event: {
            shop_opened: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "map_location_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "richpresence_custom_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "game_end_visible", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "enable_china_logomark", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "highlight_hud_element", callback: (event: {
            elementname: string;
            duration: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "hide_highlight_hud_element", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "intro_video_finished", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "matchmaking_status_visibility_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "practice_lobby_visibility_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_courier_transfer_item", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "full_ui_unlocked", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "client_disconnect", callback: (event: {
            reason_code: number;
            reason_desc: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "hero_selector_preview_set", callback: (event: {
            setindex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "antiaddiction_toast", callback: (event: {
            message: string;
            duration: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "hero_picker_shown", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "hero_picker_hidden", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_local_quickbuy_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "show_center_message", callback: (event: {
            message: string;
            duration: number;
            clear_message_queue: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "hud_flip_changed", callback: (event: {
            flipped: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "frosty_points_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "defeated", callback: (event: {
            entindex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "reset_defeated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "booster_state_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "event_points_updated", callback: (event: {
            event_id: number;
            points: number;
            premium_points: number;
            owned: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "local_player_event_points", callback: (event: {
            points: number;
            conversion_rate: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "custom_game_difficulty", callback: (event: {
            difficulty: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "tree_cut", callback: (event: {
            tree_x: number;
            tree_y: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "ugc_details_arrived", callback: (event: {
            published_file_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "ugc_subscribed", callback: (event: {
            published_file_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "ugc_unsubscribed", callback: (event: {
            published_file_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "ugc_download_requested", callback: (event: {
            published_file_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "ugc_installed", callback: (event: {
            published_file_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "prizepool_received", callback: (event: {
            success: boolean;
            prizepool: number;
            leagueid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "microtransaction_success", callback: (event: {
            txnid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_rubick_ability_steal", callback: (event: {
            abilityIndex: number;
            abilityLevel: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "compendium_event_actions_loaded", callback: (event: {
            account_id: number;
            league_id: number;
            local_test: boolean;
            original_points: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "compendium_selections_loaded", callback: (event: {
            account_id: number;
            league_id: number;
            local_test: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "compendium_set_selection_failed", callback: (event: {
            account_id: number;
            league_id: number;
            local_test: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "compendium_trophies_loaded", callback: (event: {
            account_id: number;
            league_id: number;
            local_test: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "community_cached_names_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "spec_item_pickup", callback: (event: {
            player_id: number;
            item_name: string;
            purchase: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "spec_aegis_reclaim_time", callback: (event: {
            reclaim_time: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "account_trophies_changed", callback: (event: {
            account_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "account_all_hero_challenge_changed", callback: (event: {
            account_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "team_showcase_ui_update", callback: (event: {
            show: boolean;
            account_id: number;
            hero_entindex: number;
            display_ui_on_left: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_match_signout", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_illusions_created", callback: (event: {
            original_entindex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_year_beast_killed", callback: (event: {
            killer_player_id: number;
            message: number;
            beast_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_spawned", callback: (event: {
            PlayerID: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_hero_undoselection", callback: (event: {
            playerid1: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_challenge_socache_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_team_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "party_invites_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "lobby_invites_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "custom_game_mode_list_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "custom_game_lobby_list_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "friend_lobby_list_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_team_player_list_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_details_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "player_profile_stats_updated", callback: (event: {
            account_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "custom_game_player_count_updated", callback: (event: {
            custom_game_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "custom_game_friends_played_updated", callback: (event: {
            custom_game_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "custom_games_friends_play_updated", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_update_assigned_hero", callback: (event: {
            playerid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_hero_selection_dirty", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_npc_goal_reached", callback: (event: {
            npc_entindex: number;
            goal_entindex: number;
            next_goal_entindex: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_selected_custom_team", callback: (event: {
            player_id: number;
            team_id: number;
            success: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_coin_wager", callback: (event: {
            userid: number;
            message: number;
            coins: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_wager_token", callback: (event: {
            userid: number;
            message: number;
            amount: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_rank_wager", callback: (event: {
            userid: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "colorblind_mode_changed", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_report_submitted", callback: (event: {
            result: number;
            report_flags: number;
            message: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "client_reload_game_keyvalues", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_hero_inventory_item_change", callback: (event: {
            player_id: number;
            hero_entindex: number;
            item_entindex: number;
            removed: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "game_rules_shutdown", callback: (event: {
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "aegis_event", callback: (event: {
            player_id: number;
            chat_message_type: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_buyback", callback: (event: {
            entindex: number;
            player_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "bought_back", callback: (event: {
            player_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_shrine_kill", callback: (event: {
            killer_userid: number;
            teamnumber: number;
            gold: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "particle_system_start", callback: (event: {
            targetname: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "particle_system_stop", callback: (event: {
            targetname: string;
            immediate: boolean;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_combat_event_message", callback: (event: {
            message: string;
            teamnumber: number;
            player_id: number;
            int_value: number;
            locstring_value: string;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_item_spawned", callback: (event: {
            item_ent_index: number;
            player_id: number;
        }) => void, context: table): EventListenerID;
/**
 * Register as a listener for a game event from script.
 */
declare function ListenToGameEvent(eventName: "dota_player_reconnected", callback: (event: {
            player_id: number;
        }) => void, context: table): EventListenerID;