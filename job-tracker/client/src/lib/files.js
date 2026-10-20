// Hand a file to the browser as a download.
export function saveBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const saveText = (filename, text, type = 'text/plain') => saveBlob(filename, new Blob([text], { type: `${type};charset=utf-8` }));

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false; // clipboard blocked (insecure context or denied permission)
  }
}
