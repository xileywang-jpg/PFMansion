package ws

import (
	"encoding/json"
	"testing"

	"mansion-protocol/game"
)

func newTestHubWithClient() (*Hub, *Client) {
	hub := NewHub(game.NewGameManager())
	client := &Client{
		hub:      hub,
		send:     make(chan []byte, 1),
		roomID:   "room_test",
		playerID: "player_1",
	}
	return hub, client
}

func TestDispatchGameAction_UnknownTypeReturnsError(t *testing.T) {
	hub, client := newTestHubWithClient()
	ctx := &gameActionContext{
		message:    &Message{client: client},
		roomID:     "room_test",
		actionType: "unknown_action",
		action:     map[string]interface{}{},
	}

	handled, err := hub.dispatchGameAction(ctx)
	if err == nil {
		t.Fatal("未知 actionType 应返回错误")
	}
	if handled {
		t.Fatal("未知 actionType 不应标记为已处理")
	}
	if err.Error() != "未知操作类型" {
		t.Fatalf("错误信息不正确: %v", err)
	}
}

func TestDispatchGameAction_RegisteredHandlerValidationError(t *testing.T) {
	hub, client := newTestHubWithClient()
	ctx := &gameActionContext{
		message:    &Message{client: client},
		roomID:     "room_test",
		actionType: "unlock_skill_node",
		action:     map[string]interface{}{},
	}

	handled, err := hub.dispatchGameAction(ctx)
	if err == nil {
		t.Fatal("缺少 nodeId 时应返回错误")
	}
	if handled {
		t.Fatal("参数校验错误不应标记为已处理")
	}
	if err.Error() != "未指定节点ID" {
		t.Fatalf("错误信息不正确: %v", err)
	}
}

func TestHandleGameAction_UnknownTypeSendsError(t *testing.T) {
	hub, client := newTestHubWithClient()
	request := map[string]interface{}{
		"type": "game_action",
		"action": map[string]interface{}{
			"actionType": "unknown_action",
		},
	}
	data, err := json.Marshal(request)
	if err != nil {
		t.Fatalf("构造请求失败: %v", err)
	}

	hub.handleGameAction(&Message{client: client, data: data})

	select {
	case raw := <-client.send:
		var response map[string]interface{}
		if err := json.Unmarshal(raw, &response); err != nil {
			t.Fatalf("解析错误响应失败: %v", err)
		}
		if response["type"] != "error" {
			t.Fatalf("响应类型应为 error, 实际为 %#v", response["type"])
		}
		if response["message"] != "未知操作类型" {
			t.Fatalf("错误消息不正确: %#v", response["message"])
		}
	default:
		t.Fatal("未知 actionType 时应向客户端发送错误响应")
	}
}
