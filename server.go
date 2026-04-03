package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"mansion-protocol/game"
	"mansion-protocol/logger"
	"mansion-protocol/ws"
)

// 全局游戏状态
var gameManager *game.GameManager

func main() {
	port := flag.String("port", "8080", "服务器监听端口")
	addr := flag.String("addr", "", "服务器监听地址 (默认所有)")
	dir := flag.String("dir", ".", "静态文件目录")
	debug := flag.Bool("debug", true, "启用debug模式")
	flag.Parse()

	// 设置日志级别
	if *debug {
		logger.SetLevel("DEBUG")
	} else {
		logger.SetLevel("INFO")
	}

	// 如果没有指定地址，默认监听本地
	if *addr == "" {
		*addr = "0.0.0.0"
	}

	// 加载游戏数据
	if err := game.LoadData(); err != nil {
		logger.Error("数据加载失败，服务器启动终止", map[string]interface{}{"error": err.Error()})
		os.Exit(1)
	}

	// 初始化游戏状态管理器
	gameManager = game.NewGameManager()

	// 启动游戏状态管理协程
	go gameManager.Run()

	// WebSocket hub
	hub := ws.NewHub(gameManager)
	go hub.Run()

	// HTTP 处理
	mux := http.NewServeMux()

	// WebSocket 端点
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ws.HandleWebSocket(hub, w, r)
	})

	// ==================== 日志管理 API ====================

	// 获取日志
	mux.HandleFunc("/api/admin/logs", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			logType := r.URL.Query().Get("type")
			if logType == "" {
				logType = "game"
			}
			lines := 100
			if l := r.URL.Query().Get("lines"); l != "" {
				fmt.Sscanf(l, "%d", &lines)
			}

			logPath := logger.GetLogPath(logType)
			data, err := os.ReadFile(logPath)
			if err != nil {
				http.Error(w, "无法读取日志", http.StatusInternalServerError)
				return
			}

			// 返回最后N行
			allLines := filepath.SplitList(string(data))
			if len(allLines) > lines {
				allLines = allLines[len(allLines)-lines:]
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"logs":  allLines,
				"type":  logType,
				"count": len(allLines),
			})
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// 清空日志
	mux.HandleFunc("/api/admin/logs/delete", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			logType := r.URL.Query().Get("type")
			if logType == "" {
				logType = "all"
			}

			if err := logger.Clear(logType); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"message": "日志已清空: " + logType,
			})
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// 设置日志级别
	mux.HandleFunc("/api/admin/log-level", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			var req struct {
				Level string `json:"level"`
			}
			body, _ := io.ReadAll(r.Body)
			json.Unmarshal(body, &req)

			if req.Level != "" {
				logger.SetLevel(req.Level)
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"level":   logger.GetLevel(),
			})
			return
		} else if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"level": logger.GetLevel(),
			})
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// 前端日志接收
	mux.HandleFunc("/api/admin/frontend-logs", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			var req struct {
				Logs      []map[string]interface{} `json:"logs"`
				SessionID string                   `json:"sessionId"`
				UserID    string                   `json:"userId"`
			}

			body, _ := io.ReadAll(r.Body)
			json.Unmarshal(body, &req)

			if req.Logs == nil || len(req.Logs) == 0 {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "count": 0})
				return
			}

			// 写入前端日志
			logPath := logger.GetLogPath("frontend")
			logDir := filepath.Dir(logPath)
			frontendLogPath := filepath.Join(logDir, "frontend.log")

			f, err := os.OpenFile(frontendLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
			if err == nil {
				defer f.Close()
				for _, entry := range req.Logs {
					logLine, _ := json.Marshal(map[string]interface{}{
						"timestamp": entry["timestamp"],
						"level":     entry["level"],
						"event":     entry["event"],
						"data":      entry["data"],
						"url":       entry["url"],
						"sessionId": req.SessionID,
						"userId":    req.UserID,
					})
					f.WriteString(string(logLine) + "\n")
				}
			}

			logger.Debug("收到前端日志", map[string]interface{}{
				"count": len(req.Logs), "sessionId": req.SessionID, "userId": req.UserID,
			})

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "count": len(req.Logs)})
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// 服务器状态
	mux.HandleFunc("/api/admin/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"uptime":   time.Since(startTime).String(),
			"logLevel": logger.GetLevel(),
			"logPath": map[string]string{
				"game":  logger.GetLogPath("game"),
				"debug": logger.GetLogPath("debug"),
			},
		})
	})

	// ==================== 游戏数据 API ====================
	// 静态卡牌数据（items, omens, skills, events, scenarios, characters, skillTrees, tiles）

	// 获取所有游戏数据
	mux.HandleFunc("/api/game/data/all", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		data := map[string]interface{}{
			"themes":       game.GetEnabledThemes(),
			"defaultTheme": game.GetDefaultThemeID(),
			"tiles": map[string]interface{}{
				"original": game.GetTileDeckByTheme("original"),
				"volantis": game.GetTileDeckByTheme("volantis"),
			},
			"items":      game.GetItems(),
			"omens":      game.GetOmens(),
			"skills":     game.GetSkills(),
			"events":     game.GetEvents(),
			"scenarios":  game.GetScenarios(),
			"skillTrees": game.GetSkillTrees(),
			"characters": map[string]interface{}{
				"original": game.GetCharactersByTheme("original"),
				"volantis": game.GetCharactersByTheme("volantis"),
			},
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300") // 缓存5分钟
		json.NewEncoder(w).Encode(data)
	})

	// 获取物品数据
	mux.HandleFunc("/api/game/data/items", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"items": game.GetItems(),
		})
	})

	// 获取厄运数据
	mux.HandleFunc("/api/game/data/omens", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"omens": game.GetOmens(),
		})
	})

	// 获取技能数据
	mux.HandleFunc("/api/game/data/skills", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"skills": game.GetSkills(),
		})
	})

	// 获取事件数据
	mux.HandleFunc("/api/game/data/events", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"events": game.GetEvents(),
		})
	})

	// 获取剧本数据
	mux.HandleFunc("/api/game/data/scenarios", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"scenarios": game.GetScenarios(),
		})
	})

	// 获取角色数据
	mux.HandleFunc("/api/game/data/characters", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		theme := r.URL.Query().Get("theme")
		if theme == "" {
			theme = "original"
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"characters": game.GetCharactersByTheme(theme),
			"theme":      theme,
		})
	})

	// 获取技能树数据
	mux.HandleFunc("/api/game/data/skill-trees", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"skillTrees": game.GetSkillTrees(),
		})
	})

	// 获取地图数据
	mux.HandleFunc("/api/game/data/tiles", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		theme := r.URL.Query().Get("theme")
		if theme == "" {
			theme = "original"
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"tiles": game.GetTileDeckByTheme(theme),
			"theme": theme,
		})
	})

	// 获取主题列表
	mux.HandleFunc("/api/game/data/themes", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"themes":       game.GetEnabledThemes(),
			"defaultTheme": game.GetDefaultThemeID(),
		})
	})

	// 静态文件服务
	staticDir := *dir
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		logger.Error("静态文件目录不存在", map[string]interface{}{"dir": staticDir})
		log.Fatalf("静态文件目录不存在: %s", staticDir)
	}

	absDir, _ := filepath.Abs(staticDir)
	logger.Info("静态文件目录", map[string]interface{}{"path": absDir})

	// 文件服务器处理
	fileServer := http.FileServer(http.Dir(staticDir))
	mux.Handle("/", fileServer)

	listenAddr := fmt.Sprintf("%s:%s", *addr, *port)
	server := &http.Server{
		Addr:    listenAddr,
		Handler: mux,
	}

	// 优雅关闭
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		logger.Info("正在关闭服务器", nil)
		hub.Broadcast([]byte(`{"type":"server_shutdown"}`))
		server.Close()
	}()

	logger.Info("服务器启动", map[string]interface{}{
		"addr":  *addr,
		"port":  *port,
		"debug": *debug,
	})

	fmt.Println("🎮 Mansion Protocol 服务器启动")
	fmt.Printf("🌐 访问地址: http://%s:%s\n", *addr, *port)
	fmt.Printf("🔌 WebSocket: ws://%s:%s/ws\n", *addr, *port)
	fmt.Printf("🛑 按 Ctrl+C 停止服务器\n")
	fmt.Println("----------------------------------------")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("服务器启动失败", map[string]interface{}{"error": err.Error()})
		log.Fatalf("服务器启动失败: %v", err)
	}

	logger.Info("服务器已关闭", nil)
}

// 记录启动时间
var startTime = time.Now()
