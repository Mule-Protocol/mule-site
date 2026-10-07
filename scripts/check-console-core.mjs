import { verifyConsoleCoreDirectory } from './console-core-integrity.mjs';

const result = verifyConsoleCoreDirectory();
console.log('Console core integrity OK: ' + result.hash + ' (' + result.bytes + ' bytes; commit ' + result.commit + ')');
