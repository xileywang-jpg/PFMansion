package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

var (
	port   = flag.String("port", "8080", "服务器监听端口")
	dir    = flag.String("dir", ".", "静态文件目录")
)

func main() {
	flag.Parse()

	// 确保端口目录存在
	staticDir := *dir
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		log.Fatalf("静态文件目录不存在: %s", staticDir)
	}

	// 创建文件服务器
	fs := http.FileServer(http.Dir(staticDir))

	// 主处理器
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 记录请求
		log.Printf("[%s] %s %s", r.Method, r.RemoteAddr, r.URL.Path)

		// 服务静态文件
		fs.ServeHTTP(w, r)
	})

	addr := fmt.Sprintf(":%s", *port)
	log.Printf("🎮 Mansion Protocol 服务器启动")
	absDir, _ := filepath.Abs(staticDir)
	log.Printf("📂 静态文件目录: %s", absDir)
	log.Printf("🌐 访问地址: http://localhost:%s", *port)
	log.Printf("🛑 按 Ctrl+C 停止服务器")
	log.Println("----------------------------------------")

	err := http.ListenAndServe(addr, handler)
	if err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}
