.PHONY: init up down build migrate seed test sample logs shell

init:            ## salin .env dan isi APP_KEY + sandi acak
	@test -f .env || cp .env.example .env
	@grep -q '^APP_KEY=base64:' .env || sed -i "s|^APP_KEY=.*|APP_KEY=base64:$$(openssl rand -base64 32)|" .env
	@grep -q '^DB_PASSWORD=.\+' .env || sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$$(openssl rand -hex 16)|" .env
	@grep -q '^ADMIN_PASSWORD=.\+' .env || { p=$$(openssl rand -hex 8); sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$$p|" .env; echo "Sandi admin: $$p (lihat .env)"; }
	@echo ".env siap."

up:              ## build dan jalankan semua layanan
	docker compose up -d --build

down:
	docker compose down

migrate:
	docker compose exec app php artisan migrate --force

seed:            ## membuat pengguna admin dari ADMIN_EMAIL / ADMIN_PASSWORD
	docker compose exec app php artisan db:seed --class=Database\\Seeders\\AdminUserSeeder --force

sample:          ## membuat storage/app/samples/template_cv_placeholder.xlsx
	docker compose exec app php artisan template:generate-sample

test:            ## tes backend (sqlite memori) dan frontend
	docker compose exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: -e CACHE_STORE=array -e QUEUE_CONNECTION=sync -e SESSION_DRIVER=array app php artisan test
	cd frontend && npm ci && npm test

logs:
	docker compose logs -f --tail=100

shell:
	docker compose exec app sh
