function downloadUrl(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function exportNodePng(node: HTMLElement, filename: string): Promise<void> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await Promise.race([
    html2canvas(node, {
      backgroundColor: "#09090a",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 2000,
      logging: false,
      onclone(_doc, el) {
        el.querySelectorAll(".tier-lane").forEach((lane) => {
          (lane as HTMLElement).style.background = "#0a0a0b";
        });
      },
    }),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Export timed out. Try again.")), 12000);
    }),
  ]);
  const href = canvas.toDataURL("image/png");
  if (!href.startsWith("data:image/png") || href.length < 64) {
    throw new Error("Could not encode the board image.");
  }
  downloadUrl(href, filename);
}