#!/usr/bin/env bash
set -euo pipefail
HOST="dpg-d2s15cjipnbc73e46hq0-a.oregon-postgres.render.com"  # tu host con región
read -rp "👤 Database User (de Render): " USER
read -rsp "🔑 Database Password (de Render): " PASS; echo
read -rp "🗂️  Database Name (de Render): " DB
echo
echo "DATABASE_URL para Render (sin comillas):"
echo "postgresql://${USER}:${PASS}@${HOST}:5432/${DB}?sslmode=require"
