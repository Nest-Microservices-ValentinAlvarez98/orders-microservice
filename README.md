# Orders MicroService

## Dev

1. Clonar el repositorio.
2. Instalar dependencias.
3. Crear un archivo `.env` basado en el `env.template`.
4. Ejecutar el comando `docker compose up -d`, para crear el contenedor con la base de datos Postgresql.
5. Inicializar el contenedor en Docker Desktop, si no se inicializó de forma automática.
6. Ejecutar migración de prisma `npx prisma migrate dev`.
7. Ejecutar en terminal el comando `docker run -d --name nats-server -p 4222:4222 -p 8222:8222 nats` para crear el servidor NATS en Docker Desktop.
8. Ejecutar `npm run start:dev`.
