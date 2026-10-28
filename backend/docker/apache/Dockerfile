FROM php:8.3-apache

RUN a2enmod rewrite

# user for jenkins pipeline
RUN addgroup --gid 1000 build && adduser --uid 1000 --gid 1000 --disabled-password --gecos "" build
RUN usermod -a -G build www-data
