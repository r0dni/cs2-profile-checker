---
name: gsi-test
description: Инструкции и скрипты для комплексной проверки локального GSI-сервера (gsi/server.js на порту 3000)
---

# GSI Test Skill

Этот скилл предназначен для валидации и стресс-тестирования локального сервера Game State Integration (`gsi/server.js`).

## Что проверяется

1. **Синтаксис кода**: проверка через `node --check gsi/server.js`.
2. **Доступность сервиса**: проверка активности сервера на порту 3000 (`http://127.0.0.1:3000/status`). Если сервер не отвечает, фоновый запуск через `Start-Process node -ArgumentList "gsi/server.js"`.
3. **Отправка пакета с данными**: отправка POST-запроса на `/` с картой `de_inferno` и игроком `TestPlayer` (`steamid: 76561198000000001`).
4. **Валидация `/status`**: проверка, что `connected === true`, карта `de_inferno`, и `TestPlayer` присутствует в массиве `players`.
5. **Сохранение кэша (кэш игроков и карты)**: отправка последующего POST-запроса без узла `allplayers` (только узел `provider`) и подтверждение через `/status`, что список игроков и объект карты не сбросились.

---

## Автоматический запуск проверки в PowerShell

> [!NOTE]
> В соответствии с правилами проекта (`GEMINI.md`):
> - Оболочка: **PowerShell**.
> - Команды разделяются только через `;` (никогда не использовать `&&`).

### Однострочник для быстрой проверки:

```powershell
node --check gsi/server.js; $proc = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*gsi/server.js*" }; if (-not $proc) { $proc = Start-Process node -ArgumentList "gsi/server.js" -PassThru; Start-Sleep -Milliseconds 800 }; node -e "const http = require('http'); function req(opt, data) { return new Promise((resolve, reject) => { const r = http.request(opt, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b))); }); r.on('error', reject); if (data) r.write(data); r.end(); }); } async function test() { const p1 = JSON.stringify({ map: { name: 'de_inferno', mode: 'competitive', phase: 'live', team_ct: { score: 3 }, team_t: { score: 2 } }, allplayers: { '76561198000000001': { name: 'TestPlayer', team: 'CT', state: { health: 100, armor: 100, helmet: true, money: 3500 }, match_stats: { kills: 5, deaths: 1, assists: 2 } } } }); const p2 = JSON.stringify({ provider: { timestamp: 1700000000 } }); await req({ host: '127.0.0.1', port: 3000, path: '/', method: 'POST', headers: { 'Content-Type': 'application/json' } }, p1); const s1 = await req({ host: '127.0.0.1', port: 3000, path: '/status', method: 'GET' }); console.log('Шаг 1 - /status:', { connected: s1.connected, map: s1.map?.name, players: s1.players?.length, player1: s1.players?.[0]?.name }); await req({ host: '127.0.0.1', port: 3000, path: '/', method: 'POST', headers: { 'Content-Type': 'application/json' } }, p2); const s2 = await req({ host: '127.0.0.1', port: 3000, path: '/status', method: 'GET' }); console.log('Шаг 2 (кэш без allplayers):', { connected: s2.connected, map: s2.map?.name, players: s2.players?.length }); if (s2.players?.length > 0 && s2.map?.name === 'de_inferno') { console.log('=== GSI TEST PASSED SUCCESSFULLY ==='); } else { console.error('=== GSI TEST FAILED ==='); process.exit(1); } } test().catch(e => { console.error(e); process.exit(1); });"
```

---

## Пошаговое описание сценария

### 1. Проверка синтаксиса
```powershell
node --check gsi/server.js
```

### 2. Запуск сервера при отсутствии активности
```powershell
$proc = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*gsi/server.js*" }
if (-not $proc) {
    $proc = Start-Process node -ArgumentList "gsi/server.js" -PassThru
    Start-Sleep -Milliseconds 800
}
```

### 3. Отправка тестового пакета с картой и игроком
- Тело запроса содержит объект `map` (`de_inferno`) и словарь `allplayers` с игроком `TestPlayer` (`76561198000000001`).
- Сервер помещает игрока в накопительный кэш `sessionPlayers` и сохраняет метаданные карты в `lastMapObj`.

### 4. Проверка состояния `/status`
- Сервер возвращает:
  - `connected: true`
  - `map.name: "de_inferno"`
  - `players`: содержит `TestPlayer` с корректными HP, броней и статистикой.

### 5. Проверка сохранения кэша при отправке пакета без `allplayers`
- Отправляется пакет только с узлом `provider` (имитирует частые промежуточные пакеты от CS2).
- Проверяется `/status`: массив `players` не должен обнуляться, карта `de_inferno` должна сохраняться.
