const DISEASE_API_URL = process.env.EXPO_PUBLIC_DISEASE_API_URL;

const getFileMeta = (asset) => {
  const fallbackName = `leaf-${Date.now()}.jpg`;
  const name = asset.fileName || asset.uri?.split('/').pop() || fallbackName;
  const ext = name.split('.').pop()?.toLowerCase();

  let type = asset.mimeType;
  if (!type) {
    if (ext === 'png') type = 'image/png';
    else if (ext === 'webp') type = 'image/webp';
    else if (ext === 'bmp') type = 'image/bmp';
    else type = 'image/jpeg';
  }

  return { name, type };
};

export const detectPlantDisease = async (asset, topK = 3) => {
  if (!DISEASE_API_URL) {
    throw new Error('Disease API URL is not configured.');
  }

  if (!asset?.uri) {
    throw new Error('Please select an image first.');
  }

  const { name, type } = getFileMeta(asset);
  const formData = new FormData();

  formData.append('file', {
    uri: asset.uri,
    name,
    type,
  });

  const response = await fetch(`${DISEASE_API_URL}/disease/detect?top_k=${topK}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.detail || payload?.message || 'Disease detection failed.';
    throw new Error(message);
  }

  return payload;
};
