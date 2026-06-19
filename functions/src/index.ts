import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();

const FORMAT_MAP: Record<string, string> = {
  docx: 'docx',
  doc: 'doc',
  pptx: 'pptx',
  ppt: 'ppt',
  xlsx: 'xlsx',
  xls: 'xls',
  txt: 'txt',
  jpg: 'jpg',
  png: 'png',
};

const MIME_MAP: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  txt: 'text/plain',
  jpg: 'image/jpeg',
  png: 'image/png',
};

export const convert = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onRequest(async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const Busboy = require('busboy');
      const { Readable } = require('stream');

      const parsed = await new Promise<{ buffer: Buffer; format: string; fileName: string }>((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers });
        const chunks: Buffer[] = [];
        let format = 'pdf';
        let fileName = 'document';

        busboy.on('file', (_fieldname: string, file: any, _info: any) => {
          file.on('data', (data: Buffer) => chunks.push(data));
        });

        busboy.on('field', (name: string, val: string) => {
          if (name === 'format') format = val;
          if (name === 'fileName') fileName = val;
        });

        busboy.on('finish', () => {
          if (chunks.length === 0) {
            reject(new Error('No file uploaded'));
            return;
          }
          resolve({ buffer: Buffer.concat(chunks), format, fileName });
        });

        busboy.on('error', reject);

        if (req.rawBody) {
          const readable = new Readable();
          readable.push(req.rawBody);
          readable.push(null);
          readable.pipe(busboy);
        } else {
          reject(new Error('No body'));
        }
      });

      const targetFormat = FORMAT_MAP[parsed.format.toLowerCase()];
      if (!targetFormat) {
        res.status(400).json({ error: `Unsupported format: ${parsed.format}` });
        return;
      }

      const libre = require('libreoffice-convert');
      const convertedBuffer = await new Promise<Buffer>((resolve, reject) => {
        libre.convert(parsed.buffer, `.${targetFormat}`, undefined, (err: Error, result: Buffer) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      const mimeType = MIME_MAP[targetFormat] || 'application/octet-stream';
      res.set('Content-Type', mimeType);
      res.set('Content-Disposition', `attachment; filename="${parsed.fileName}.${targetFormat}"`);
      res.send(convertedBuffer);
    } catch (err) {
      console.error('Conversion error:', err);
      res.status(500).json({
        error: 'Conversion failed',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });
