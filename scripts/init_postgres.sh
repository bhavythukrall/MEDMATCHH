#!/bin/bash
# Idempotently ensure the Sanjeevani PostgreSQL role and database exist.
set -e
for i in $(seq 1 30); do
  su postgres -c "psql -c 'SELECT 1'" >/dev/null 2>&1 && break
  sleep 1
done
su postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='sanjeevani'\"" | grep -q 1 || \
  su postgres -c "psql -c \"CREATE ROLE sanjeevani LOGIN PASSWORD 'sanjeevani_pw'\""
su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='sanjeevani'\"" | grep -q 1 || \
  su postgres -c "createdb -O sanjeevani sanjeevani"
su postgres -c "psql -c 'GRANT ALL ON SCHEMA public TO sanjeevani' -d sanjeevani"
echo "postgres bootstrap ok"
