#!/bin/sh
set -e
cd /var/www/html

if [ -z "$APP_KEY" ]; then
  echo "APP_KEY kosong. Jalankan 'make init' atau isi APP_KEY di .env (semua container harus memakai kunci yang sama)." >&2
  exit 1
fi

mkdir -p storage/app/private storage/app/samples storage/app/tmp storage/framework/cache storage/framework/sessions storage/framework/views storage/logs
chown -R www-data:www-data storage bootstrap/cache

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Menunggu database..."
  i=0
  until php artisan migrate --force >/dev/null 2>&1; do
    i=$((i+1)); [ $i -ge 30 ] && { echo "Database tidak tersedia." >&2; php artisan migrate --force; exit 1; }
    sleep 2
  done
  echo "Migrasi selesai."
  php artisan template:generate-sample >/dev/null 2>&1 || true
fi

# Worker dan scheduler berjalan sebagai www-data agar berkas storage konsisten
case "$1" in
  php-fpm) exec "$@" ;;
  *) exec su -s /bin/sh www-data -c "$*" ;;
esac
