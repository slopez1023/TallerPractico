# 🧪 Guía de Tests - Eventia Core API

## ✅ Estado Actual

- **Tests Unitarios**: ✅ 26 pasando (100%)
- **Tests de Integración**: ⚠️ Requieren PostgreSQL
- **Tests E2E**: ⚠️ Requieren PostgreSQL

## 🚀 Comandos de Test

### Ejecutar solo tests unitarios (No requiere BD)
```bash
npm run test:unit
```

### Ejecutar tests de integración (Requiere PostgreSQL)
```bash
npm run test:integration
```

### Ejecutar tests E2E (Requiere PostgreSQL)
```bash
npm run test:e2e
```

### Ejecutar todos los tests
```bash
npm test
```

## 🔧 Configuración de PostgreSQL para Tests

### 1. Instalar PostgreSQL

**Windows:**
- Descarga desde: https://www.postgresql.org/download/windows/
- O usa Chocolatey: `choco install postgresql`

**Instalación con Docker (Alternativa):**
```bash
docker run --name eventia-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

### 2. Crear la base de datos de pruebas

Conéctate a PostgreSQL y ejecuta:
```sql
CREATE DATABASE eventia_test;
```

O desde la terminal:
```bash
psql -U postgres -c "CREATE DATABASE eventia_test;"
```

### 3. Configurar variables de entorno

Edita el archivo `.env.test` en la raíz del proyecto:

```env
DB_HOST=localhost
DB_PORT=5432
DB_TEST_NAME=eventia_test
DB_USER=postgres
DB_PASSWORD=tu_password_real
```

**⚠️ IMPORTANTE:** Reemplaza `tu_password_real` con tu contraseña de PostgreSQL.

### 4. Verificar la conexión

Intenta conectarte manualmente:
```bash
psql -U postgres -d eventia_test
```

Si te conectas exitosamente, los tests deberían funcionar.

## 🎯 Solución Rápida (Solo Tests Unitarios)

Si no quieres configurar PostgreSQL ahora, ejecuta:

```bash
npm run test:unit
```

Esto ejecutará solo los 26 tests unitarios que **no requieren base de datos** y todos deberían pasar.

## 📊 Resultado Esperado (Solo Unitarios)

```
Test Suites: 2 passed, 2 total
Tests:       26 passed, 26 total
Time:        ~2s
```

## 🐛 Solución de Problemas

### Error: "autentificación password falló"

**Causa:** Contraseña incorrecta en `.env.test`

**Solución:**
1. Verifica tu contraseña de PostgreSQL
2. Actualiza `.env.test` con la contraseña correcta
3. Reinicia los tests

### Error: "could not connect to server"

**Causa:** PostgreSQL no está corriendo

**Solución:**
```bash
# Windows (Services)
services.msc -> Buscar "postgresql" -> Iniciar

# O con pg_ctl
pg_ctl start -D "C:\Program Files\PostgreSQL\15\data"

# Docker
docker start eventia-postgres
```

### Error: "database does not exist"

**Solución:**
```bash
psql -U postgres -c "CREATE DATABASE eventia_test;"
```

## 📝 Notas

- Los tests unitarios son independientes y siempre deberían funcionar
- Los tests de integración y E2E requieren una base de datos real
- Las tablas se crean/eliminan automáticamente en cada ejecución de test
- Los datos de test no afectan tu base de datos de desarrollo

## 🎓 Mejores Prácticas

1. **Desarrollo rápido**: Usa `npm run test:unit` durante el desarrollo
2. **Antes de commit**: Ejecuta `npm run test:unit` para verificar lógica
3. **Antes de deploy**: Ejecuta `npm test` para verificar integración completa
4. **CI/CD**: Configura PostgreSQL en tu pipeline para tests completos
