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
	Target    string                 `json:"target"`    // 目标玩家ID
	Data      map[string]interface{} `json:"data"` // 额外数据
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
	Completed   bool   `json:"completed"`
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
	HeroObjectives      map[string]int  `json:"heroObjectives,omitempty"`      // playerID -> progress
	TraitorObjectives   map[string]int  `json:"traitorObjectives,omitempty"`   // traitorID -> progress
	TurnsSinceHaunt    int             `json:"turnsSinceHaunt,omitempty"`    // 作祟后的回合数
	GameWinner         string          `json:"gameWinner,omitempty"`          // HERO, TRAITOR, NONE
	
	// 日志
	Logs []LogEntry `json:"logs"`

	// 战斗
	LastRollResult *int           `json:"lastRollResult,omitempty"`
	ActiveCombat   *CombatState  `json:"activeCombat,omitempty"`

	// 卡牌系统
	Decks     map[string][]Card `json:"decks"`
	ActiveCard *Card            `json:"activeCard,omitempty"`

	// Phase 1: 等待玩家输入（状态控制）
	PendingAction *PendingAction `json:"pendingAction,omitempty"`
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
