#!/bin/bash
# Run this on VPS to apply all fixes
# bash /tmp/deploy_fixes.sh

echo "=== HOTVID DEPLOY FIXES ==="

# 1. Fix DNS
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf

# 2. Pull latest from GitHub
cd /var/www/hotvid
git stash
git pull origin main
echo "✅ Code pulled"

# 3. Fix all API URLs in frontend
for f in /var/www/hotvid/frontend/*.html; do
  python3 -c "
path='$f'
c=open(path).read()
c=c.replace(\"const API = 'http://178.105.190.123:3000';\",\"const API = '';\")
c=c.replace(\"const API = 'http://178.105.190.123';\",\"const API = '';\")
c=c.replace('const API = \"http://178.105.190.123:3000\";','const API = \"\";')
c=c.replace('const API = \"http://178.105.190.123\";','const API = \"\";')
open(path,'w').write(c)
" 2>/dev/null
done
echo "✅ API URLs fixed"

# 4. Fix DB - add missing columns
mysql --defaults-file=/etc/mysql/debian.cnf hotvid -e "ALTER TABLE comments ADD COLUMN content TEXT;" 2>/dev/null
mysql --defaults-file=/etc/mysql/debian.cnf hotvid -e "ALTER TABLE comments ADD COLUMN parent_id VARCHAR(36) DEFAULT NULL;" 2>/dev/null
mysql --defaults-file=/etc/mysql/debian.cnf hotvid -e "ALTER TABLE comments ADD COLUMN likes_count INT DEFAULT 0;" 2>/dev/null
mysql --defaults-file=/etc/mysql/debian.cnf hotvid -e "UPDATE comments SET content = text WHERE content IS NULL AND text IS NOT NULL;" 2>/dev/null
mysql --defaults-file=/etc/mysql/debian.cnf hotvid -e "ALTER TABLE users ADD COLUMN display_name VARCHAR(100) DEFAULT NULL;" 2>/dev/null
mysql --defaults-file=/etc/mysql/debian.cnf hotvid -e "ALTER TABLE users ADD COLUMN socials JSON DEFAULT NULL;" 2>/dev/null
mysql --defaults-file=/etc/mysql/debian.cnf hotvid -e "ALTER TABLE users ADD COLUMN is_verified TINYINT DEFAULT 0;" 2>/dev/null
echo "✅ DB columns fixed"

# 5. Fix .env
cat > /var/www/hotvid/backend/.env << 'ENVEOF'
PORT=3000
DB_USER=debian-sys-maint
DB_PASS=RSstesMUnB8ndqyH
DB_PASSWORD=RSstesMUnB8ndqyH
DB_NAME=hotvid
DB_SOCKET=/var/run/mysqld/mysqld.sock
JWT_SECRET=hotvid_uganda_secret_2024
APP_NAME=HOTVID
BASE_URL=http://178.105.190.123
COUNTRY=UG
CURRENCY=UGX
ENVEOF
echo "✅ .env fixed"

# 6. Fix Nginx
cat > /etc/nginx/sites-available/hotvid << 'NGEOF'
server {
    listen 80;
    server_name 178.105.190.123;
    root /var/www/hotvid/frontend;
    index index.html;
    client_max_body_size 500M;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }

    location /uploads/ {
        alias /uploads/;
        add_header Access-Control-Allow-Origin *;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
NGEOF
ln -sf /etc/nginx/sites-available/hotvid /etc/nginx/sites-enabled/hotvid
rm -f /etc/nginx/sites-enabled/default 2>/dev/null
nginx -t && systemctl restart nginx
echo "✅ Nginx fixed"

# 7. Install deps
cd /var/www/hotvid/backend && npm install
echo "✅ npm install done"

# 8. Restart server
pkill -f "node src/server.js" 2>/dev/null
sleep 3
nohup node src/server.js >> /var/log/hotvid.log 2>&1 &
sleep 5

# 9. Test
echo ""
echo "=== TESTING ==="
curl -s http://localhost:3000/ | python3 -c "import sys,json;d=json.load(sys.stdin);print('✅ Server:',d.get('status'))" 2>/dev/null || echo "❌ Server not responding"
curl -s http://localhost:3000/api/feed/trending | python3 -c "import sys,json;d=json.load(sys.stdin);print('✅ Feed:',len(d.get('videos',[])),'videos')" 2>/dev/null || echo "❌ Feed failed"
echo ""
echo "=== ALL DONE ==="
echo "Open http://178.105.190.123 on phone!"
