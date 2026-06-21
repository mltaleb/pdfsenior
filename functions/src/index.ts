import * as functions from "firebase-functions/v1";

export { createCheckout } from "./checkout";

const MIME_MAP: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

export const convert = functions
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const parsed = await parseMultipart(req);
      const fmt = parsed.format.toLowerCase();

      if (fmt === "txt") {
        const text = await pdfToText(parsed.buffer);
        res.set("Content-Type", "text/plain; charset=utf-8");
        res.set("Content-Disposition", `attachment; filename="${safeName(parsed.fileName)}.txt"`);
        res.send(text);
      } else if (fmt === "docx") {
        const docxBuf = await pdfToDocx(parsed.buffer);
        res.set("Content-Type", MIME_MAP.docx);
        res.set("Content-Disposition", `attachment; filename="${safeName(parsed.fileName)}.docx"`);
        res.send(docxBuf);
      } else {
        res.status(400).json({
          error: `Supported formats: docx, txt. Received: "${fmt}"`,
        });
      }
    } catch (err) {
      console.error("Conversion error:", err);
      res.status(500).json({
        error: "Conversion failed",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function parseMultipart(req: any): Promise<{ buffer: Buffer; format: string; fileName: string }> {
  const Busboy = require("busboy");
  const { Readable } = require("stream");

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const chunks: Buffer[] = [];
    let format = "pdf";
    let fileName = "document";

    busboy.on("file", (_fieldname: string, file: any) => {
      file.on("data", (data: Buffer) => chunks.push(data));
    });
    busboy.on("field", (name: string, val: string) => {
      if (name === "format") format = val;
      if (name === "fileName") fileName = val;
    });
    busboy.on("finish", () => {
      if (chunks.length === 0) return reject(new Error("No file uploaded"));
      resolve({ buffer: Buffer.concat(chunks), format, fileName });
    });
    busboy.on("error", reject);

    if (req.rawBody) {
      const readable = new Readable();
      readable.push(req.rawBody);
      readable.push(null);
      readable.pipe(busboy);
    } else {
      reject(new Error("No body"));
    }
  });
}

async function pdfToText(buffer: Buffer): Promise<string> {
  const pdfParse = require("pdf-parse/lib/pdf-parse");
  const data = await pdfParse(buffer);
  return data.text;
}

async function pdfToDocx(buffer: Buffer): Promise<Buffer> {
  const pdfParse = require("pdf-parse/lib/pdf-parse");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx");

  const data = await pdfParse(buffer);
  const text: string = data.text;
  const lines = text.split("\n");
  const paragraphs: any[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    const isHeading =
      trimmed === trimmed.toUpperCase() &&
      trimmed.length > 2 &&
      trimmed.length < 60 &&
      !/^\d/.test(trimmed) &&
      !/[.,:;]$/.test(trimmed);

    const isBullet = /^[•\-–—\*]\s/.test(trimmed);

    if (isHeading) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, bold: true, size: 28, font: "Calibri" })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (isBullet) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace(/^[•\-–—\*]\s*/, ""), size: 22, font: "Calibri" })],
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
        })
      );
    } else {
      const colonSplit = trimmed.match(/^(.+?)\s*:\s*(.+)$/);
      if (colonSplit && colonSplit[1].length < 40) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: colonSplit[1] + " : ", bold: true, size: 22, font: "Calibri" }),
              new TextRun({ text: colonSplit[2], size: 22, font: "Calibri" }),
            ],
            spacing: { before: 40, after: 40 },
          })
        );
      } else {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed, size: 22, font: "Calibri" })],
            spacing: { before: 40, after: 40 },
            alignment: trimmed.length > 80 ? AlignmentType.JUSTIFIED : undefined,
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: paragraphs,
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
