import JSZip from "jszip";
import { saveAs } from "file-saver";

export async function downloadAsZip(queueFile, difFiles, zipName = "job-files.zip") {
  const zip = new JSZip();

  // Add the QUE file
  if (queueFile) {
    zip.file(queueFile.name, queueFile.text);
  }

  // Add all DIF files
  (difFiles || []).forEach((f) => {
    zip.file(f.name, f.text);
  });

  // Generate and trigger download
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, zipName);
}
