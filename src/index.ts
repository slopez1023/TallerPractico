import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection, closePool } from './infrastructure/config/database';
import { getCacheService, testCacheConnection } from './infrastructure/config/cache';

// Repositorios
import { EventRepository } from './infrastructure/database/repositories/EventRepository';
import { ParticipantRepository } from './infrastructure/database/repositories/ParticipantRepository';
import { AttendanceRepository } from './infrastructure/database/repositories/AttendanceRepository';

// Servicios
import { EventService } from './domain/services/EventService';
import { ParticipantService } from './domain/services/ParticipantService';
import { AttendanceService } from './domain/services/AttendanceService';

// Controladores
import { EventController } from './application/controllers/EventController';
import { ParticipantController } from './application/controllers/ParticipantController';
import { AttendanceController } from './application/controllers/AttendanceController';

// Rutas
import { createEventRoutes } from './application/routes/eventRoutes';
import { createParticipantRoutes } from './application/routes/participantRoutes';
import { createAttendanceRoutes } from './application/routes/attendanceRoutes';

// Configuración de variables de entorno
dotenv.config();

// Configuración de la aplicación
const app: Application = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar dependencias
const cacheService = getCacheService();

// Repositorios
const eventRepository = new EventRepository(pool);
const participantRepository = new ParticipantRepository(pool);
const attendanceRepository = new AttendanceRepository(pool);

// Servicios
const eventService = new EventService(eventRepository, cacheService);
const participantService = new ParticipantService(participantRepository, cacheService);
const attendanceService = new AttendanceService(
  attendanceRepository,
  eventRepository,
  participantRepository,
  cacheService,
  pool
);

// Controladores
const eventController = new EventController(eventService);
const participantController = new ParticipantController(participantService);
const attendanceController = new AttendanceController(attendanceService);

// Rutas
app.use(`${API_PREFIX}/events`, createEventRoutes(eventController));
app.use(`${API_PREFIX}/participants`, createParticipantRoutes(participantController));
app.use(`${API_PREFIX}/attendances`, createAttendanceRoutes(attendanceController));

// Ruta de health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Eventia Core API está funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta raíz
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Bienvenido a Eventia Core API',
    version: '1.0.0',
    endpoints: {
      events: `${API_PREFIX}/events`,
      participants: `${API_PREFIX}/participants`,
      attendances: `${API_PREFIX}/attendances`,
      health: '/health',
    },
  });
});

// Manejo de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
  });
});

// Función para iniciar el servidor
async function startServer() {
  try {
    console.log('🚀 Iniciando Eventia Core API...\n');

    // Verificar conexión a la base de datos
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    // Verificar sistema de caché
    const cacheConnected = await testCacheConnection();
    if (!cacheConnected) {
      throw new Error('No se pudo inicializar el sistema de caché');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`\n✅ Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}${API_PREFIX}`);
      console.log(`📍 Health: http://localhost:${PORT}/health`);
      console.log('\n🎉 ¡Eventia Core API está listo!\n');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Cerrando servidor...');
  await closePool();
  await cacheService.close();
  console.log('👋 Servidor cerrado correctamente');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Cerrando servidor...');
  await closePool();
  await cacheService.close();
  console.log('👋 Servidor cerrado correctamente');
  process.exit(0);
});

// IMPORTANTE: Solo iniciar servidor si NO estamos en modo test
// Esto permite que las pruebas E2E importen la app sin iniciar el servidor
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Exportar para uso en pruebas
export default app;
export { app };