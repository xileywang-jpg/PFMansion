package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"mansion-protocol/ws"
	"mansion-protocol/game"
)

// 全局游戏状态
var gameState *game.GameState

func main() {
	port := flag.String("port", "8080", "服务器监听端口")
	dir := flag.String("dir", ".", "静态文件目录")
	flag.Parse()

	// 初始化游戏状态
	gameState = game.NewGameState()

	// 启动游戏状态自动保存/同步协程
	go gameState.Run()

	// WebSocket hub
	hub := ws.NewHub(gameState)
	go hub.Run()

	// HTTP 处理
	mux := http.NewServeMux()
	
	// WebSocket 端点
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ws.HandleWebSocket(hub, w, r)
	})

	// 静态文件服务
	staticDir := *dir
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		log.Fatalf("静态文件目录不存在: %s", staticDir)
	}
	
	absDir, _ := filepath.Abs(staticDir)
	log.Printf("📂 静态文件目录: %s", absDir)

	// 文件服务器处理
	fileServer := http.FileServer(http.Dir(staticDir))
	mux.Handle("/", fileServer)

	addr := fmt.Sprintf(":%s", *port)
	server := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	// 优雅关闭
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Println("🛑 正在关闭服务器...")
		hub.Broadcast([]byte(`{"type":"server_shutdown"}`))
		server.Close()
	}()

	log.Printf("🎮 Mansion Protocol 服务器启动")
	log.Printf("🌐 访问地址: http://localhost:%s", *port)
	log.Printf("🔌 WebSocket: ws://localhost:%s/ws", *port)
	log.Printf("🛑 按 Ctrl+C 停止服务器")
	log.Println("----------------------------------------")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("服务器启动失败: %v", err)
	}
	
	log.Println("👋 服务器已关闭")
}
