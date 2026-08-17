import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { initDatabase } from './database';
import { authenticateToken } from './middleware/auth';
import { uploadSingle } from './middleware/upload';
import * as authRoutes from './routes/auth';
import * as binRoutes from './routes/bins';
import * as weighingRoutes from './routes/weighings';
import * as ocrRoutes from './routes/ocr';

async function main() {
  await initDatabase();
  console.log('Database initialized');

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const uploadsDir = path.join(__dirname, '..', config.uploadsDir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/auth/register', authRoutes.register);
  app.post('/auth/login', authRoutes.login);
  app.get('/auth/profile', authenticateToken, authRoutes.getProfile);

  app.post('/bins', authenticateToken, binRoutes.createBin);
  app.get('/bins', authenticateToken, binRoutes.getBins);
  app.get('/bins/:bin_id', authenticateToken, binRoutes.getBin);
  app.put('/bins/:bin_id/tare', authenticateToken, binRoutes.updateBinTare);
  app.delete('/bins/:bin_id', authenticateToken, binRoutes.deleteBin);

  app.post('/ocr/process', authenticateToken, uploadSingle, ocrRoutes.processImage);

  app.post('/weighings', authenticateToken, weighingRoutes.createWeighing);
  app.get('/weighings', authenticateToken, weighingRoutes.getWeighings);
  app.get('/weighings/:id', authenticateToken, weighingRoutes.getWeighing);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(config.port, () => {
    console.log(`Smart Weigh backend running on port ${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
