package game

import (
	"sync"
	"time"
)

// ==================== 状态效果 ====================

// StatusEffect 状态效果
type StatusEffect struct {
	Type      string `json:"type"` // INVISIBLE, DISGUISED, PETRIFIED, BURNING, CONFUSED, STEALTH, PHASING, BLESSED, CURSED, MIRROR_REFLECT
	Duration  int    `json:"duration"` // 剩余回合数，-1表示永久
	Source    string `json:"source,omitempty"` // 来源
	Damage    int    `json:"damage,omitempty"` // 燃烧伤害
	Faction   string `json:"faction,omitempty"` // 伪装阵营
	Amount    int    `json:"amount,omitempty"` // 数值
}

// ==================== 玩家结构 ====================

// Player 房间内玩家（连接用）
type Player struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	SessionID string `json:"-"` // WebSocket session ID
	IsReady   bool   `json:"isReady"`
	IsHost    bool   `json:"isHost"`
	Team      string `json:"team"` // HERO, TRAITOR, UNASSIGNED
	IsDead    bool   `json:"isDead"`
}

// ==================== 游戏状态类型 ====================

// Direction 方向
type Direction string

const (
	DirectionNorth Direction = "N"
	DirectionEast  Direction = "E"
	DirectionSouth Direction = "S"
	DirectionWest  Direction = "W"
)

// GamePhase 游戏阶段
type GamePhase string

const (
	GamePhaseExploration GamePhase = "EXPLORATION"
	GamePhaseHauntRoll   GamePhase = "HAUNT_ROLL"
	GamePhaseHauntReveal GamePhase = "HAUNT_REVEAL"
	GamePhaseHaunt       GamePhase = "HAUNT"
	GamePhaseGameOver    GamePhase = "GAME_OVER"
)

// TurnPhase 回合阶段
type TurnPhase string

const (
	TurnPhaseMoving          TurnPhase = "MOVING"
	TurnPhaseEventResolving  TurnPhase = "EVENT_RESOLVING"
	TurnPhaseAttributeCheck  TurnPhase = "ATTRIBUTE_CHECK"  // 等待属性检定
	TurnPhaseChoice         TurnPhase = "CHOICE"           // 等待玩家选择
	TurnPhaseCombatAttack   TurnPhase = "COMBAT_ATTACK"   // 战斗攻击骰
	TurnPhaseCombatDefense  TurnPhase = "COMBAT_DEFENSE"  // 战斗防御骰
	TurnPhaseDone           TurnPhase = "DONE"
)

// PendingAction 待处理动作（用于状态控制）
type PendingAction struct {
	Type      string                 `json:"type"`      // "ATTRIBUTE_CHECK", "CHOICE", "COMBAT"
	Target    string                 `json:"target"`    // 等待哪个玩家输入
	Data      map[string]interface{} `json:"data"`      // 额外数据（attribute, difficulty, eventID 等）
	CardID    string                `json:"cardId,omitempty"` // 关联的卡牌ID
	Message   string                `json:"message,omitempty"` // 显示给玩家的提示
}

// AttributeName 属性类型
type AttributeName string

const (
	AttributeMight     AttributeName = "might"
	AttributeSpeed     AttributeName = "speed"
	AttributeSanity    AttributeName = "sanity"
	AttributeKnowledge AttributeName = "knowledge"
)

// Attribute 属性结构
type Attribute struct {
	Current int   `json:"current"`
	Base    int   `json:"base"`
	Floor   int   `json:"floor"`
	Max     int   `json:"max"`
	// P0 修复：添加 values 和 index 字段，对齐前端
	Values  []int `json:"values"` // 所有可能的值 [floor, floor+1, ..., max]
	Index   int   `json:"index"`  // 当前值在 values 中的索引
}

// CharacterDef 角色定义
type CharacterDef struct {
	ID          string                `json:"id"`
	Name        string               `json:"name"`
	Attributes  map[string]Attribute `json:"attributes"`
	Traits      []string             `json:"traits"`
	Description string               `json:"description"`
}

// GamePlayer 游戏玩家
type GamePlayer struct {
	ID               string            `json:"id"`
	Character        CharacterDef     `json:"character"`
	Position         Position         `json:"position"`
	Items            []Card           `json:"items"`         // P1修复：存储完整物品对象
	DroppedItems     []Card           `json:"droppedItems"`  // P1修复：存储完整物品对象
	IsDead           bool             `json:"isDead"`
	Team             string           `json:"team"`
	Buffs            []string         `json:"buffs"`
	Skills           []string         `json:"skills"`
	SkillPoints      int              `json:"skillPoints"`
	PersonalLogs     []PersonalLog   `json:"personalLogs"` // 个人日志
	StatusEffects   []StatusEffect  `json:"statusEffects"` // 状态效果
	UnlockedSkillNodes []string      `json:"unlockedSkillNodes"` // 已解锁技能节点
	ShowTrail        bool            `json:"showTrail"` // 轨迹显示
}

// PersonalLog 个人日志条目
type PersonalLog struct {
	ID        string `json:"id"`
	Timestamp int64  `json:"timestamp"`
	Text      string `json:"text"`
	Type      string `json:"type"` // info, action, event
}

// Position 位置
type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// TileDef 房间定义
type TileDef struct {
	ID            string                 `json:"id"`
	Name          string                `json:"name"`
	Description   string                `json:"description"`
	Type          string                `json:"type"`
	Floors        []string              `json:"floors"`
	Edges         map[Direction]string  `json:"edges"`
	CardSymbol   string                `json:"cardSymbol,omitempty"`
	EventTrigger string                `json:"eventTrigger,omitempty"`
	Icon          string                `json:"icon,omitempty"` // 图标名称
	// 被动效果
	Effects       []Effect              `json:"effects,omitempty"` // 简化版效果数组
	OnEnterEffects []Effect             `json:"onEnterEffects,omitempty"` // 进入时触发
	OnExitEffects  []Effect             `json:"onExitEffects,omitempty"`  // 离开时触发（暂未实现）
}

// TileInstance 房间实例
type TileInstance struct {
	InstanceID        string                 `json:"instanceId"`
	DefID             string                `json:"defId"`
	X                 int                   `json:"x"`
	Y                 int                   `json:"y"`
	Rotation          int                   `json:"rotation"`
	Edges             map[Direction]string  `json:"edges"`
	HasEventTriggered bool                  `json:"hasEventTriggered"`
	Visibility        string                `json:"visibility"`
	DroppedItems      []Card                `json:"droppedItems"`  // P1修复：存储完整物品对象
}

// CardDef 卡牌定义
type CardDef struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description"`
	CardSymbol  string `json:"cardSymbol,omitempty"`
}

// Scenario 剧本定义
type Scenario struct {
	ID          string          `json:"id"`
	Name        string         `json:"name"`
	IntroText   string         `json:"introText"`
	TraitorRule string         `json:"traitorRule"`
	
	// Phase 3: 目标系统
	HeroObjective    *Objective `json:"heroObjective,omitempty"`
	TraitorObjective *Objective `json:"traitorObjective,omitempty"`
}

// Objective 目标定义
type Objective struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`        // ELIMINATE, SURVIVE, REACH, COLLECT, CONVERT, CUSTOM
	Target      string `json:"target,omitempty"` // 目标ID或类型
	Turns       int    `json:"turns"`          // 达成目标的回合限制
	CustomID    string `json:"customId,omitempty"` // 自定义目标ID
}

// PlayerObjective 玩家个人目标进度
type PlayerObjective struct {
	ObjectiveID string `json:"objectiveId"`
	Progress    int    `json:"progress"`
	Required    int    `json:"required"` // 目标所需进度
	Completed   bool   `json:"completed"`
}

// ==================== NPC 系统 (Phase X: 怪物/爪牙) ====================

// NPCType NPC 怪物类型
type NPCType string

const (
	NPCType_Ghost  NPCType = "GHOST"  // 幽灵
	NPCType_Beast  NPCType = "BEAST"  // 野兽
	NPCType_Spirit NPCType = "SPIRIT" // 怨灵
	NPCType_Zombie NPCType = "ZOMBIE" // 僵尸
)

// NPCDef NPC 定义（模板）
type NPCDef struct {
	ID          string   `json:"id"`           // 模板ID，如 "npc_ghost"
	Name        string   `json:"name"`         // 显示名称
	Type        NPCType  `json:"type"`         // 怪物类型
	Description string   `json:"description"`   // 描述
	Icon        string   `json:"icon"`         // 图标
	// 属性（仅用于显示/ flavor，实际战斗用骰子拼点）
	Might      int `json:"might"`      // 力量
	Speed      int `json:"speed"`      // 速度
	Sanity     int `json:"sanity"`     // 理智
	Knowledge  int `json:"knowledge"`  // 知识
	// 战斗属性
	Health     int `json:"health"`     // 生命值（被击败需要的伤害量）
	// 行为
	CanAttack  bool   `json:"canAttack"`   // 是否可以攻击玩家
	AttackAttr string `json:"attackAttr"` // 攻击使用的属性 (might/speed/sanity/knowledge)
}

// GameNPC 实例化的 NPC（在地图上存在的）
type GameNPC struct {
	InstanceID string   `json:"instanceId"` // 实例ID
	DefID      string   `json:"defId"`     // 模板ID
	Name       string   `json:"name"`      // 显示名称
	Type       NPCType  `json:"type"`      // 怪物类型
	Position   Position `json:"position"`  // 当前位置
	Health     int      `json:"health"`    // 当前生命值
	MaxHealth  int      `json:"maxHealth"` // 最大生命值
	IsDead     bool     `json:"isDead"`    // 是否已死亡
	StatusEffects []StatusEffect `json:"statusEffects"` // 状态效果
}

// NPCDatabase 全局 NPC 模板数据库
var NPCDatabase = map[string]*NPCDef{
	"npc_ghost": {
		ID: "npc_ghost", Name: "幽灵", Type: NPCType_Ghost,
		Description: "一只游荡的幽灵，会吸取玩家的理智",
		Icon: "ghost", Might: 1, Speed: 4, Sanity: 2, Knowledge: 1,
		Health: 2, CanAttack: true, AttackAttr: "sanity",
	},
	"npc_beast": {
		ID: "npc_beast", Name: "野兽", Type: NPCType_Beast,
		Description: "嗜血的野兽，力量惊人",
		Icon: "paw-print", Might: 5, Speed: 3, Sanity: 1, Knowledge: 0,
		Health: 4, CanAttack: true, AttackAttr: "might",
	},
	"npc_spirit": {
		ID: "npc_spirit", Name: "怨灵", Type: NPCType_Spirit,
		Description: "含冤而死的怨灵，行动诡秘",
		Icon: "skull", Might: 2, Speed: 5, Sanity: 3, Knowledge: 2,
		Health: 2, CanAttack: true, AttackAttr: "knowledge",
	},
	"npc_zombie": {
		ID: "npc_zombie", Name: "僵尸", Type: NPCType_Zombie,
		Description: "缓慢但坚韧的不死生物",
		Icon: "heart", Might: 3, Speed: 1, Sanity: 0, Knowledge: 0,
		Health: 5, CanAttack: true, AttackAttr: "might",
	},
}

// GetNPCDef 获取 NPC 模板
func GetNPCDef(defID string) *NPCDef {
	if npc, ok := NPCDatabase[defID]; ok {
		return npc
	}
	return nil
}

// LogEntry 日志条目
type LogEntry struct {
	ID        string `json:"id"`
	Timestamp int64  `json:"timestamp"`
	Text      string `json:"text"`
	Type      string `json:"type"` // info, alert, success, narrative
}

// ==================== 完整游戏状态 (Phase 1: 完整同步) ====================

// GameStateFull 完整游戏状态
type GameStateFull struct {
	// Phase 1: 同步元数据
	Version   int64 `json:"version"`   // 状态版本号，用于同步验证
	Timestamp int64 `json:"timestamp"` // 更新时间戳

	// 游戏阶段
	Phase          GamePhase              `json:"phase"`
	TurnPhase      TurnPhase              `json:"turnPhase"`
	TurnIndex      int                    `json:"turnIndex"`

	// 玩家
	Players        map[string]*GamePlayer `json:"players"`
	PlayerIDs      []string               `json:"playerIds"`
	ActivePlayerID string                 `json:"activePlayerId"`

	// 地图
	Map            map[string]*TileInstance `json:"map"`
	TileDeck       []TileDef              `json:"tileDeck"`

	// 资源
	OmenCount      int    `json:"omenCount"`
	IsHauntActive  bool   `json:"isHauntActive"`
	MovesRemaining int    `json:"movesRemaining"`
	TraitorID      string `json:"traitorId,omitempty"`

	// 剧本
	CurrentScenario  *Scenario `json:"currentScenario,omitempty"`
	LastTriggeredOmen string    `json:"lastTriggeredOmen,omitempty"`
	LastTriggeredTile string    `json:"lastTriggeredTile,omitempty"`
	
	// Phase 3: 目标系统
	HeroObjectives      map[string]*PlayerObjective `json:"heroObjectives,omitempty"`      // playerID -> PlayerObjective
	TraitorObjectives   map[string]*PlayerObjective `json:"traitorObjectives,omitempty"`   // traitorID -> PlayerObjective
	TurnsSinceHaunt    int             `json:"turnsSinceHaunt,omitempty"`    // 作祟后的回合数
	GameWinner         string          `json:"gameWinner,omitempty"`          // HERO, TRAITOR, NONE
	
	// 日志
	Logs []LogEntry `json:"logs"`

	// 战斗
	LastRollResult *int           `json:"lastRollResult,omitempty"`
	ActiveCombat   *CombatState  `json:"activeCombat,omitempty"`

	// Phase X: NPC/怪物系统
	NPCs     map[string]*GameNPC `json:"npcs"`  // NPC 实例 map，key 是 InstanceID

	// 卡牌系统
	Decks     map[string][]Card `json:"decks"`
	ActiveCard *Card            `json:"activeCard,omitempty"`

	// Phase 1: 等待玩家输入（状态控制）
	PendingAction *PendingAction `json:"pendingAction,omitempty"`

	// Phase 3: 房间放置状态 (前端 <-> 后端同步)
	PendingTile          *TileDef `json:"pendingTile,omitempty"`          // 待放置的房间
	PendingTileRotation  int      `json:"pendingTileRotation,omitempty"` // 旋转角度 (0, 90, 180, 270)
	PendingTargetPos     *Pos     `json:"pendingTargetPos,omitempty"`    // 放置目标位置

	// Phase 3: 移动等待确认
	PendingMoveDirection string   `json:"pendingMoveDirection,omitempty"` // 等待确认的移动方向
}

// Pos 位置坐标
type Pos struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// ToSyncState 转换为同步状态（添加版本信息）
func (g *GameStateFull) ToSyncState() *GameStateFull {
	g.Version = time.Now().UnixMilli()
	g.Timestamp = time.Now().UnixMilli()
	return g
}

// RoomGameState 房间游戏状态
type RoomGameState struct {
	Phase      string          `json:"phase"` // WAITING, PLAYING
	TurnIndex  int             `json:"turnIndex"`
	FullState  *GameStateFull `json:"fullState,omitempty"`
}

// Room 房间结构
type Room struct {
	ID        string              `json:"id"`
	Name      string              `json:"name"`
	Theme     string              `json:"theme"` // 主题: "original" 或 "volantis"
	Players   map[string]*Player `json:"players"`
	GameState *RoomGameState     `json:"gameState"`
	CreatedAt int64              `json:"createdAt"`
	mu        sync.RWMutex
}
