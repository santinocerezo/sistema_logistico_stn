# 🤖 Configuración de OpenAI para el Agente IA

## ✅ Estado Actual

- ✅ Backend corriendo
- ✅ Módulo de IA implementado
- ⚠️ OpenAI API Key no configurada

## 📋 Pasos para Configurar OpenAI

### Paso 1: Obtener API Key de OpenAI

1. **Ir a OpenAI Platform:**
   - Abrir: https://platform.openai.com/

2. **Crear cuenta o iniciar sesión:**
   - Si no tienes cuenta, crear una nueva
   - Si ya tienes cuenta, iniciar sesión

3. **Ir a API Keys:**
   - Abrir: https://platform.openai.com/api-keys
   - O navegar: Dashboard → API Keys

4. **Crear nueva API Key:**
   - Click en "Create new secret key"
   - Darle un nombre: "STN-PQs-Backend"
   - Click en "Create secret key"

5. **Copiar la API Key:**
   - ⚠️ **IMPORTANTE:** La key solo se muestra UNA VEZ
   - Copiarla inmediatamente
   - Formato: `sk-proj-...` (empieza con sk-proj o sk-)

### Paso 2: Agregar API Key al .env

1. **Abrir el archivo `.env`:**
   ```
   packages/backend/.env
   ```

2. **Buscar la línea:**
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Reemplazar con tu API Key:**
   ```env
   OPENAI_API_KEY=sk-proj-TU_KEY_AQUI
   ```

4. **Guardar el archivo**

### Paso 3: Reiniciar el Backend

El backend necesita reiniciarse para cargar la nueva variable de entorno.

**Opción A: Desde la terminal donde corre el backend**
- Presionar `Ctrl + C` para detener
- Ejecutar: `npm run dev`

**Opción B: Desde PowerShell**
```powershell
# Detener el proceso actual
# Luego iniciar de nuevo
cd packages/backend
npm run dev
```

### Paso 4: Verificar que Funciona

1. **Hacer login para obtener token:**
   ```powershell
   $response = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test@stnpqs.com","password":"Test123!"}'
   $json = $response.Content | ConvertFrom-Json
   $token = $json.accessToken
   ```

2. **Probar el Agente IA:**
   ```powershell
   $body = @{message="Hola, ¿cuál es mi saldo actual?"} | ConvertTo-Json
   Invoke-WebRequest -Uri "http://localhost:3000/ai/chat" -Method POST -Headers @{"Content-Type"="application/json";"Authorization"="Bearer $token"} -Body $body
   ```

3. **Respuesta esperada:**
   ```json
   {
     "response": "Hola! Tu saldo actual es de $0.00. ¿Hay algo más en lo que pueda ayudarte?",
     "sessionId": "session_..."
   }
   ```

## 💰 Costos de OpenAI

### Modelo GPT-4
- **Entrada:** ~$0.03 por 1,000 tokens
- **Salida:** ~$0.06 por 1,000 tokens
- **Conversación promedio:** ~500 tokens = $0.045

### Estimaciones Mensuales

**Escenario Bajo (100 conversaciones/mes):**
- Costo: ~$5/mes

**Escenario Medio (1,000 conversaciones/mes):**
- Costo: ~$50/mes

**Escenario Alto (10,000 conversaciones/mes):**
- Costo: ~$500/mes

### Créditos Gratuitos

OpenAI ofrece:
- **$5 de crédito gratis** para nuevas cuentas
- Válido por 3 meses
- Suficiente para ~100 conversaciones

## 🔧 Configuración Avanzada

### Cambiar Modelo

En el archivo `.env`, puedes cambiar el modelo:

```env
# GPT-4 (más inteligente, más caro)
OPENAI_MODEL=gpt-4

# GPT-4 Turbo (más rápido, más barato)
OPENAI_MODEL=gpt-4-turbo

# GPT-3.5 Turbo (más barato, menos inteligente)
OPENAI_MODEL=gpt-3.5-turbo
```

### Ajustar Timeout

```env
# Timeout en milisegundos (default: 90000 = 90 segundos)
AI_TIMEOUT_MS=90000
```

### Cambiar Provider

Si prefieres usar Anthropic Claude en lugar de OpenAI:

1. **Instalar SDK:**
   ```bash
   npm install @anthropic-ai/sdk
   ```

2. **Modificar `ai.service.ts`:**
   ```typescript
   import Anthropic from '@anthropic-ai/sdk';
   
   const anthropic = new Anthropic({
     apiKey: process.env.ANTHROPIC_API_KEY,
   });
   ```

3. **Actualizar `.env`:**
   ```env
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-...
   ```

## 🧪 Pruebas del Agente IA

### Conversación Básica

```powershell
$body = @{message="Hola"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/ai/chat" -Method POST -Headers @{"Content-Type"="application/json";"Authorization"="Bearer $token"} -Body $body
```

### Consultar Saldo

```powershell
$body = @{message="¿Cuál es mi saldo?"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/ai/chat" -Method POST -Headers @{"Content-Type"="application/json";"Authorization"="Bearer $token"} -Body $body
```

### Consultar Estado de Envío

```powershell
$body = @{message="¿Cuál es el estado de mi envío STN-2026-001234?"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/ai/chat" -Method POST -Headers @{"Content-Type"="application/json";"Authorization"="Bearer $token"} -Body $body
```

### Crear Incidencia

```powershell
$body = @{message="Quiero reportar un problema con mi envío"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/ai/chat" -Method POST -Headers @{"Content-Type"="application/json";"Authorization"="Bearer $token"} -Body $body
```

### Escalar a Humano

```powershell
$body = @{message="Necesito hablar con un agente humano"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/ai/chat" -Method POST -Headers @{"Content-Type"="application/json";"Authorization"="Bearer $token"} -Body $body
```

## 🔍 Verificar Logs

Para ver los logs del Agente IA:

```powershell
# Ver logs del backend
# Los logs mostrarán las llamadas a OpenAI
```

Buscar líneas como:
```
[AI] Procesando mensaje del usuario...
[AI] Respuesta de OpenAI recibida
```

## ⚠️ Solución de Problemas

### Error: "Invalid API Key"

**Causa:** La API Key es incorrecta o no está configurada

**Solución:**
1. Verificar que la key en `.env` es correcta
2. Verificar que empieza con `sk-proj-` o `sk-`
3. Reiniciar el backend

### Error: "Rate limit exceeded"

**Causa:** Has excedido el límite de requests de OpenAI

**Solución:**
1. Esperar unos minutos
2. Verificar tu plan en OpenAI
3. Considerar upgrade si es necesario

### Error: "Insufficient quota"

**Causa:** No tienes créditos suficientes en OpenAI

**Solución:**
1. Agregar método de pago en OpenAI
2. Comprar créditos
3. O usar el crédito gratuito de $5

### Error: "Timeout"

**Causa:** OpenAI tardó más de 90 segundos en responder

**Solución:**
1. Aumentar `AI_TIMEOUT_MS` en `.env`
2. O cambiar a un modelo más rápido (gpt-3.5-turbo)

### El IA no responde correctamente

**Causa:** El modelo no entiende el contexto

**Solución:**
1. Verificar que el system prompt es correcto
2. Probar con GPT-4 en lugar de GPT-3.5
3. Ajustar la temperatura en `ai.service.ts`

## 📊 Monitoreo de Uso

Para monitorear tu uso de OpenAI:

1. **Ir a OpenAI Dashboard:**
   - https://platform.openai.com/usage

2. **Ver estadísticas:**
   - Requests por día
   - Tokens usados
   - Costo acumulado

3. **Configurar alertas:**
   - Settings → Billing → Usage limits
   - Configurar límite mensual

## ✅ Checklist de Configuración

- [ ] Crear cuenta en OpenAI
- [ ] Obtener API Key
- [ ] Agregar API Key a `.env`
- [ ] Reiniciar backend
- [ ] Probar con request de prueba
- [ ] Verificar respuesta del IA
- [ ] Configurar límite de uso (opcional)
- [ ] Monitorear costos

## 🎉 ¡Listo!

Una vez configurado, el Agente IA estará completamente funcional y podrá:

- ✅ Responder preguntas sobre envíos
- ✅ Consultar saldo del usuario
- ✅ Crear incidencias
- ✅ Iniciar reclamaciones
- ✅ Escalar a agente humano
- ✅ Mantener contexto de conversación
- ✅ Usar function calling para acciones

**El sistema está listo para usar!** 🚀
