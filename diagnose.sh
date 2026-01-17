#!/bin/sh

echo "===== SYSTEM ====="
uname -a
date
uptime

echo
echo "===== NETWORK ADDRESSES ====="
ip addr
ip route

echo
echo "===== LISTENING SOCKETS ====="
ss -lntup

echo
echo "===== IPTABLES (FILTER) ====="
iptables -L -n -v

echo
echo "===== IPTABLES (NAT) ====="
iptables -t nat -L -n -v

echo
echo "===== SYSCTL (NETWORK) ====="
sysctl net.ipv4.ip_forward
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.eth0.rp_filter
sysctl net.netfilter.nf_conntrack_max
sysctl net.netfilter.nf_conntrack_count

echo
echo "===== DOCKER INFO ====="
docker info

echo
echo "===== DOCKER NETWORKS ====="
docker network ls
docker network inspect webgl-shaders_default 2>/dev/null || true

echo
echo "===== DOCKER CONTAINERS ====="
docker ps
docker inspect caddy 2>/dev/null | grep -A5 -B5 Mounts || true

echo
echo "===== DOCKER COMPOSE ====="
cat /home/alex/apps/webgl-shaders/docker-compose.yml

echo
echo "===== CADDYFILE ====="
cat /home/alex/apps/webgl-shaders/src/caddy/Caddyfile

echo
echo "===== CADDY RUNTIME CONFIG ====="
curl -s localhost:2019/config/ || echo "Caddy admin API not reachable"

echo
echo "===== CADDY LOGS (ACME) ====="
docker logs caddy 2>&1 | grep -iE 'acme|challenge|error|fail' || true

echo
echo "===== TCPDUMP SAMPLE (80) ====="
echo "Run manually:"
echo "  doas tcpdump -n -i eth0 port 80"

echo
echo "===== END OF DIAGNOSTICS ====="

