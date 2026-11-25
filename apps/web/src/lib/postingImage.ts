import { planImageSlices } from '@/utils/postingImageSlices';

// 공고 이미지를 조각으로 잘라 JPEG base64로 만든다 (#232). 브라우저에서만 쓴다(canvas).
// 이미지는 서버에 저장하지 않고 이번 요청에만 보낸다.

export const POSTING_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_POSTING_IMAGE_FILES = 5;
export const MAX_POSTING_IMAGE_BYTES = 20 * 1024 * 1024; // 원본 파일 하나 20MB
// 글자가 뭉개지지 않게 압축을 세게 하지 않는다(공식 Vision 문서: 강한 JPEG 압축은 글자를 읽기 어렵게 한다).
const JPEG_QUALITY = 0.9;

export interface PostingImagePayload {
  mediaType: 'image/jpeg';
  data: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ''));
    reader.onerror = () => reject(reader.error ?? new Error('이미지를 읽지 못했어요.'));
    reader.readAsDataURL(blob);
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요.'))), 'image/jpeg', JPEG_QUALITY);
  });
}

export async function slicePostingImage(file: Blob): Promise<PostingImagePayload[]> {
  const bitmap = await createImageBitmap(file);
  try {
    const payloads: PostingImagePayload[] = [];
    for (const slice of planImageSlices(bitmap.width, bitmap.height)) {
      const canvas = document.createElement('canvas');
      canvas.width = slice.width;
      canvas.height = slice.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이미지를 처리할 수 없는 브라우저예요.');
      // 투명 PNG는 JPEG로 바꾸면 검게 되므로 흰 바탕을 먼저 칠한다.
      context.fillStyle = 'white';
      context.fillRect(0, 0, slice.width, slice.height);
      context.drawImage(bitmap, 0, slice.sourceY, bitmap.width, slice.sourceHeight, 0, 0, slice.width, slice.height);
      payloads.push({ mediaType: 'image/jpeg', data: await blobToBase64(await canvasToJpeg(canvas)) });
    }
    return payloads;
  } finally {
    bitmap.close();
  }
}
