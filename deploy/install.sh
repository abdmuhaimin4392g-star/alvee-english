#!/usr/bin/env bash
# Install or update Alvee English on an Ubuntu server.
#   sudo bash deploy/install.sh                      -> runs on http://SERVER-IP:3088
#   sudo bash deploy/install.sh english.example.com  -> also sets up https://english.example.com
# Run it again any time to update the app. Her progress (in /var/lib/alvee-english) is never touched.
set -euo pipefail

APP_DIR=/opt/alvee-english
DATA_DIR=/var/lib/alvee-english
PORT="${PORT:-3088}"
DOMAIN="${1:-}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"

[ "$(id -u)" = 0 ] || { echo "Please run with sudo."; exit 1; }

# 1. Node.js 18+
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  echo "Installing Node.js…"
  apt-get update -y && apt-get install -y nodejs
fi
NODE_BIN="$(command -v node)"

# 2. app files (code only — data lives in $DATA_DIR)
mkdir -p "$APP_DIR" "$DATA_DIR"
cp -r "$SRC/server" "$SRC/public" "$SRC/package.json" "$APP_DIR/"
[ -d "$SRC/content" ] && cp -r "$SRC/content" "$SRC/tools" "$APP_DIR/" || true
id alvee-english >/dev/null 2>&1 || useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin alvee-english
chown -R alvee-english:alvee-english "$DATA_DIR"

# 3. background service
BIND=0.0.0.0; [ -n "$DOMAIN" ] && BIND=127.0.0.1
cat > /etc/systemd/system/alvee-english.service <<UNIT
[Unit]
Description=Alvee English app
After=network.target

[Service]
User=alvee-english
Environment=PORT=$PORT
Environment=HOST=$BIND
Environment=DATA_DIR=$DATA_DIR
ExecStart=$NODE_BIN $APP_DIR/server/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable alvee-english >/dev/null 2>&1
systemctl restart alvee-english
sleep 1
systemctl is-active --quiet alvee-english && echo "✓ App is running on port $PORT"

# 4. https for a domain (adds a NEW site; existing sites are left alone, and changes are rolled back if the check fails)
if [ -n "$DOMAIN" ]; then
  if command -v caddy >/dev/null 2>&1 && [ -f /etc/caddy/Caddyfile ]; then
    if ! grep -q "^$DOMAIN" /etc/caddy/Caddyfile; then
      cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-alvee
      printf '\n%s {\n\treverse_proxy 127.0.0.1:%s\n}\n' "$DOMAIN" "$PORT" >> /etc/caddy/Caddyfile
      if caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1; then systemctl reload caddy && echo "✓ Caddy: https://$DOMAIN"
      else cp /etc/caddy/Caddyfile.bak-alvee /etc/caddy/Caddyfile; echo "✗ Caddy check failed — config restored. Add the site by hand."; fi
    fi
  elif command -v nginx >/dev/null 2>&1; then
    CONF=/etc/nginx/sites-available/alvee-english
    cat > "$CONF" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
    ln -sf "$CONF" /etc/nginx/sites-enabled/alvee-english
    if nginx -t >/dev/null 2>&1; then
      systemctl reload nginx && echo "✓ nginx: http://$DOMAIN"
      if command -v certbot >/dev/null 2>&1; then certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect && echo "✓ https://$DOMAIN"; else echo "Install certbot for https:  apt install certbot python3-certbot-nginx"; fi
    else rm -f /etc/nginx/sites-enabled/alvee-english; echo "✗ nginx check failed — site removed again."; fi
  else
    echo "No Caddy or nginx found. Point a web server at http://127.0.0.1:$PORT for https."
  fi
  echo "Remember: the domain's DNS A record must point to this server."
fi

# 5. first-time setup code
if [ -f "$DATA_DIR/SETUP-CODE.txt" ]; then
  echo ""
  echo "First-time setup code: $(cat "$DATA_DIR/SETUP-CODE.txt")"
  echo "Open the app, enter this code, and create your login and Alvee's login."
fi
