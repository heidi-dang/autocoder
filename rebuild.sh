#!/bin/bash
cd /home/heidi/Desktop/autocoder
docker compose -f docker-compose.dev.yml build api
docker compose -f docker-compose.dev.yml up -d
