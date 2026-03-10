# 🧪 Mansion Protocol 测试指南

## 1. 测试环境准备

### 1.1 前后端服务启动
```bash
# 1. 启动后端服务器
cd /path/to/PFMansion
go build -o mansion-server server.go
./mansion-server -port 8080

# 2. 启动前端开发服务器 (另一个终端)
npm run dev

# 3. 浏览器访问
http://localhost:5173  # Vite 默认端口
# 或
http://localhost:8080  # 直接访问后端服务
```

### 1.2 浏览器要求
- Chrome 110+
- Edge 110+
- Safari 16.4+
- 支持 WebSocket

---

## 2. 功能测试用例

### 2.1 单机模式测试

| 用例 | 测试步骤 | 预期结果 |
|------|----------|----------|
| 游戏初始化 | 打开游戏页面 | 显示地图、玩家信息、日志 |
| 玩家移动 | 点击方向按钮 | 玩家移动到相邻房间 |
| 放置房间 | 移动到边缘触发放置 | 随机房间放置成功 |
| 回合切换 | 结束回合 | 切换到下一玩家 |
| 投骰子 | 点击骰子区域 | 随机1-6生成 |
| 作祟触发 | 收集6个预兆 | 进入作祟阶段 |
| 剧本揭晓 | 作祟检定失败 | 显示叛徒和剧本 |

### 2.2 联机模式测试

| 用例 | 测试步骤 | 预期结果 |
|------|----------|----------|
| WebSocket连接 | 点击"切换到联机模式" | 显示登录界面 |
| 创建房间 | 输入名字，点击创建 | 房间创建成功，显示房间号 |
| 加入房间 | 另一浏览器输入房间号加入 | 加入成功 |
| 准备状态 | 点击准备按钮 | 状态变为"已准备" |
| 开始游戏 | 房主点击开始游戏 | 所有玩家进入游戏 |
| 状态同步 | 一玩家移动 | 其他玩家看到相同状态 |
| 移动操作 | 当前玩家移动 | 广播给房间内所有玩家 |
| 结束回合 | 点击结束回合 | 切换到下一玩家 |
| 投骰子 | 点击投骰子 | 广播骰子结果 |
| 玩家离开 | 一玩家离开房间 | 其他玩家收到通知 |
| 房间解散 | 房主离开 | 房间解散 |

---

## 3. 多人联机测试详细步骤

### 3.1 双人测试
```bash
# 1. 启动服务器
./mansion-server -port 8080

# 2. 打开两个浏览器标签页
# 标签页1: http://localhost:8080
# 标签页2: http://localhost:8080

# 3. 标签页1操作
- 点击"切换到联机模式"
- 输入名字 "玩家A"
- 点击"进入游戏"
- 创建房间 "测试房间"

# 4. 标签页2操作
- 点击"切换到联机模式"
- 输入名字 "玩家B"
- 点击"进入游戏"
- 输入房间号，加入房间

# 5. 验证
- 双方都看到对方在房间中
- 双方点击"准备"
- 玩家A点击"开始游戏"
- 游戏开始，状态同步
```

### 3.2 压力测试
```bash
# 使用 WebSocket 测试工具或编写脚本模拟多个连接
# 测试场景：
# - 4人同时在线
# - 快速切换回合
# - 同时发送操作
```

---

## 4. 后端 API 测试

### 4.1 使用 curl 测试
```bash
# 1. 创建 WebSocket 连接 (需要 wscat 或类似工具)
# 或者使用测试脚本

# 2. 创建房间
curl -X POST -H "Content-Type: application/json" \
  -d '{"type":"create_room","roomName":"测试","playerName":"玩家A"}' \
  http://localhost:8080/ws

# 3. 列出房间
curl http://localhost:8080/api/rooms
```

### 4.2 编写 Go 测试
```go
// game/logic_test.go
package game

import (
    "testing"
)

func TestRollDice(t *testing.T) {
    gm := NewGameManager()
    results := gm.RollDice(6)
    
    if len(results) != 6 {
        t.Errorf("期望6个骰子, 实际: %d", len(results))
    }
    
    for _, v := range results {
        if v < 1 || v > 6 {
            t.Errorf("骰子值超出范围: %d", v)
        }
    }
}

func TestNextTurn(t *testing.T) {
    // 测试回合切换逻辑
}

func TestHauntTrigger(t *testing.T) {
    // 测试作祟触发逻辑
}
```

---

## 5. 调试技巧

### 5.1 前端调试
```javascript
// 浏览器控制台
// 开启调试日志
localStorage.setItem('debug', 'true')

// 查看 WebSocket 消息
// 打开 Network 面板，筛选 ws://

// 查看游戏状态
console.log(window.gameState)
```

### 5.2 后端调试
```bash
# 启动服务器并查看日志
./mansion-server -port 8080

# 日志会显示：
# - 客户端连接/断开
# - 房间创建/加入/离开
# - 游戏操作
# - 错误信息
```

### 5.3 常见错误排查

| 错误 | 可能原因 | 解决方案 |
|------|----------|----------|
| WebSocket 连接失败 | 服务器未启动 | 启动 mansion-server |
| 房间不存在 | 房间号错误或过期 | 重新创建房间 |
| 状态不同步 | 网络延迟 | 刷新页面重连 |
| 移动失败 | 体力不足/墙壁阻挡 | 检查状态和方向 |
| 开始游戏失败 | 有玩家未准备 | 等待所有玩家准备 |

---

## 6. 自动化测试

### 6.1 单元测试
```bash
# 运行 Go 后端测试
go test ./game/...

# 运行前端测试
npm test
```

### 6.2 集成测试
```bash
# 启动服务器
./mansion-server &

# 运行集成测试脚本
go run test_online.go

# 停止服务器
pkill mansion-server
```

---

## 7. 性能测试

### 7.1 关注指标
- WebSocket 消息延迟 (<100ms)
- 状态同步频率 (每秒)
- 并发连接数 (支持4人)

### 7.2 压力测试工具
```bash
# 使用 wrk 或 ab 进行 HTTP 压力测试
wrk -t4 -c100 http://localhost:8080

# 使用 WebSocket 压测工具
```

---

## 8. 测试检查清单

### 8.1 发布前检查
- [ ] 单机模式所有功能正常
- [ ] 联机模式房间创建/加入正常
- [ ] 状态同步正确
- [ ] 4人同时在线正常
- [ ] 断线重连正常
- [ ] 服务器无内存泄漏
- [ ] 前端构建无错误

### 8.2 回归测试
- [ ] 原单机功能未受影响
- [ ] 前后端通信正常
- [ ] UI 显示正常
