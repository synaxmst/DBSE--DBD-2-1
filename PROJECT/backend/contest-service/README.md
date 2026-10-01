# AlgoFlow Contest Management Service

This microservice manages competitive programming tournaments, scheduling, real-time leaderboard aggregation via Redis Sorted Sets (`ZADD`, `ZREVRANGE`), penalty calculation (ICPC 20-min rule), and WebSocket live broadcasting.

## Architecture Highlights
- **State Machine**: `upcoming` -> `live` -> `frozen` -> `ended`
- **Leaderboard Cache**: Redis Sorted Sets (`ZADD contest:<id>:leaderboard <score> <userId>`)
- **WebSocket Broadcast**: Live scoreboard push notifications to connected clients
