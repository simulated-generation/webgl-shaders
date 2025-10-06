FROM caddy:alpine

# Copy static assets
COPY . /usr/share/caddy

# Use our custom Caddyfile to serve from /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

