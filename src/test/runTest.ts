import * as path from 'path';

import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		console.log('__dirname:', __dirname);
		
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		console.log('Extension Development Path:', extensionDevelopmentPath);

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		console.log('Extension Tests Path:', extensionTestsPath);

		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath });
	} catch {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
