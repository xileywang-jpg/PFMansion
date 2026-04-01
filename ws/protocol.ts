import {
  ActiveRoll,
  CardDef,
  CombatResult,
  CombatState,
  Direction,
  EventCard,
  GameNPC,
  GamePhase,
  Item,
  InteractionState,
  LogEntry,
  PendingAction,
  Player,
  Scenario,
  TileDef,
  TileInstance,
  TurnPhase,
} from '../types';

export type PendingActionDTO = PendingAction;

export interface ActiveCombatDTO {
  attackerId: string;
  defenderId: string;
  attribute: CombatState['attribute'];
  phase: CombatState['phase'];
  attackerRolls?: number[];
  defenderRolls?: number[];
}

export interface SyncedStateDTO {
  phase?: GamePhase;
  turnPhase?: TurnPhase;
  turnIndex?: number;
  players?: Record<string, Player>;
  playerIds?: string[];
  activePlayerId?: string;
  map?: Record<string, TileInstance>;
  tileDeck?: TileDef[];
  movesRemaining?: number;
  omenCount?: number;
  isHauntActive?: boolean;
  traitorId?: string | null;
  activeCard?: EventCard | null;
  decks?: {
    EVENT: CardDef[];
    ITEM: Item[];
    OMEN: Item[];
  };
  lastRollResult?: number | null;
  activeCombat?: ActiveCombatDTO | null;
  combatResult?: CombatResult | null;
  npcs?: Record<string, GameNPC>;
  pendingAction?: PendingActionDTO | null;
  interactionState?: InteractionState | null;
  currentScenario?: Scenario | null;
  lastTriggeredOmen?: string | null;
  lastTriggeredTile?: string | null;
  logs?: LogEntry[];
  heroObjectives?: Record<string, unknown>;
  traitorObjectives?: Record<string, unknown>;
  turnsSinceHaunt?: number;
  gameWinner?: string | null;
  pendingTile?: TileDef | null;
  pendingTargetPos?: { x: number; y: number } | null;
  pendingMoveDirection?: Direction | null;
}

export interface DiceActionResultDTO {
  checkType?: string;
  attribute?: string;
  difficulty?: number;
  result?: number;
  success?: boolean;
  hauntTriggered?: boolean;
}

export interface DiceResultMessageDTO {
  checkType?: string;
  message?: string;
  sum?: number;
  results?: number[];
  actionResult?: DiceActionResultDTO;
  playerId?: string;
}

export interface StateSyncMessageDTO {
  state?: SyncedStateDTO;
  version?: number;
  timestamp?: number;
}

export interface CardDrawnMessageDTO {
  card?: EventCard | Item | null;
  deck?: 'EVENT' | 'ITEM' | 'OMEN';
}

export interface CombatResolvedMessageDTO {
  result?: CombatResult | null;
}

export type GameActionPayload =
  | { actionType: 'move'; direction: string }
  | { actionType: 'place_tile'; direction: string; rotation: number }
  | { actionType: 'cancel_tile_placement' }
  | { actionType: 'end_turn' }
  | { actionType: 'roll_dice'; numDice: number }
  | { actionType: 'modify_stat'; attribute: string; amount: number }
  | { actionType: 'draw_card'; cardType: string }
  | { actionType: 'resolve_event'; choiceIndex: number }
  | { actionType: 'start_combat'; defenderId: string; attribute: string }
  | { actionType: 'resolve_combat' }
  | { actionType: 'dismiss_combat_result' }
  | { actionType: 'use_item'; itemId: string; targetId: string }
  | { actionType: 'execute_skill'; skillId: string; targetId: string }
  | { actionType: 'unlock_skill_node'; nodeId: string }
  | { actionType: 'trigger_buff'; trigger: 'ATTACK' | 'END_TURN' | 'ENTER_ROOM' }
  | { actionType: 'perform_haunt_roll' }
  | { actionType: 'force_haunt' }
  | { actionType: 'pickup_item'; itemId: string }
  | { actionType: 'give_item'; targetId: string; itemId: string }
  | { actionType: 'trade_items'; targetId: string; itemId: string; targetItemId: string }
  | { actionType: 'drop_item'; itemId: string }
  | { actionType: 'interact_wall'; direction: string }
  | { actionType: 'teleport_to_tile'; x: number; y: number }
  | { actionType: 'divination'; action: 'toTop' | 'toBottom' }
  | { actionType: 'execute_tile_interaction'; interactionType: string }
  | { actionType: 'attack_npc'; npcInstanceId: string };

export interface GameActionRequest<TAction extends GameActionPayload = GameActionPayload> {
  type: 'game_action';
  roomId: string;
  action: TAction;
}

export interface StoreSyncSnapshot {
  players: Record<string, Player>;
  activeRoll: ActiveRoll | null;
  lastRollResult: number | null;
  lastCheckSuccess: boolean | null;
  pendingTileRotation: number;
  combatResult: CombatResult | null;
}

export interface SyncedStatePatch {
  phase: GamePhase;
  turnPhase: TurnPhase;
  turnIndex: number;
  players: Record<string, Player>;
  playerIds: string[];
  activePlayerId: string;
  map: Record<string, TileInstance>;
  tileDeck: TileDef[];
  movesRemaining: number;
  omenCount: number;
  isHauntActive: boolean;
  traitorId: string | null;
  activeCard: EventCard | null;
  decks: {
    EVENT: CardDef[];
    ITEM: Item[];
    OMEN: Item[];
  };
  lastRollResult: number | null;
  lastCheckSuccess: boolean | null;
  activeRoll: ActiveRoll | null;
  activeCombat: CombatState | null;
  combatResult: CombatResult | null;
  npcs: Record<string, GameNPC>;
  pendingAction: PendingActionDTO | null;
  interactionState: InteractionState | null;
  currentScenario: Scenario | null;
  lastTriggeredOmen: string | null;
  lastTriggeredTile: string | null;
  logs: LogEntry[];
  heroObjectives: Record<string, unknown>;
  traitorObjectives: Record<string, unknown>;
  turnsSinceHaunt: number;
  gameWinner: string | null;
  pendingTile: TileDef | null;
  pendingTileRotation: number;
  pendingTargetPosition: { x: number; y: number } | null;
  pendingMoveDirection: Direction | null;
}

const DEFAULT_DECKS = { EVENT: [], ITEM: [], OMEN: [] };

export function normalizePendingAction(rawPendingAction: SyncedStateDTO['pendingAction'] | null | undefined): PendingActionDTO | null {
  if (!rawPendingAction) {
    return null;
  }

  const attribute = rawPendingAction.attribute || String(rawPendingAction.data?.attribute || '') || undefined;
  const rawDifficulty = rawPendingAction.difficulty ?? rawPendingAction.data?.difficulty;
  const difficulty = typeof rawDifficulty === 'number' ? rawDifficulty : undefined;
  const eventId = rawPendingAction.eventId || String(rawPendingAction.data?.eventId || rawPendingAction.data?.eventID || '') || undefined;
  const continuation =
    rawPendingAction.continuation ||
    (rawPendingAction.data?.continuation as Record<string, unknown> | undefined) ||
    undefined;
  const successEffects =
    rawPendingAction.successEffects ||
    (rawPendingAction.data?.successEffects as unknown[] | undefined) ||
    undefined;
  const failureEffects =
    rawPendingAction.failureEffects ||
    (rawPendingAction.data?.failureEffects as unknown[] | undefined) ||
    undefined;

  return {
    type: rawPendingAction.type,
    target: rawPendingAction.target,
    data: rawPendingAction.data,
    cardId: rawPendingAction.cardId || undefined,
    message: rawPendingAction.message || undefined,
    attribute,
    difficulty,
    eventId,
    continuation,
    successEffects,
    failureEffects,
  };
}

function normalizeInteractionState(rawInteractionState: SyncedStateDTO['interactionState'] | null | undefined): InteractionState | null {
  if (!rawInteractionState) {
    return null;
  }

  return {
    type: rawInteractionState.type,
    playerId: rawInteractionState.playerId,
    message: rawInteractionState.message || undefined,
    attribute: rawInteractionState.attribute || undefined,
    difficulty: typeof rawInteractionState.difficulty === 'number' ? rawInteractionState.difficulty : undefined,
    eventId: rawInteractionState.eventId || undefined,
    cardId: rawInteractionState.cardId || undefined,
    omenCount: typeof rawInteractionState.omenCount === 'number' ? rawInteractionState.omenCount : undefined,
    attackerId: rawInteractionState.attackerId || undefined,
    defenderId: rawInteractionState.defenderId || undefined,
    combatPhase: rawInteractionState.combatPhase === 'RESULT' ? 'RESULT' : rawInteractionState.combatPhase || undefined,
    attackerRolls: Array.isArray(rawInteractionState.attackerRolls) ? rawInteractionState.attackerRolls : undefined,
    defenderRolls: Array.isArray(rawInteractionState.defenderRolls) ? rawInteractionState.defenderRolls : undefined,
    attackerSum: typeof rawInteractionState.attackerSum === 'number' ? rawInteractionState.attackerSum : undefined,
    defenderSum: typeof rawInteractionState.defenderSum === 'number' ? rawInteractionState.defenderSum : undefined,
    damage: typeof rawInteractionState.damage === 'number' ? rawInteractionState.damage : undefined,
    loser: rawInteractionState.loser || undefined,
    draw: typeof rawInteractionState.draw === 'boolean' ? rawInteractionState.draw : undefined,
    attackerDied: typeof rawInteractionState.attackerDied === 'boolean' ? rawInteractionState.attackerDied : undefined,
    defenderDied: typeof rawInteractionState.defenderDied === 'boolean' ? rawInteractionState.defenderDied : undefined,
    tileId: rawInteractionState.tileId || undefined,
    direction: rawInteractionState.direction || undefined,
    rotation: typeof rawInteractionState.rotation === 'number' ? rawInteractionState.rotation : undefined,
    targetPos: rawInteractionState.targetPos ? { x: rawInteractionState.targetPos.x, y: rawInteractionState.targetPos.y } : undefined,
  };
}

function buildPendingActionActiveRoll(
  interactionState: InteractionState | null,
  pendingAction: PendingActionDTO | null,
  players: Record<string, Player>,
  existingActiveRoll: ActiveRoll | null,
  currentPlayerId: string | null,
): ActiveRoll | null {
  const pendingCheckType = interactionState?.type || pendingAction?.type;
  const pendingTarget = interactionState?.playerId || pendingAction?.target;
  const isServerDrivenCheck =
    (pendingCheckType === 'TILE_ATTRIBUTE_CHECK' || pendingCheckType === 'ATTRIBUTE_CHECK') &&
    pendingTarget === currentPlayerId;

  if (!isServerDrivenCheck) {
    const isSyncedPendingRoll =
      existingActiveRoll?.rollType !== 'HAUNT' &&
      (existingActiveRoll?.id?.startsWith('tile:') || existingActiveRoll?.id?.startsWith('check:'));
    return isSyncedPendingRoll ? null : existingActiveRoll;
  }

  const attributeName = interactionState?.attribute || pendingAction?.attribute || String(pendingAction?.data?.attribute || '属性');
  const rawDifficulty = interactionState?.difficulty ?? pendingAction?.difficulty ?? pendingAction?.data?.difficulty;
  const targetValue = typeof rawDifficulty === 'number' ? rawDifficulty : undefined;
  const diceCount = players[pendingTarget || '']?.character?.attributes?.[attributeName]?.current || 1;
  if (
    existingActiveRoll &&
    existingActiveRoll.attributeName === attributeName &&
    existingActiveRoll.targetValue === targetValue &&
    existingActiveRoll.numberOfDice === diceCount
  ) {
    return existingActiveRoll;
  }

  const rollId = `${pendingCheckType === 'TILE_ATTRIBUTE_CHECK' ? 'tile' : 'check'}:${pendingTarget}:${attributeName}:${targetValue ?? 'na'}`;
  return {
    id: rollId,
    rollType: 'STANDARD',
    attributeName,
    numberOfDice: diceCount,
    targetValue,
    title: `${attributeName} 检定`,
    description: `投掷 ${diceCount} 枚骰子${targetValue !== undefined ? `，目标值为 ${targetValue}` : ''}。`,
    actionLabel: '开始投掷',
    confirmLabel: '继续',
    onComplete: () => {},
  };
}

function buildHauntActiveRoll(
  state: SyncedStateDTO,
  interactionState: InteractionState | null,
  existingActiveRoll: ActiveRoll | null,
  currentPlayerId: string | null,
): ActiveRoll | null {
  const isExistingHauntRoll = existingActiveRoll?.rollType === 'HAUNT';
  const hauntPlayerId = interactionState?.playerId || state.activePlayerId;
  const hauntTargetValue = interactionState?.omenCount ?? state.omenCount;
  const isCurrentPlayerHauntRoll = interactionState?.type === 'HAUNT_ROLL'
    ? hauntPlayerId === currentPlayerId
    : state.phase === GamePhase.HauntRoll && state.activePlayerId === currentPlayerId;

  if (!isCurrentPlayerHauntRoll) {
    return isExistingHauntRoll ? existingActiveRoll : null;
  }

  const targetValue = hauntTargetValue;
  const hauntRoll: ActiveRoll = {
    id: `haunt:${hauntPlayerId}:${targetValue ?? 0}`,
    rollType: 'HAUNT',
    attributeName: '作祟',
    numberOfDice: 6,
    targetValue,
    title: '作祟检定',
    description: `投掷 6 枚骰子，若结果小于当前预兆数 ${targetValue ?? '?'} 则作祟爆发。`,
    actionLabel: '掷出命运骰子',
    confirmLabel: '确认结果',
    onComplete: () => {},
  };

  if (!isExistingHauntRoll) {
    return hauntRoll;
  }

  return {
    ...existingActiveRoll,
    ...hauntRoll,
  };
}

export function normalizeActiveEventCard(rawCard: EventCard | Item | null | undefined): EventCard | null {
  if (!rawCard || rawCard.type !== 'EVENT') {
    return null;
  }

  return rawCard as EventCard;
}

function mergePlayersWithLocalLogs(
  incomingPlayers: Record<string, Player>,
  existingPlayers: Record<string, Player>,
): Record<string, Player> {
  const mergedPlayers = { ...incomingPlayers };

  Object.keys(mergedPlayers).forEach(playerId => {
    if (!mergedPlayers[playerId] || !existingPlayers[playerId]) {
      return;
    }

    const existingLogIds = new Set((mergedPlayers[playerId].personalLogs || []).map(entry => entry.id));
    mergedPlayers[playerId] = {
      ...mergedPlayers[playerId],
      personalLogs: [
        ...(mergedPlayers[playerId].personalLogs || []),
        ...(existingPlayers[playerId].personalLogs || []).filter(entry => !existingLogIds.has(entry.id)),
      ],
    };
  });

  return mergedPlayers;
}

export function buildSyncedStatePatch(
  state: SyncedStateDTO,
  store: StoreSyncSnapshot,
  currentPlayerId: string | null,
  options?: { resetCombatResult?: boolean },
): SyncedStatePatch {
  const mergedPlayers = mergePlayersWithLocalLogs(state.players || {}, store.players || {});
  const activeCombat = state.activeCombat
    ? {
        attackerId: state.activeCombat.attackerId,
        defenderId: state.activeCombat.defenderId,
        attribute: state.activeCombat.attribute,
        phase: state.activeCombat.phase,
        attackerRolls: state.activeCombat.attackerRolls || [],
        defenderRolls: state.activeCombat.defenderRolls || [],
      }
    : null;
  const serverCombatResult = state.combatResult || null;
  const pendingAction = normalizePendingAction(state.pendingAction);
  const interactionState = normalizeInteractionState(state.interactionState);
  const syncedPendingRoll = buildPendingActionActiveRoll(interactionState, pendingAction, mergedPlayers, store.activeRoll, currentPlayerId);
  const syncedHauntRoll = buildHauntActiveRoll(state, interactionState, store.activeRoll, currentPlayerId);
  const syncedActiveRoll = syncedPendingRoll ?? syncedHauntRoll;
  const serverLastRollResult = state.lastRollResult ?? null;
  const isCurrentPlayerServerDrivenCheck =
    pendingAction?.target === currentPlayerId &&
    (pendingAction?.type === 'TILE_ATTRIBUTE_CHECK' || pendingAction?.type === 'ATTRIBUTE_CHECK');
  const lastRollResult =
    serverLastRollResult ??
    (store.activeRoll !== null && !isCurrentPlayerServerDrivenCheck ? store.lastRollResult : null);

  const combatResultFromInteraction = interactionState?.type === 'COMBAT' && interactionState.combatPhase === 'RESULT'
    ? {
        attackerId: interactionState.attackerId || '',
        defenderId: interactionState.defenderId || '',
        attackerRolls: interactionState.attackerRolls || [],
        attackerSum: interactionState.attackerSum ?? 0,
        defenderRolls: interactionState.defenderRolls || [],
        defenderSum: interactionState.defenderSum ?? 0,
        damage: interactionState.damage ?? 0,
        loser: interactionState.loser || '',
        draw: interactionState.draw ?? false,
        attribute: interactionState.attribute || '',
        attackerDied: interactionState.attackerDied ?? false,
        defenderDied: interactionState.defenderDied ?? false,
      }
    : null;

  return {
    phase: state.phase || GamePhase.Exploration,
    turnPhase: state.turnPhase || 'MOVING',
    turnIndex: state.turnIndex || 1,
    players: mergedPlayers,
    playerIds: state.playerIds || [],
    activePlayerId: state.activePlayerId || '',
    map: state.map || {},
    tileDeck: state.tileDeck || [],
    movesRemaining: state.movesRemaining ?? 3,
    omenCount: state.omenCount ?? 0,
    isHauntActive: state.isHauntActive ?? false,
    traitorId: state.traitorId || null,
    activeCard: normalizeActiveEventCard(state.activeCard),
    decks: state.decks || DEFAULT_DECKS,
    lastRollResult,
    lastCheckSuccess: lastRollResult === null ? null : store.lastCheckSuccess,
    activeRoll: syncedActiveRoll,
    activeCombat: activeCombat as CombatState | null,
    combatResult: options?.resetCombatResult ? null : (combatResultFromInteraction || serverCombatResult || null),
    npcs: state.npcs || {},
    pendingAction,
    interactionState,
    currentScenario: state.currentScenario || null,
    lastTriggeredOmen: state.lastTriggeredOmen || null,
    lastTriggeredTile: state.lastTriggeredTile || null,
    logs: state.logs || [],
    heroObjectives: state.heroObjectives || {},
    traitorObjectives: state.traitorObjectives || {},
    turnsSinceHaunt: state.turnsSinceHaunt ?? 0,
    gameWinner: state.gameWinner || null,
    pendingTile: state.pendingTile || null,
    pendingTileRotation: state.pendingTile ? store.pendingTileRotation : 0,
    pendingTargetPosition: state.pendingTargetPos ? { x: state.pendingTargetPos.x, y: state.pendingTargetPos.y } : null,
    pendingMoveDirection: state.pendingMoveDirection || null,
  };
}

export function buildGameActionRequest<TAction extends GameActionPayload>(
  roomId: string,
  action: TAction,
): GameActionRequest<TAction> {
  return {
    type: 'game_action',
    roomId,
    action,
  };
}