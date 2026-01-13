import { supabase } from './supabase';

const DEFAULT_BUCKET = 'product-images';
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (límite recomendado)
const MAX_INPUT_SIZE_BYTES = 20 * 1024 * 1024; // 20MB (permitimos entrada más grande y la comprimimos)

const getBucketName = () => {
  // Opcional: permitir configurar el bucket por .env
  // VITE_SUPABASE_PRODUCT_IMAGES_BUCKET=product-images
  return import.meta?.env?.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET || DEFAULT_BUCKET;
};

const getFileExtension = (file) => {
  const name = file?.name || '';
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  if (match?.[1]) return match[1].toLowerCase();

  const type = file?.type || '';
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';

  return 'bin';
};

const safeId = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '_');

const fileToImageBitmap = async (file) => {
  // createImageBitmap es rápido y evita depender del DOM.
  if (globalThis.createImageBitmap) {
    return await globalThis.createImageBitmap(file);
  }

  // Fallback: usar Image + ObjectURL.
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = objectUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Convertir a bitmap-like usando canvas.
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear el contexto de canvas.');
    ctx.drawImage(img, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const drawToCanvas = (source, targetWidth, targetHeight) => {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto de canvas.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas;
};

const canvasToBlob = async (canvas, mimeType, quality) => {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error('No se pudo convertir la imagen.'));
        else resolve(b);
      },
      mimeType,
      quality
    );
  });
  return blob;
};

const elegirFormatoSalida = () => {
  // Preferimos webp si el navegador lo soporta; caso contrario, jpeg.
  // En la práctica, canvas.toBlob con image/webp puede devolver null en navegadores viejos.
  return 'image/webp';
};

const compressImageFile = async (file, opts = {}) => {
  const mimeType = opts.mimeType || elegirFormatoSalida();
  const maxDimension = opts.maxDimension ?? 1200;
  const maxBytes = opts.maxBytes ?? MAX_UPLOAD_SIZE_BYTES;

  const source = await fileToImageBitmap(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;

  if (!width || !height) throw new Error('No se pudo leer el tamaño de la imagen.');

  let targetMax = maxDimension;
  let quality = opts.quality ?? 0.82;
  let attempt = 0;
  let bestBlob = null;

  while (attempt < 7) {
    const scale = Math.min(1, targetMax / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = drawToCanvas(source, targetWidth, targetHeight);
    let blob;

    try {
      blob = await canvasToBlob(canvas, mimeType, quality);
    } catch {
      // Fallback de formato si webp falla.
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
    if (blob.size <= maxBytes) break;

    // Ajustar para reducir tamaño.
    quality = Math.max(0.5, quality - 0.1);
    targetMax = Math.max(700, Math.round(targetMax * 0.85));
    attempt += 1;
  }

  if (!bestBlob) throw new Error('No se pudo comprimir la imagen.');
  if (bestBlob.size > maxBytes) {
    throw new Error('No se pudo comprimir la imagen por debajo de 5MB.');
  }

  const outExt = bestBlob.type === 'image/webp' ? 'webp' : 'jpg';
  const outName = (file.name || 'imagen').replace(/\.[^/.]+$/, '') + `.${outExt}`;
  return new File([bestBlob], outName, { type: bestBlob.type });
};

export const uploadProductImage = async ({ file, productId }) => {
  if (!file) throw new Error('No se seleccionó ningún archivo.');

  const bucket = getBucketName();

  if (file.size > MAX_INPUT_SIZE_BYTES) {
    throw new Error('La imagen es muy pesada para procesar (máx. 20MB).');
  }

  // Comprimir/redimensionar (solo imágenes)
  let fileToUpload = file;
  if ((file.type || '').startsWith('image/')) {
    fileToUpload = await compressImageFile(file, {
      maxDimension: 1200,
      quality: 0.82,
      maxBytes: MAX_UPLOAD_SIZE_BYTES,
      mimeType: 'image/webp',
    });
  }

  const ext = getFileExtension(fileToUpload);
  const idPart = productId ? safeId(productId) : 'sin-id';
  const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now());

  const path = `productos/${idPart}/${uuid}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, fileToUpload, {
      upsert: true,
      contentType: fileToUpload.type || undefined,
      cacheControl: '3600',
    });

  if (uploadError) {
    const msg = String(uploadError?.message || '').toLowerCase();
    if (msg.includes('bucket not found') || msg.includes('bucket') && msg.includes('not found')) {
      throw new Error(
        `No existe el bucket de Storage "${bucket}" en tu Supabase. ` +
          `Créalo en Storage (recomendado: bucket público) o ajusta VITE_SUPABASE_PRODUCT_IMAGES_BUCKET.`
      );
    }

    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('No se pudo generar la URL pública de la imagen.');
  }

  return { publicUrl: data.publicUrl, path, bucket };
};
