import * as vscode from 'vscode';
import { ThemeColor } from 'vscode';
import * as rxjs from 'rxjs';
import * as rxops from 'rxjs/operators';

const commandId = 'GotoCharTimer.gotoCharTimer';

const incrementalMatchDecoration = vscode.window.createTextEditorDecorationType({
	backgroundColor: new ThemeColor('editor.wordHighlightBackground')
});

function jumpLabelDecoration(contentText: string) {
	return vscode.window.createTextEditorDecorationType({
		backgroundColor: new ThemeColor('editor.wordHighlightBackground'),
		before: {
			border: '1px solid white',
			contentText: contentText,
			backgroundColor: '#4169E1',
			color: 'white',
			borderColor: 'white',
			textDecoration: 'none; position: absolute;',
		},
	});
}

/**
 * Retrieves the character set from the extension configuration.
 *
 * @returns A string containing the character set.
 */
function getLetters(): string {
	const config = vscode.workspace.getConfiguration('gotoCharTimer');
	const defaultCharset = 'abcdefghijklmnopqrstuvwxyz';
	const configuredCharset = config.get<string>('charset')?.trim();
	return (!configuredCharset || configuredCharset.length < 2) ? defaultCharset : configuredCharset;
}

/**
 * Finds all occurrences of matchText in the editor and returns them as a promise of ranges.
 *
 * @param matchText - The text to match within the editor.
 * @param editor - The text editor to search within.
 * @param abortSignal - The signal to abort the operation.
 * @returns A promise that resolves to an array of vscode.Range objects representing the matched text ranges.
 */
async function findCandidates(
	matchText: string,
	editor: vscode.TextEditor,
	abortSignal: AbortSignal,
): Promise<vscode.Range[]> {
	const regex = new RegExp(matchText, 'gi');
	const ranges: vscode.Range[] = [];
	const promises = editor.visibleRanges.map(async (visibleRange) => {
		if (abortSignal.aborted) {
			return;
		}
		const text = editor.document.getText(visibleRange);
		const visibleRangeOffset = editor.document.offsetAt(visibleRange.start);
		const matches = text.matchAll(regex);
		for (const match of matches) {
			if (abortSignal.aborted) {
				return;
			}
			const matchOffset: number = visibleRangeOffset + match.index!;
			const range = new vscode.Range(
				editor.document.positionAt(matchOffset),
				editor.document.positionAt(matchOffset + match[0].length));
			ranges.push(range);
		}
	});
	await Promise.all(promises);
	return ranges;
}

/**
 * Finds all matching text candidates for all provided editors.
 *
 * @param matchText - The text to match within the editors.
 * @param editors - A readonly array of vscode.TextEditor instances to search within.
 * @returns A promise that resolves to a Map where each key is a vscode.TextEditor and each value is an array of vscode.Range objects representing the matched text ranges.
 */
async function findCandidatesForAllEditors(
	matchText: string,
	editors: readonly vscode.TextEditor[],
): Promise<Map<vscode.TextEditor, vscode.Range[]>> {
	if (!matchText) {
		return new Map(editors.map(editor => [editor, []] as [vscode.TextEditor, vscode.Range[]]));
	}
	const matchesMap = new Map<vscode.TextEditor, vscode.Range[]>();
	const abortController = new AbortController();
	for (const editor of editors) {
		const ranges = await findCandidates(matchText, editor, abortController.signal);
		matchesMap.set(editor, ranges);
	}
	return matchesMap;
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
 * @param abortSignal - The signal to abort the operation.
 * @returns An observable that emits an object containing:
 *   - `dispose`: A function to dispose of the input box.
 *   - `value`: The current value of the input box.
 */
function rxInputBox(prompt: string, abortSignal: AbortSignal): rxjs.Observable<string> {
	const inputBox = vscode.window.createInputBox();
	inputBox.prompt = prompt;
	inputBox.value = '';
	inputBox.show();
	return new rxjs.Observable<string>(observer => {
		const finalizeInput = () => {
			observer.complete();
			inputBox.dispose();
		};
		inputBox.onDidChangeValue(value => observer.next(value));
		inputBox.onDidAccept(() => finalizeInput());
		inputBox.onDidHide(() => finalizeInput());
		abortSignal.onabort = () => finalizeInput();
	});
}

/**
 * Calculates the length of the label based on the number of matches.
 * 
 * @param numMatches - The number of matches found.
 * @returns The length of the label.
 */
export function calculateLabelLength(numMatches: number): number {
	const letters = getLetters();
	if (numMatches < 1) {
		throw new Error('Number of matches must be at least 1');
	} else if (numMatches === 1) {
		return 1;
	} else {
		return Math.ceil(Math.log(numMatches) / Math.log(letters.length));
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

/*
 * Clears all decorations from the provided editors.
 */
function clearDecorations(matchDecorations: [vscode.TextEditor, vscode.TextEditorDecorationType][]) {
	matchDecorations.forEach(([editor, decoration]) => {
		editor.setDecorations(decoration, []);
	});
	matchDecorations.length = 0;
}

/*
 * Adds decorations to the provided ranges in the editors and returns the updated matchDecorations array.
 */
function addDecorations(candidates: [string, vscode.TextEditor, vscode.Range][], matchDecorations: [vscode.TextEditor, vscode.TextEditorDecorationType][]): [vscode.TextEditor, vscode.TextEditorDecorationType][] {
	candidates.forEach(([label, editor, range]) => {
		const decoration = jumpLabelDecoration(label);
		editor.setDecorations(decoration, [range]);
		matchDecorations.push([editor, decoration]);
	});
	return matchDecorations;
}

/**
 * Handles the input for jumping to a specific match.
 *
 * @param matchesMap - A map where each key is a vscode.TextEditor and each value is an array of vscode.Range objects representing the matched text ranges.
 */
function handleLabelInput(matchesMap: Map<vscode.TextEditor, vscode.Range[]>) {
	const numMatches = countMatches(matchesMap);
	const labelLength = calculateLabelLength(numMatches);
	const labelGenerator = uniqueLetterCombinations(labelLength);
	const withLabels: [string, vscode.TextEditor, vscode.Range][] =
		Array.from(matchesMap)
			.flatMap(([editor, ranges]) =>
				ranges.map(range =>
					[(labelGenerator.next().value), editor, range] as [string, vscode.TextEditor, vscode.Range]));

	const labelInputAbortController = new AbortController();
	let matchDecorations: [vscode.TextEditor, vscode.TextEditorDecorationType][] = [];
	return rxInputBox('Enter a label to jump to', labelInputAbortController.signal)
		.pipe(
			// The pipeline adds the jump label decorations in a later step and that code isn't run unless there's some value in the RxJS pipeline.
			rxops.startWith(''),
			// Clears the decorations from the previous input. Not needed for the first time.
			rxops.tap(() => clearDecorations(matchDecorations)),
			// Filters the labels that start with the input and trims them to size.
			rxops.map(input =>
				withLabels
					.filter(([label]) => label.startsWith(input))
					.map(([label, editor, range]) => [label.slice(input.length), editor, range] as [string, vscode.TextEditor, vscode.Range])
			),
			// Adds the decorations and records them in `matchDecorations` for later removal.
			rxops.tap(candidates => matchDecorations = addDecorations(candidates, matchDecorations)),
			// If there is only one candidate then we can end this and jump to it.
			rxops.filter((candidates) => candidates.length === 1),
			// Ends the observable.
			rxops.first(),
			// Clears the decorations and jumps to the position.
			rxops.tap((candidates) => {
				clearDecorations(matchDecorations);
				const match = candidates[0];
				if (match) {
					const [, editor, range] = match;
					jumpToPosition(editor, range.start);
					// This kills the input box and completes the observable.
					labelInputAbortController.abort();
				}
			}),
		);
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
	const visibleRanges = textEditorVisibleRanges();
	const config = vscode.workspace.getConfiguration('gotoCharTimer');
	const timeout = config.get<number>('timeout', 800); // Read timeout from configuration
	const incrementalSearchTimeoutController = createTimeoutController(timeout);
	rxInputBox('Enter a string to search for', incrementalSearchTimeoutController.signal)
		.pipe(
			// The timeout should start when there are matches and should not count the time search for matches or adding decorations
			rxops.tap(() => incrementalSearchTimeoutController.stopTimeout()),
			// Find all ranges in all visible text editors that match the input.
			rxops.switchMap(input => rxjs.from(findCandidatesForAllEditors(input, Array.from(visibleRanges.keys())))),
			// If there are matches then decorate them in the editor and start the timeout.
			rxops.tap(matchesMap => {
				const hasAnyMatches = Array.from(matchesMap).reduce((hasAnyMatches, [editor, ranges]) => {
					editor.setDecorations(incrementalMatchDecoration, ranges);
					return hasAnyMatches || ranges.length > 0;
				}, false);
				if (hasAnyMatches) {
					incrementalSearchTimeoutController.startTimeout();
				}
			}),
			// The timeout will close the input box and complete the observable with the matches.
			rxops.last(),
			// Clear the incremental search decorations.
			rxops.tap(matchesMap => {
				matchesMap.forEach((_, editor) => {
					editor.setDecorations(incrementalMatchDecoration, []);
				});
			}),
			rxops.switchMap(matchesMap => {
				const numMatches = countMatches(matchesMap);
				if (numMatches === 1) {
					const [editor, [range]] = matchesMap.entries().next().value!;
					jumpToPosition(editor, range!.start);
					return rxjs.EMPTY;
				}
				return handleLabelInput(matchesMap);
			}),
			rxops.catchError((error) => {
				console.error('Error in gotoCharTimer:', error);
				return rxjs.EMPTY;
			}),
			rxops.tap({
				complete: () => console.log('gotoCharTimer observable completed'),
				error: (error) => console.error('gotoCharTimer observable error:', error)
			}),
			rxops.finalize(() => console.log('gotoCharTimer observable finalized'))
		).subscribe();
}

/**
 * Generates unique letter combinations of a given length.
 * 
 * @param length - The length of each combination.
 * @param letters - The set of letters to use for generating combinations.
 * @returns A generator that yields letter combinations.
 */
export function* uniqueLetterCombinations(length: number, letters: string = getLetters()): Generator<string> {
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
	vscode.window.showInformationMessage('GotoCharTimer extension activated');
	subscriptions.push(vscode.commands.registerCommand(commandId, () => gotoCharTimer()));
}

// This method is called when your extension is deactivated
export function deactivate() { 
	console.log('GotoCharTimer extension deactivated');
}

interface TimeoutController {
	startTimeout: () => void;
	stopTimeout: () => void;
}

interface OnTimeout {
	onTimeout: (callback: () => void) => void;
}

class TimeoutControllerImpl implements TimeoutController, OnTimeout {
	private timeoutHandle: NodeJS.Timeout | null = null;
	private abortController = new AbortController();

	constructor(private timeout: number) { }

	startTimeout() {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
		}
		this.timeoutHandle = setTimeout(() => {
			this.abortController.abort();
		}, this.timeout);
	}

	stopTimeout() {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
			this.timeoutHandle = null;
		}
	}

	onTimeout(callback: () => void) {
		this.abortController.signal.onabort = callback;
	}

	get signal(): AbortSignal {
		return this.abortController.signal;
	}
}

function createTimeoutController(timeout: number): TimeoutControllerImpl {
	return new TimeoutControllerImpl(timeout);
}

function countMatches(matchesMap: Map<vscode.TextEditor, vscode.Range[]>): number {
	return Array.from(matchesMap.values()).reduce((acc, ranges) => acc + ranges.length, 0);
}

