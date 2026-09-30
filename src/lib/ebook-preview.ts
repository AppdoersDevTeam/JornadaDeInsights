// Admin-only helpers that turn the first pages of an ebook PDF into public WebP previews.
// Import this module dynamically so pdfjs stays out of the shop bundle.
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase } from '@/lib/supabase';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const EBOOK_PREVIEW_PAGE_COUNT = 2;
const TARGET_WIDTH_PX = 1200;
const WEBP_QUALITY = 0.85;

export const ebookPreviewPath = (filename: string, page: number): string =>
  `previews/${filename}-${page}.webp`;

const canvasToWebp = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode preview page'));
          return;
        }
        if (blob.type !== 'image/webp') {
          reject(new Error('This browser cannot encode WebP images'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      WEBP_QUALITY
    );
  });

export async function renderPreviewPages(pdf: Blob, maxPages = EBOOK_PREVIEW_PAGE_COUNT): Promise<Blob[]> {
  const data = new Uint8Array(await pdf.arrayBuffer());
  const doc = await getDocument({ data }).promise;
  try {
    const pageCount = Math.min(maxPages, doc.numPages);
    const images: Blob[] = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: TARGET_WIDTH_PX / baseViewport.width });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D context unavailable');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: context, viewport }).promise;
      images.push(await canvasToWebp(canvas));
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
    }
    return images;
  } finally {
    await doc.destroy();
  }
}

/** Renders pages 1..N, uploads them to store-assets/previews and records the count. Returns pages stored. */
export async function generateAndUploadPreview(filename: string, pdfBlob: Blob): Promise<number> {
  const images = await renderPreviewPages(pdfBlob);

  for (const [index, image] of images.entries()) {
    const { error } = await supabase.storage
      .from('store-assets')
      .upload(ebookPreviewPath(filename, index + 1), image, {
        contentType: 'image/webp',
        cacheControl: '86400',
        upsert: true,
      });
    if (error) throw error;
  }

  const { error: updateError } = await supabase
    .from('ebooks_metadata')
    .update({ preview_pages: images.length })
    .eq('filename', filename);
  if (updateError) throw updateError;

  return images.length;
}

/** Downloads the private PDF (admin-only by RLS) and regenerates its preview. */
export async function generatePreviewFromStorage(filename: string): Promise<number> {
  const { data, error } = await supabase.storage.from('ebook-pdfs').download(`pdfs/${filename}`);
  if (error || !data) throw error ?? new Error('PDF download failed');
  return generateAndUploadPreview(filename, data);
}

export async function removePreview(filename: string): Promise<void> {
  const paths = Array.from({ length: EBOOK_PREVIEW_PAGE_COUNT }, (_, i) => ebookPreviewPath(filename, i + 1));
  const { error } = await supabase.storage.from('store-assets').remove(paths);
  if (error) throw error;
}
