const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = path.resolve(__dirname, '../../frontend/src/lib/student-availability.ts');
const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleObject = { exports: {} };
new Function('exports', 'module', compiled)(moduleObject.exports, moduleObject);
const cases = [[], [10,11,12,13], [10], [0,23], [6,7,8,9]];
const results = cases.map(hours => {
  const actual = moduleObject.exports.formatStudentHours(hours);
  return { hours, actual, passed: hours.length ? actual !== 'Availability not provided' : actual === 'Availability not provided' };
});
console.log(JSON.stringify(results, null, 2));
process.exitCode = results.some(result => !result.passed) ? 1 : 0;
