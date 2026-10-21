# Image app: php-fpm 8.3 + LibreOffice (PDF) + font CJK + poppler (pdfimages).
# Proyek Laravel 11 dibuat saat build, lalu folder backend/ ditimpa di atasnya (overlay).
FROM php:8.3-fpm-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        libreoffice-calc libreoffice-java-common- fonts-noto-cjk fonts-dejavu-core fontconfig \
        poppler-utils unzip git curl ca-certificates \
        libzip-dev libpng-dev libjpeg-dev libfreetype6-dev libxml2-dev libonig-dev \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install -j"$(nproc)" gd zip pdo_mysql mbstring xml bcmath opcache pcntl \
    && pecl install redis >/dev/null && docker-php-ext-enable redis \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/app/php.ini /usr/local/etc/php/conf.d/zz-cv.ini

WORKDIR /var/www/html
ENV COMPOSER_ALLOW_SUPERUSER=1

RUN composer create-project laravel/laravel:^11.0 . --no-interaction --prefer-dist \
    && composer require phpoffice/phpspreadsheet:^1.29 predis/predis symfony/process --no-interaction \
    && php artisan install:api --no-interaction \
    && rm -f tests/Feature/ExampleTest.php tests/Unit/ExampleTest.php

COPY backend/ /var/www/html/
RUN composer dump-autoload --optimize --no-interaction \
    && mkdir -p storage/app/private storage/app/samples storage/app/tmp storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/app/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
CMD ["php-fpm"]
