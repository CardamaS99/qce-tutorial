#!/usr/bin/env bash
# Cuenta visitas a la web QCE Tutorial a partir de los logs que ya genera
# `serve` bajo pm2 (registran fecha, IP y ruta de cada petición GET).
# 100% server-side: no añade cookies, scripts de tracking ni almacenamiento
# en el navegador, por lo que no requiere banner de consentimiento.
#
# Uso:
#   scripts/visit-stats.sh
#
# Requiere: bash, grep -P, awk, zcat (para logs rotados con pm2-logrotate)

set -euo pipefail

LOG_DIR="$HOME/.pm2/logs"
APP_PREFIX="QCE-Tutorial-out"

shopt -s nullglob
LOG_FILES=("$LOG_DIR/${APP_PREFIX}"*.log "$LOG_DIR/${APP_PREFIX}"*.log.gz)
shopt -u nullglob

if [ ${#LOG_FILES[@]} -eq 0 ]; then
  echo "No se encontraron logs en $LOG_DIR con prefijo $APP_PREFIX" >&2
  exit 1
fi

cat_log() {
  case "$1" in
    *.gz) zcat "$1" ;;
    *) cat "$1" ;;
  esac
}

{
  for f in "${LOG_FILES[@]}"; do cat_log "$f"; done
} | grep -oP '^ HTTP  \d{1,2}/\d{1,2}/\d{4} \d{1,2}:\d{2}:\d{2} [AP]M \S+ GET \S+' \
  | awk '
  {
    date=$2; ip=$5; path=$7
    sub(/\?.*/, "", path)              # ignora query strings (?cachebuster=...)
    # ignora assets estáticos: solo cuentan páginas
    if (path ~ /\.(css|js|mjs|png|jpe?g|svg|webp|ico|gif|woff2?|ttf|eot|map|json|xml|txt|mp4|pdf|avif)$/) next
    split(date, d, "/")
    day = sprintf("%04d-%02d-%02d", d[3], d[1], d[2])

    pageviews[path]++
    daily_views[day]++
    total++

    combo = day SUBSEP ip
    if (!(combo in seen_day_ip)) { seen_day_ip[combo]=1; daily_uniq[day]++ }
    if (!(ip in seen_ip)) { seen_ip[ip]=1; total_uniq++ }
  }
  END {
    print "=== Resumen QCE Tutorial ==="
    printf "Visitas a páginas (total): %d\n", total
    printf "IPs distintas (total, aprox. \"visitantes\"): %d\n\n", total_uniq

    print "--- Visitas por página ---"
    for (p in pageviews) printf "%6d  %s\n", pageviews[p], p | "sort -rn"
    close("sort -rn")
    print ""

    print "--- Visitas por día (views / IPs distintas ese día) ---"
    for (dk in daily_views) printf "%s  views=%-5d unique_ips=%d\n", dk, daily_views[dk], daily_uniq[dk] | "sort"
    close("sort")
  }'
