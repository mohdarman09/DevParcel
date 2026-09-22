/**
 * Utility to initiate a browser download from an authorized URL without exposing
 * credentials or rendering untrusted links.
 */
export function triggerBrowserDownload(url: string, fileName?: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('rel', 'noopener noreferrer');
  if (fileName) {
    link.setAttribute('download', fileName);
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
