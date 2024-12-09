import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { uniqueLetterCombinations, calculateLabelLength } from '../main/extension';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(0, [1, 2, 3].indexOf(1), "first item is 1");

	});

	test('uniqueLetterCombinations should generate combinations of length 1', () => {
		const generator = uniqueLetterCombinations(1);
		const combinations = Array.from(generator);
		assert.strictEqual(combinations.length, 26);
		assert.deepStrictEqual(combinations.slice(0, 3), ['a', 'b', 'c']);
		assert.deepStrictEqual(combinations.slice(-3), ['x', 'y', 'z']);
	});

	test('uniqueLetterCombinations should generate combinations of length 2', () => {
		const generator = uniqueLetterCombinations(2);
		const combinations = Array.from(generator);
		assert.strictEqual(combinations.length, 26 * 26);
		assert.deepStrictEqual(combinations.slice(0, 3), ['aa', 'ba', 'ca']);
		assert.deepStrictEqual(combinations.slice(-3), ['xz', 'yz', 'zz']);
	});

	test('uniqueLetterCombinations should generate combinations of length 3', () => {
		const generator = uniqueLetterCombinations(3);
		const combinations = Array.from(generator);
		assert.strictEqual(combinations.length, 26 * 26 * 26);
		assert.deepStrictEqual(combinations.slice(0, 3), ['aaa', 'baa', 'caa']);
		assert.deepStrictEqual(combinations.slice(-3), ['xzz', 'yzz', 'zzz']);
	});

	test('calculateLabelLength should return correct label length', () => {
		assert.strictEqual(calculateLabelLength(1), 1, 'Failed for 1 match');
		assert.strictEqual(calculateLabelLength(26), 1, 'Failed for 26 matches');
		assert.strictEqual(calculateLabelLength(27), 2, 'Failed for 27 matches');
		assert.strictEqual(calculateLabelLength(26 * 26), 2, 'Failed for 26*26 matches');
		assert.strictEqual(calculateLabelLength(26 * 26 + 1), 3, 'Failed for 26*26+1 matches');
	});
});
