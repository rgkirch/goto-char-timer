import * as vscode from 'vscode';
import { ThemeColor } from 'vscode';
import * as rxjs from 'rxjs';
import * as rxops from 'rxjs/operators';

const commandId = 'goto-char-timer';

const gotoTimerTimeout = 800;

const debug = true; // Set this to false to disable logging

function logDebug(message: string) {
	if (debug) {
		console.log(message);
	}
}

function memoize<T extends (...args: any[]) => any>(fn: T): T {
	const cache = new Map<string, ReturnType<T>>();
	return function (...args: Parameters<T>): ReturnType<T> {
		const key = JSON.stringify(args);
		if (!cache.has(key)) {
			cache.set(key, fn(...args));
		}
		return cache.get(key)!;
	} as T;
}

const getIncrementalMatchDecoration = memoize(() => {
	return vscode.window.createTextEditorDecorationType({
		backgroundColor: new ThemeColor('editor.wordHighlightBackground')
	});
});

const jumpLabelDecoration = memoize((contentText: string) => {
	return vscode.window.createTextEditorDecorationType({
		backgroundColor: new ThemeColor('editor.wordHighlightBackground'),
		before: {
			contentText: contentText,
			margin: '0 5px 0 5px',
			backgroundColor: '#4169E1',
			border: '3px solid',
			color: 'white',
			borderColor: '#4169E1',
		},
	});
});

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

// find all occurrences of matchText in editor. return as observable of ranges.
function findCandidates(
	matchText: string,
	editor: vscode.TextEditor,
): rxjs.Observable<vscode.Range> {
	const regex = new RegExp(matchText, 'gi');
	return new rxjs.Observable<vscode.Range>(
		subscriber => {
			(async () => {
				for (const visibleRange of editor.visibleRanges) {
					const text = editor.document.getText(visibleRange);
					const visibleRangeOffset = editor.document.offsetAt(visibleRange.start);
					const matches = text.matchAll(regex);
					for (const match of matches) {
						if (subscriber.closed) { return; }
						const matchOffset: number = visibleRangeOffset + match.index;
						const range = new vscode.Range(
							editor.document.positionAt(matchOffset),
							editor.document.positionAt(matchOffset + match[0].length));
						subscriber.next(range);
						await new Promise(resolve => setTimeout(resolve, 0)); // Yield to the event loop
					}
				}
				subscriber.complete();
			})();
		}
	);
}


/**
 * Finds all candidate ranges in the given text editor that match the specified text.
 *
 * @param matchText - The text to match within the editor.
 * @param editor - The text editor in which to search for matches.
 * @returns An observable that emits a tuple containing the vscode.TextEditor and an array of vscode.Range objects representing the matched ranges.
 */
function findAllCandidates(
	matchText: string,
	editor: vscode.TextEditor
): rxjs.Observable<[vscode.TextEditor, vscode.Range[]]> {
	return findCandidates(matchText, editor).pipe(
		rxops.scan((acc, range) => {
			acc.push(range);
			return acc;
		}, [] as vscode.Range[]),
		rxops.defaultIfEmpty([]), // Return an empty array if no matches are found
		rxops.map(ranges => [editor, ranges] as [vscode.TextEditor, vscode.Range[]])
	);
}

/**
 * Finds all matching text candidates for all provided editors.
 *
 * @param matchText - The text to match within the editors.
 * @param editors - A readonly array of vscode.TextEditor instances to search within.
 * @returns An Observable that emits a Map where each key is a vscode.TextEditor and each value is an array of vscode.Range objects representing the matched text ranges.
 */
function findCandidatesForAllEditors(
	matchText: string,
	editors: readonly vscode.TextEditor[],
): rxjs.Observable<Map<vscode.TextEditor, vscode.Range[]>> {
	if (!matchText) {
		logDebug('Match text is empty, clearing decorations');
		return rxjs.of(new Map(editors.map(editor => [editor, []] as [vscode.TextEditor, vscode.Range[]])));
	}
	return rxjs.from(editors)
		.pipe(
			rxops.mergeMap(editor =>
				findAllCandidates(matchText, editor)
			),
			rxops.reduce((acc, [editor, ranges]) => acc.set(editor, ranges),
				new Map<vscode.TextEditor, vscode.Range[]>())
		);
}

/**
 * Retrieves the visible ranges for all open text editors in the current VS Code window.
 *
 * @returns {Map<vscode.TextEditor, readonly vscode.Range[]>} A map where each key is a text editor and the value is an array of visible ranges within that editor.
 */
function textEditorVisibleRanges(): Map<vscode.TextEditor, readonly vscode.Range[]> {
	return vscode.window.visibleTextEditors.reduce(
		(m, editor) => m.set(editor, editor.visibleRanges),
		new Map<vscode.TextEditor, readonly vscode.Range[]>()
	);
}

/**
 * Displays an input box with a prompt and returns an observable that emits the input value.
 * The observable completes when the input box is accepted, hidden, or after a specified timeout.
 *
 * @param prompt - The prompt message to display in the input box.
 * @param timeout - The timeout duration in milliseconds. Defaults to 800 ms.
 * @returns An observable that emits an object containing:
 *   - `stopTimeout`: A function to stop the timeout.
 *   - `dispose`: A function to dispose of the input box.
 *   - `value`: The current value of the input box.
 */
function rxInputBox(prompt: string, timeout: number = 800): rxjs.Observable<{ stopTimeout: () => void, dispose: () => void, value: string }> {
	const inputBox = vscode.window.createInputBox();
	inputBox.prompt = prompt;
	inputBox.value = '';
	inputBox.show();
	return new rxjs.Observable<{ stopTimeout: () => void, dispose: () => void, value: string }>(observer => {
		let timeoutHandle: NodeJS.Timeout | null = null;

		const startTimeout = () => {
			if (timeoutHandle) {
				clearTimeout(timeoutHandle);
			}
			timeoutHandle = setTimeout(() => {
				observer.complete();
				inputBox.dispose();
			}, timeout);
		};

		const stopTimeout = () => {
			if (timeoutHandle) {
				clearTimeout(timeoutHandle);
				timeoutHandle = null;
			}
		};

		const dispose = () => {
			stopTimeout();
			inputBox.dispose();
		};

		inputBox.onDidChangeValue(value => {
			startTimeout();
			observer.next({ stopTimeout, dispose, value });
		});
		inputBox.onDidAccept(() => {
			stopTimeout();
			observer.complete();
			inputBox.dispose();
		});
		inputBox.onDidHide(() => {
			stopTimeout();
			observer.complete();
			inputBox.dispose();
		});
	});
}

/**
 * Clears the incremental match decorations for the given array of text editors.
 *
 * @param editors - An array of `vscode.TextEditor` instances for which the incremental match decorations should be cleared.
 */
function clearIncrementalRanges(editors: vscode.TextEditor[]) {
	editors.forEach(editor => {
		editor.setDecorations(getIncrementalMatchDecoration(), []);
	});
}

/**
 * Calculates the length of the label based on the number of matches.
 * 
 * @param numMatches - The number of matches found.
 * @returns The length of the label.
 */
export function calculateLabelLength(numMatches: number): number {
	if (numMatches < 1) {
		throw new Error('Number of matches cannot be negative');
	} else if (numMatches === 1) {
		return 1;
	} else {
		return Math.ceil(Math.log(numMatches) / Math.log(LETTERS.length));
	}
}

/**
 * Jumps the cursor to the specified position in the given editor.
 * 
 * @param editor - The text editor in which to jump.
 * @param position - The position to jump to.
 */
function jumpToPosition(editor: vscode.TextEditor, position: vscode.Position) {
	editor.revealRange(new vscode.Range(position, position));
	editor.selection = new vscode.Selection(position, position);
}

/**
 * Activates the `gotoCharTimer` command which allows users to search for a string within the visible ranges of all open editors,
 * and then jump to a specific match by entering a label.
 *
 * This function:
 * - Retrieves the visible ranges of all open editors.
 * - Prompts the user to enter a string to search for.
 * - Searches for the entered string within the visible ranges of all open editors.
 * - If matches are found, labels each match.
 * - Prompts the user to enter a label to jump to.
 * - If a unique match is found, jumps to that match.
 *
 * The function uses RxJS operators to handle asynchronous operations and manage the observable streams.
 */
function gotoCharTimer() {
	logDebug(`Command ${commandId} Activated`);
	const visibleRanges = textEditorVisibleRanges();
	rxInputBox('Enter a string to search for', gotoTimerTimeout)
		.pipe(
			rxops.tap({
				complete: () => {
					logDebug('Input box closed');
					clearIncrementalRanges(Array.from(visibleRanges.keys()));
				}
			}),
			rxops.switchMap(input => {
				return findCandidatesForAllEditors(input.value, Array.from(visibleRanges.keys()))
					.pipe(
						rxops.map(matchesMap => ({ ...input, matchesMap }))
					);
			}),
			rxops.tap(({ stopTimeout, matchesMap }) => {
				if (Array.from(matchesMap.values()).every(ranges => ranges.length === 0)) {
					logDebug('No matches found');
					stopTimeout();
					clearIncrementalRanges(Array.from(matchesMap.keys()));
				} else {
					matchesMap.forEach((ranges, editor) => {
						editor.setDecorations(getIncrementalMatchDecoration(), ranges);
					});
				}
			}),
			rxops.last(),
			rxops.switchMap(({ matchesMap }) => {
				const numMatches: number = Array.from(matchesMap.values()).reduce((acc, ranges) => acc + ranges.length, 0);
				logDebug(`Number of matches: ${numMatches}`);
				if (numMatches === 1) {
					const [editor, [range]] = matchesMap.entries().next().value!;
					jumpToPosition(editor, range!.start);
					return rxjs.EMPTY;
				}
				const labelLength: number = calculateLabelLength(numMatches);
				const labelGenerator: Generator<string> = uniqueLetterCombinations(labelLength);
				const withLabels: [string, vscode.TextEditor, vscode.Range][] =
					Array.from(matchesMap).flatMap(([editor, ranges]) => {
						return ranges.map(range => {
							const label: string = labelGenerator.next().value;
							editor.setDecorations(jumpLabelDecoration(label), [range]);
							return [label, editor, range] as [string, vscode.TextEditor, vscode.Range];
						});
					});
				return rxInputBox('Enter a label to jump to')
					.pipe(
						rxops.tap({
							complete() {
								for (const [label, editor, _range] of withLabels) {
									editor.setDecorations(jumpLabelDecoration(label), []);
								}
							}
						}),
						rxops.map(({ dispose: disposeInputBox, value: input }) => {
							logDebug(`Label input: ${input}`);
							for (const [label, editor, _range] of withLabels) {
								editor.setDecorations(jumpLabelDecoration(label), []);
							}
							const matches: [string, vscode.TextEditor, vscode.Range][]
								= withLabels.filter(([label, _editor, _range]) => label.startsWith(input));
							logDebug(`Matches: ${JSON.stringify(matches.map(([label, _editor, _range]) => label))}`);
							if (matches.length === 1) {
								const match = matches[0];
								if (match) {
									const [, editor, range] = match;
									jumpToPosition(editor, range.start);
									disposeInputBox(); // Close the input box
									return; // End the observable
								}
							} else {
								matches.forEach(([label, editor, range]) => {
									editor.setDecorations(jumpLabelDecoration(label.slice(input.length)), [range]);
								});
							}
						}),
					);
			})
		).subscribe();
}

/**
 * Generates unique letter combinations of a given length.
 * 
 * @param length - The length of each combination.
 * @param letters - The set of letters to use for generating combinations.
 * @returns A generator that yields letter combinations.
 */
export function* uniqueLetterCombinations(length: number, letters: string = LETTERS): Generator<string> {
	const generate = function* (suffix: string, length: number): Generator<string> {
		if (length === 0) {
			yield suffix;
			return;
		}
		for (const letter of letters) {
			yield* generate(letter + suffix, length - 1);
		}
	};
	yield* generate('', length);
}

/**
 * Activates the extension by registering the command with the given command ID.
 * 
 * @param {vscode.ExtensionContext} context - The context in which the extension is activated, including subscriptions.
 */
export function activate({ subscriptions }: vscode.ExtensionContext) {
	logDebug(`Registering command ${commandId}`);
	subscriptions.push(vscode.commands.registerCommand(commandId, () => gotoCharTimer()));
}

// This method is called when your extension is deactivated
export function deactivate() { }

