import { formatDif } from "./difSchema.js";
import { makeWOStem } from "./names.js";

const EOL = "\r\n";

/**
 * Generate QUE and DIF files from queue data
 * Extracted from queMachine.js to be reusable for on-demand downloads
 *
 * @param {Object} queue - Queue object with groups and work orders
 * @returns {Object} { queFile: {name, text}, difFiles: [{name, text}, ...], errors: [] }
 */
export function generateQueueFiles(queue) {
  if (!queue || !queue.groups || queue.groups.length === 0) {
    throw new Error("Queue has no groups to generate files");
  }

  const errors = [];
  const queLines = [];
  const difFiles = [];
  let position = 1;

  // Process each group
  queue.groups.forEach((group, groupIdx) => {
    // Handle MongoDB $numberDecimal format
    const groupThickness = parseFloat(
      group.thickness?.$numberDecimal || group.thickness
    );

    if (!Number.isFinite(groupThickness)) {
      errors.push(`Group ${groupIdx + 1}: missing thickness — skipped`);
      return;
    }

    // Process work orders in group
    (group.workOrders || []).forEach((woItem, woIdx) => {
      if (!woItem?.woNumber) {
        errors.push(`Group ${groupIdx + 1}, WO ${woIdx + 1}: missing woNumber — skipped`);
        return;
      }

      // Get the full work order data
      const wo = woItem.workOrder || woItem;

      // Validate work order data
      if (!wo || typeof wo !== 'object') {
        errors.push(
          `Group ${groupIdx + 1}, WO ${woIdx + 1} (${woItem.woNumber}): work order data not found — skipped`
        );
        return;
      }

      // Generate DIF filename
      const stem = makeWOStem(woItem.woNumber || wo.woNumber, wo.no);
      const difName = `${stem}.DIF`;

      // Generate DIF file content
      const mtnum = wo.mtnum != null ? Number(wo.mtnum) : undefined;
      const ctnum = wo.ctnum != null ? Number(wo.ctnum) : position;
      const difText = formatDif(wo, { mtnum, ctnum });

      difFiles.push({ name: difName, text: difText });

      // Add line to QUE file
      queLines.push(`"${difName}" ${difName} ${position} ${groupThickness}`);

      position++;
    });
  });

  // Build QUE file content
  const queFileName = queue.name || "queue.QUE";
  const queText = ["queue file", ...queLines].join(EOL) + EOL;

  return {
    queFile: { name: queFileName, text: queText },
    difFiles,
    errors
  };
}
