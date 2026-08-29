import { runEngineUnitTests } from '../lib/engine.test';

console.log('Running VisionCraft TypeScript Engine Unit Tests...\n');
const report = runEngineUnitTests();

report.results.forEach((r, idx) => {
  if (r.passed) {
    console.log(`[PASS] Test ${idx + 1}: ${r.name} (${r.durationMs}ms)`);
  } else {
    console.error(`[FAIL] Test ${idx + 1}: ${r.name} (${r.durationMs}ms)`);
    console.error(`       Error: ${r.error}`);
  }
});

console.log(`\n========================================`);
console.log(`Summary: ${report.passedTests}/${report.totalTests} Passed (${report.durationMs}ms)`);
console.log(`========================================\n`);

if (report.failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
