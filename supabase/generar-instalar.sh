#!/usr/bin/env bash
# Une las migraciones en supabase/instalar.sql para pegarlo en el SQL Editor de Supabase.
set -euo pipefail
cd "$(dirname "$0")"
{
  echo "-- ====================================================================="
  echo "-- CRM HORECA · Instalación completa para pegar en el SQL Editor de Supabase"
  echo "-- Generado con supabase/generar-instalar.sh. Ejecutar UNA sola vez en un proyecto vacío."
  echo "-- ====================================================================="
  for f in migrations/*.sql; do
    echo
    echo "-- ---- $f ----"
    cat "$f"
  done
} > instalar.sql
echo "Generado supabase/instalar.sql"
