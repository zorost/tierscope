function downloadUrl(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** html2canvas paints <button> text plus child spans, and mishandles 650-weight + ellipsis. */
function sanitizeExportClone(doc: Document, el: HTMLElement) {
  const sheet = doc.createElement("style");
  sheet.textContent = `
    .tier-title, .tier-title strong, .tier-title span { color: #fff !important; text-shadow: none !important; -webkit-text-stroke: 0 !important; }
    .tier-lane:empty::after { color: #fff !important; opacity: 0.42 !important; text-shadow: none !important; }
  `;
  el.prepend(sheet);
  el.querySelectorAll(".tier-lane").forEach((lane) => {
    (lane as HTMLElement).style.background = "#0a0a0b";
  });
  el.querySelectorAll("button.chip").forEach((btn) => {
    const div = el.ownerDocument.createElement("div");
    div.className = btn.className;
    const style = btn.getAttribute("style");
    if (style) div.setAttribute("style", style);
    while (btn.firstChild) div.appendChild(btn.firstChild);
    btn.replaceWith(div);
  });
  el.querySelectorAll<HTMLElement>(".chip").forEach((chip) => {
    chip.style.transform = "none";
    chip.style.transition = "none";
    chip.style.maxWidth = "none";
    chip.style.paddingRight = "14px";
    chip.style.background = "#18181b";
    chip.style.boxShadow = "none";
    chip.style.fontFeatureSettings = "normal";
  });
  el.querySelectorAll<HTMLElement>(".chip-name").forEach((name) => {
    name.style.fontWeight = "600";
    name.style.letterSpacing = "0";
    name.style.overflow = "visible";
    name.style.textOverflow = "clip";
    name.style.whiteSpace = "nowrap";
    name.style.textShadow = "none";
    name.style.webkitTextStroke = "0";
    name.style.fontFeatureSettings = "normal";
  });
}

export async function exportNodePng(node: HTMLElement, filename: string): Promise<void> {
  if (document.fonts?.ready) await document.fonts.ready;
  const { default: html2canvas } = await import("html2canvas");
  const width = Math.ceil(Math.max(node.scrollWidth, node.clientWidth));
  const height = Math.ceil(Math.max(node.scrollHeight, node.clientHeight));
  const canvas = await Promise.race([
    html2canvas(node, {
      backgroundColor: "#09090a",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 2000,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      onclone(doc, el) {
        sanitizeExportClone(doc, el);
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
