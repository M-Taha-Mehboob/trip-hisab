/**
 * Shrink a receipt photo on the phone before upload: max 1280px on the long side, JPEG, lowering the
 * quality until it is under ~200 KB. Phone cameras give 3-6 MB files; this keeps Storage and mobile data small.
 */
export async function compressImage(file: File, maxBytes = 200_000, maxSide = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  let blob: Blob | null = null
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.8, 0.65, 0.5]) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= maxBytes) {
        bitmap.close()
        return blob
      }
    }
    scale *= 0.75
  }
  bitmap.close()
  if (!blob) throw new Error('Photo compress nahi ho saki')
  return blob
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
