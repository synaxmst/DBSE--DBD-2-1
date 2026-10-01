# AlgoFlow Judge Worker Service

This microservice consumes submission execution jobs from the BullMQ Redis queue, boots isolated Docker containers (with CPU, memory, and timeout bounds), compiles/interprets user code against hidden test cases, and updates the database with the resulting verdicts.

## Architecture Highlights
- **Engine**: Dockerode / Docker daemon isolation with gVisor / seccomp profiles
- **Supported Compilers**: GCC 13.2 (C++), Python 3.12, OpenJDK 21 (Java), Node.js 20 (JavaScript)
- **Queue Consumer**: BullMQ Worker attached to `submissions` queue
- **Result Publisher**: Direct MongoDB state update + Redis PubSub for real-time WebSocket notifications
