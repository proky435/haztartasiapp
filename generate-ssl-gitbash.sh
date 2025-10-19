#!/bin/bash

echo "========================================"
echo "  SSL Tanúsítvány Generálás (Git Bash)"
echo "========================================"
echo

# SSL mappa létrehozása
mkdir -p ssl
cd ssl

# IP cím automatikus detektálása
IP_ADDRESS=$(ipconfig | grep -o "192\.168\.[0-9]*\.[0-9]*" | head -1)
echo "Detektált IP cím: $IP_ADDRESS"

# Privát kulcs generálása
echo "1. Privát kulcs generálása..."
openssl genrsa -out server.key 2048

# Önaláírt tanúsítvány generálása egy lépésben
echo "2. Önaláírt tanúsítvány generálása..."
openssl req -new -x509 -key server.key -out server.crt -days 365 \
    -subj "/C=HU/ST=Budapest/L=Budapest/O=Haztartasi App/OU=Development/CN=$IP_ADDRESS" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:$IP_ADDRESS"

echo
echo "========================================"
echo "SSL tanúsítvány sikeresen létrehozva!"
echo "========================================"
echo
echo "Fájlok helye: $(pwd)"
echo "- server.key (privát kulcs)"
echo "- server.crt (tanúsítvány)"
echo
echo "Most frissítsd a .env fájlt:"
echo "SSL_CRT_FILE=./ssl/server.crt"
echo "SSL_KEY_FILE=./ssl/server.key"
echo "HTTPS=true"
echo
read -p "Nyomj Enter-t a folytatáshoz..."
