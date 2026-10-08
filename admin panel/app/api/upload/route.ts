import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

/**
 * What the admin screens actually upload: item and category pictures, plan
 * pictures, and hero banners which may be video.
 *
 * Anything outside this list is refused. The folder is served straight off disk
 * by nginx on the same origin as the admin panel, so a file that the browser is
 * willing to execute -- .html, .svg, .xhtml -- would run as the panel itself.
 * SVG is deliberately absent: it is an image to a person and a script container
 * to a browser.
 */
const ALLOWED: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const extension = ALLOWED[file.type];
    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error: `This file type is not allowed. Pictures: PNG, JPG, WEBP, GIF. Video: MP4, WEBM, MOV.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: `File is too large. The limit is ${MAX_BYTES / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Keep a readable name, but the extension comes from the type we accepted,
    // never from what the caller typed.
    const base = path
      .basename(file.name, path.extname(file.name))
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .slice(0, 60) || 'upload';
    const filename = `${Date.now()}-${base}${extension}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);
    console.log('File uploaded:', filepath);

    const url = `/uploads/${filename}`;

    return NextResponse.json({ success: true, url, filename });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
