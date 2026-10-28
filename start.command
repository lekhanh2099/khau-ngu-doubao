#!/bin/bash
# Nháy đúp file này để chạy web server tĩnh
cd "$(dirname "$0")"
PORT=5173

# Lấy địa chỉ IP mạng nội bộ (Wi-Fi)
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

echo "========================================================"
echo "  KHẨU NGỮ TRUNG CẤP - COPY NHANH CHO DOUBAO"
echo "========================================================"
echo "👉 Mở trên máy tính: http://localhost:$PORT"
if [ -n "$IP" ]; then
  echo "👉 Mở trên điện thoại (cùng Wi-Fi): http://$IP:$PORT"
fi
echo "========================================================"
echo "Đóng cửa sổ này để tắt server."
echo ""

( sleep 1; open "http://localhost:$PORT" ) &
python3 -m http.server "$PORT" --bind 0.0.0.0
