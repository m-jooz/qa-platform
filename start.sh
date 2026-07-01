#!/bin/sh
if [ -n "$DATABASE_URL" ]; then
  echo "Running migrations..."
  npx prisma migrate deploy
else
  echo "No DATABASE_URL, skipping migrations"
fi
echo "Starting app..."
node dist/main
