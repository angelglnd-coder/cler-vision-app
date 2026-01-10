export function makeWOStem(woNumber, woLine) {
  const num = String(woNumber ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-+/g, "-"); // normalize dashes

  let line = woLine ?? "01";
  line = typeof line === "number" ? String(line) : String(line ?? "").trim();
  if (/^\d+$/.test(line)) line = line.padStart(2, "0"); // keep 01, 02, ...

  return `${num}-${line}`;
}
