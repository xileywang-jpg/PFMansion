#!/bin/bash
# PFMansion 一键部署脚本
# 用法: ./deploy.sh [dev|prod|start|stop|restart|status]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 配置
PORT_AUTH=5000
PORT_VITE=3000
PORT_GAME=8080

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# 停止所有服务
stop_services() {
    log_info "停止所有服务..."
    pkill -f "node.*auth-service" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "mansion-server" 2>/dev/null || true
    /usr/sbin/nginx -s stop 2>/dev/null || true
    sleep 1
}

# 启动开发模式
start_dev() {
    log_info "启动开发模式..."
    
    # 1. 编译后端 (如有代码改动)
    log_info "编译后端 Go 代码..."
    cd "$SCRIPT_DIR"
    go build -o mansion-server . 2>/dev/null || log_warn "Go 编译跳过 (可能无需编译)"
    
    # 2. 启动鉴权服务
    log_info "启动鉴权服务 ($PORT_AUTH)..."
    cd "$SCRIPT_DIR/auth-service"
    nohup node server.js > /tmp/auth.log 2>&1 &
    sleep 2
    
    # 3. 启动前端开发服务器
    log_info "启动前端开发服务器 ($PORT_VITE)..."
    cd "$SCRIPT_DIR"
    nohup npm run dev > /tmp/vite.log 2>&1 &
    sleep 3
    
    # 4. 启动游戏后端 (监听 0.0.0.0 以便 Nginx 访问)
    log_info "启动游戏后端 ($PORT_GAME)..."
    cd "$SCRIPT_DIR"
    nohup ./mansion-server -port $PORT_GAME -addr 0.0.0.0 -dir . > /tmp/mansion.log 2>&1 &
    sleep 2
    
    # 5. 启动 Nginx
    log_info "启动 Nginx..."
    generate_nginx_conf "dev"
    /usr/sbin/nginx -c /etc/nginx/nginx.conf
    
    show_status
}

# 启动生产模式
start_prod() {
    log_info "启动生产模式..."
    
    # 1. 编译后端 Go 代码
    log_info "编译后端 Go 代码..."
    cd "$SCRIPT_DIR"
    go build -o mansion-server . || log_warn "Go 编译失败，将使用现有二进制"
    
    # 2. 构建前端
    log_info "构建前端..."
    cd "$SCRIPT_DIR"
    npm run build
    
    # 2. 部署静态文件
    log_info "部署静态文件..."
    mkdir -p /var/www/pfmansion
    cp -r dist/* /var/www/pfmansion/
    chown -R www-data:www-data /var/www/pfmansion
    
    # 3. 启动鉴权服务
    log_info "启动鉴权服务 ($PORT_AUTH)..."
    cd "$SCRIPT_DIR/auth-service"
    nohup node server.js > /tmp/auth.log 2>&1 &
    sleep 2
    
    # 4. 启动游戏后端
    log_info "启动游戏后端 ($PORT_GAME)..."
    cd "$SCRIPT_DIR"
    nohup ./mansion-server -port $PORT_GAME -addr 0.0.0.0 -dir /var/www/pfmansion > /tmp/mansion.log 2>&1 &
    sleep 2
    
    # 5. 启动 Nginx
    log_info "启动 Nginx..."
    generate_nginx_conf "prod"
    /usr/sbin/nginx -c /etc/nginx/nginx.conf
    
    show_status
}

# 生成 Nginx 配置
generate_nginx_conf() {
    mode=$1
    NGINX_CONF="/etc/nginx/sites-available/pfmansion"
    
    {
    cat << 'NGINX_EOF'
# Nginx 配置 - PFMansion (自动生成)

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=3r/s;
limit_conn_zone $binary_remote_addr zone=addr_limit:10m;

upstream auth_service {
    server 127.0.0.1:5000;
}

upstream game_backend {
    server 127.0.0.1:8080;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    server_tokens off;

    # 防止目录遍历
    location ~ ^/\. {
        deny all;
    }

    # 登录接口限流
    location = /api/auth/login {
        limit_req zone=login_limit burst=5 nodelay;
        limit_conn addr_limit 3;
        proxy_pass http://auth_service;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 注册接口限流
    location = /api/auth/register {
        limit_req zone=login_limit burst=3 nodelay;
        limit_conn addr_limit 2;
        proxy_pass http://auth_service;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # API 通用
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn addr_limit 10;
        proxy_pass http://auth_service;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        limit_conn addr_limit 5;
        proxy_pass http://game_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_buffering off;
    }

    # 前端页面
    location / {
NGINX_EOF

    if [ "$mode" = "dev" ]; then
        cat << 'NGINX_EOF'
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
NGINX_EOF
    else
        cat << 'NGINX_EOF'
        root /var/www/pfmansion;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 静态资源缓存
        location /assets {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
NGINX_EOF
    fi

    cat << 'NGINX_EOF'
    }

    # 健康检查
    location = /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # 错误页面
    error_page 429 /429.html;
    location = /429.html {
        return 429 '{"error": "请求过于频繁，请稍后再试"}';
        add_header Content-Type application/json;
    }
}
NGINX_EOF

    } > "$NGINX_CONF"

    # 启用站点
    rm -f /etc/nginx/sites-enabled/pfmansion
    ln -s "$NGINX_CONF" /etc/nginx/sites-enabled/pfmansion
    
    log_info "Nginx 配置已生成 ($mode 模式)"
}

# 查看状态
show_status() {
    echo ""
    echo "========================================"
    echo -e "${GREEN}服务状态${NC}"
    echo "========================================"
    
    for port in 80 3000 5000 8080; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            echo -e "$port: ${GREEN}运行中${NC}"
        else
            echo -e "$port: ${RED}未运行${NC}"
        fi
    done
    
    echo ""
    echo "测试账号: sifere / meow123"
    echo "========================================"
}

# 主命令
case "${1:-status}" in
    dev)
        stop_services
        start_dev
        ;;
    prod)
        stop_services
        start_prod
        ;;
    start)
        if [ -d "$SCRIPT_DIR/dist" ] && [ -f "$SCRIPT_DIR/dist/index.html" ]; then
            log_info "检测到构建产物，启动生产模式..."
            start_prod
        else
            log_info "无构建产物，启动开发模式..."
            start_dev
        fi
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 1
        cd "$SCRIPT_DIR"
        if [ -d "dist" ] && [ -f "dist/index.html" ]; then
            start_prod
        else
            start_dev
        fi
        ;;
    status)
        show_status
        ;;
    *)
        echo "用法: $0 {dev|prod|start|stop|restart|status}"
        echo ""
        echo "  dev   - 开发模式 (前端热更新)"
        echo "  prod  - 生产模式 (静态文件)"
        echo "  start - 自动选择模式启动"
        echo "  stop  - 停止所有服务"
        echo "  restart - 重启服务"
        echo "  status - 查看状态"
        exit 1
        ;;
esac
