import express from 'express';
import cors from 'cors';
import { config } from './config';
import { uploadSingle } from './middleware/upload';
import * as ocrRoutes from './routes/ocr';

async function main() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/ocr/process', uploadSingle, ocrRoutes.processImage);

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
    console.log(`Smart Weigh OCR backend running on port ${config.port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
