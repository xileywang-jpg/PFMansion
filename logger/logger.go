package logger

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// 日志级别
const (
	DEBUG = iota
	INFO
	WARN
	ERROR
)

// 日志级别名称
var levelNames = []string{"DEBUG", "INFO", "WARN", "ERROR"}

// Logger 结构体
type Logger struct {
	mu         sync.Mutex
	level      int
	gameLog    *os.File
	debugLog   *os.File
}

// 全局日志器
var defaultLogger *Logger

// 初始化日志
func init() {
	defaultLogger = New()
}

// New 创建新的日志器
func New() *Logger {
	// 创建日志目录
	logDir := os.Getenv("LOG_DIR")
	if logDir == "" {
		logDir = "/var/log/pfmansion"
	}
	
	if err := os.MkdirAll(logDir, 0755); err != nil {
		log.Printf("警告: 无法创建日志目录 %s: %v", logDir, err)
	}

	gameLogPath := filepath.Join(logDir, "game.log")
	debugLogPath := filepath.Join(logDir, "debug.log")

	gameLog, err := os.OpenFile(gameLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		log.Printf("警告: 无法打开游戏日志文件: %v", err)
	}

	debugLog, err := os.OpenFile(debugLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		log.Printf("警告: 无法打开调试日志文件: %v", err)
	}

	return &Logger{
		level:    DEBUG, // 默认debug模式
		gameLog:  gameLog,
		debugLog: debugLog,
	}
}

// SetLevel 设置日志级别
func (l *Logger) SetLevel(level string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	
	switch level {
	case "DEBUG":
		l.level = DEBUG
	case "INFO":
		l.level = INFO
	case "WARN":
		l.level = WARN
	case "ERROR":
		l.level = ERROR
	default:
		l.level = DEBUG
	}
	
	log.Printf("日志级别设置为: %s", level)
}

// GetLevel 获取当前日志级别
func (l *Logger) GetLevel() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return levelNames[l.level]
}

// write 写入日志
func (l *Logger) write(level int, message string, data map[string]interface{}) {
	if level < l.level {
		return
	}

	// 构建日志JSON
	timestamp := time.Now().Format(time.RFC3339)
	logEntry := map[string]interface{}{
		"timestamp": timestamp,
		"level":     levelNames[level],
		"message":   message,
	}
	
	if data != nil {
		logEntry["data"] = data
	}

	logLine, err := json.Marshal(logEntry)
	if err != nil {
		log.Printf("日志序列化失败: %v", err)
		return
	}

	// 控制台输出
	switch level {
	case DEBUG:
		log.Printf("🔍 %s", string(logLine))
	case INFO:
		log.Printf("ℹ️ %s", string(logLine))
	case WARN:
		log.Printf("⚠️ %s", string(logLine))
	case ERROR:
		log.Printf("❌ %s", string(logLine))
	}

	// 写入游戏日志
	if l.gameLog != nil {
		l.gameLog.WriteString(string(logLine) + "\n")
	}

	// 写入调试日志
	if l.debugLog != nil {
		l.debugLog.WriteString(string(logLine) + "\n")
	}
}

// Debug 调试日志
func (l *Logger) Debug(message string, data map[string]interface{}) {
	l.write(DEBUG, message, data)
}

// Info 信息日志
func (l *Logger) Info(message string, data map[string]interface{}) {
	l.write(INFO, message, data)
}

// Warn 警告日志
func (l *Logger) Warn(message string, data map[string]interface{}) {
	l.write(WARN, message, data)
}

// Error 错误日志
func (l *Logger) Error(message string, data map[string]interface{}) {
	l.write(ERROR, message, data)
}

// Close 关闭日志文件
func (l *Logger) Close() {
	if l.gameLog != nil {
		l.gameLog.Close()
	}
	if l.debugLog != nil {
		l.debugLog.Close()
	}
}

// 清空日志
func (l *Logger) Clear(logType string) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	logDir := os.Getenv("LOG_DIR")
	if logDir == "" {
		logDir = "/var/log/pfmansion"
	}

	var filePath string
	if logType == "debug" {
		filePath = filepath.Join(logDir, "debug.log")
	} else {
		filePath = filepath.Join(logDir, "game.log")
	}

	// 关闭现有文件
	if logType == "debug" && l.debugLog != nil {
		l.debugLog.Close()
		l.debugLog = nil
	} else if logType != "debug" && l.gameLog != nil {
		l.gameLog.Close()
		l.gameLog = nil
	}

	// 清空文件
	if err := os.WriteFile(filePath, []byte(""), 0644); err != nil {
		return fmt.Errorf("清空日志失败: %v", err)
	}

	// 重新打开文件
	if logType == "debug" {
		l.debugLog, _ = os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	} else {
		l.gameLog, _ = os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	}

	log.Printf("日志已清空: %s", filePath)
	return nil
}

// 获取日志文件路径
func (l *Logger) GetLogPath(logType string) string {
	logDir := os.Getenv("LOG_DIR")
	if logDir == "" {
		logDir = "/var/log/pfmansion"
	}
	
	if logType == "debug" {
		return filepath.Join(logDir, "debug.log")
	}
	return filepath.Join(logDir, "game.log")
}

// 全局便捷方法
func Debug(message string, data map[string]interface{}) {
	defaultLogger.Debug(message, data)
}

func Info(message string, data map[string]interface{}) {
	defaultLogger.Info(message, data)
}

func Warn(message string, data map[string]interface{}) {
	defaultLogger.Warn(message, data)
}

func Error(message string, data map[string]interface{}) {
	defaultLogger.Error(message, data)
}

func SetLevel(level string) {
	defaultLogger.SetLevel(level)
}

func GetLevel() string {
	return defaultLogger.GetLevel()
}

func Clear(logType string) error {
	return defaultLogger.Clear(logType)
}

func GetLogPath(logType string) string {
	return defaultLogger.GetLogPath(logType)
}

// Close 关闭全局日志
func Close() {
	defaultLogger.Close()
}
