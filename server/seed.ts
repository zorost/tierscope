import { purgeCalibration, seedCalibrationIfEmpty, syncRegistry } from "./logic.ts";

const purge = process.argv.includes("--purge-calibration");
if (purge) {
  const n = purgeCalibration();
  console.log(`Removed ${n} calibration vote rows.`);
  process.exit(0);
}

const { added, updated } = syncRegistry("seed");
console.log(`Registry synced (added ${added}, updated ${updated}).`);
const inserted = seedCalibrationIfEmpty();
console.log(
  inserted > 0
    ? `Inserted ${inserted} calibration votes.`
    : "Calibration votes already present.",
);
