import * as assert from 'assert';
import * as vscode from 'vscode';
import { uniqueLetterCombinations, calculateLabelLength } from '../main/extension';
import * as sinon from 'sinon';

test('sinon stub basics', () => {
    const stub = sinon.stub();
    stub.returns(42);
    assert.strictEqual(stub(), 42);
    
    stub.onCall(0).returns('first');
    stub.onCall(1).returns('second');
    assert.strictEqual(stub(), 'first');
    assert.strictEqual(stub(), 'second');
    assert.strictEqual(stub(), 42); // falls back to last returns
});

test('sinon stub with conditional returns', () => {
    const stub = sinon.stub();
    stub.withArgs('hello').returns('world');
    stub.withArgs('ping').returns('pong');
    
    assert.strictEqual(stub('hello'), 'world');
    assert.strictEqual(stub('ping'), 'pong');
    assert.strictEqual(stub('other'), undefined);
});

test('sinon spy tracking', () => {
    const obj = {
        method: (x: number) => x * 2
    };
    const spy = sinon.spy(obj, 'method');
    
    obj.method(5);
    obj.method(10);
    
    assert.strictEqual(spy.callCount, 2);
    assert.strictEqual(spy.firstCall.args[0], 5);
    assert.strictEqual(spy.secondCall.args[0], 10);
    assert.deepStrictEqual(spy.args, [[5], [10]]);
});

test('sinon callsFake for complex behavior', () => {
    const stub = sinon.stub();
    let counter = 0;
    
    stub.callsFake(() => {
        counter++;
        return `call ${counter}`;
    });
    
    assert.strictEqual(stub(), 'call 1');
    assert.strictEqual(stub(), 'call 2');
    assert.strictEqual(counter, 2);
});

test('my sample test', () => {
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

test('gotoCharTimer should jump to single match immediately', async () => {
    const editor = createMockEditor();
    var inputBox = createMockInputBox();

    sinon.stub(vscode.window, 'createInputBox').returns(inputBox);
    sinon.stub(vscode.window, 'visibleTextEditors').value([editor]);
    sinon.stub(vscode.window, 'showTextDocument').resolves();

    var gotoCharTimerCommand = vscode.commands.executeCommand('GotoCharTimer.gotoCharTimer');
    await new Promise(resolve => setTimeout(resolve, 100));
    simulateUserTyping(inputBox);

    await gotoCharTimerCommand;

    // Verify the cursor jumped to the correct position
    assert.ok(editor.selection instanceof vscode.Selection, 'Selection should be set');
    assert.strictEqual(editor.selection.start.line, 0);
    assert.strictEqual(editor.selection.start.character, 14); // Position of 'target' in the text
    assert.ok(editor.revealRange.calledOnce, 'revealRange should be called once');
});

test('calculateOffsetFromPosition should calculate correct offset for single line', () => {
    const text = 'hello world';
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(0, 0)), 0);
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(0, 5)), 5);
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(0, text.length)), text.length);
});

test('calculateOffsetFromPosition should calculate correct offset for multiple lines', () => {
    const text = 'first line\nsecond line\nthird line';
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(0, 0)), 0);
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(1, 0)), 11);
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(2, 0)), 23);
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(1, 6)), 17);
});

test('calculateOffsetFromPosition should handle empty lines', () => {
    const text = 'first\n\nlast';
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(0, 0)), 0);
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(1, 0)), 6);
    assert.strictEqual(calculateOffsetFromPosition(text, new vscode.Position(2, 0)), 7);
});

function calculateOffsetFromPosition(documentText: string, position: vscode.Position): number {
    return documentText
        .split('\n', position.line)
        .reduce((acc, line) => acc + line.length, 0)
        + position.line
        + position.character;
}

function calculatePositionFromOffset(documentText: string, offset: number): vscode.Position {
    const text = documentText.substring(0, offset);
    const lineNum = (text.match(/\n/g) || []).length;
    const lastNewlineIndex = text.lastIndexOf('\n');
    const charNum = lastNewlineIndex === -1 ? text.length : text.length - lastNewlineIndex - 1;
    return new vscode.Position(lineNum, charNum);
}

test('calculatePositionFromOffset should handle multi-line text', () => {
    const text = 'first line\nsecond line\nthird line';
    assert.deepStrictEqual(calculatePositionFromOffset(text, 0), new vscode.Position(0, 0));
    assert.deepStrictEqual(calculatePositionFromOffset(text, 5), new vscode.Position(0, 5));
    assert.deepStrictEqual(calculatePositionFromOffset(text, 11), new vscode.Position(1, 0));
    assert.deepStrictEqual(calculatePositionFromOffset(text, 17), new vscode.Position(1, 6));
    assert.deepStrictEqual(calculatePositionFromOffset(text, 23), new vscode.Position(2, 0));
});

function createMockEditor() {
    const documentText = 'some text with target here';
    let currentSelection = new vscode.Selection(0, 0, 0, 0);

    return {
        document: {
            getText: sinon.stub().returns(documentText),
            offsetAt: sinon.stub().callsFake((position: vscode.Position) => {
                return calculateOffsetFromPosition(documentText, position);
            }),
            positionAt: sinon.stub().callsFake((offset: number) => {
                return calculatePositionFromOffset(documentText, offset);
            }),
            uri: vscode.Uri.file('/test/document.ts'),
        },
        setDecorations: sinon.stub(),
        get selection() { return currentSelection; },
        set selection(sel: vscode.Selection) { currentSelection = sel; },
        revealRange: sinon.stub(),
        visibleRanges: [new vscode.Range(0, 0, 0, documentText.length)]

    };
}

function createMockInputBox() {
    return {
        value: '',
        valueSelection: [0, 0] as [number, number],
        placeholder: '',
        password: false,
        buttons: [],
        show: sinon.stub(),
        hide: sinon.stub(),
        dispose: sinon.stub(),
        onDidChangeValue: sinon.stub(),
        onDidAccept: sinon.stub(),
        onDidHide: sinon.stub(),
        onDidTriggerButton: sinon.stub(),
        prompt: '',
        validationMessage: '',
        title: '',
        step: 1,
        totalSteps: 1,
        enabled: true,
        busy: false,
        ignoreFocusOut: false
    };
}

// interface MockEditor {
//     document: {
//         getText: sinon.SinonStub;
//         offsetAt: sinon.SinonStub;
//         positionAt: sinon.SinonStub;
//     };
//     setDecorations: sinon.SinonStub;
//     selection: vscode.Selection;  // Changed from Selection | null
//     revealRange: sinon.SinonStub;
//     visibleRanges: vscode.Range[];
// }

interface MockInputBox extends vscode.InputBox {
    value: string;
    valueSelection: [number, number];
    placeholder: string;
    password: boolean;
    buttons: vscode.QuickInputButton[];
    show: sinon.SinonStub;
    hide: sinon.SinonStub;
    dispose: sinon.SinonStub;
    onDidChangeValue: sinon.SinonStub;
    onDidAccept: sinon.SinonStub;
    onDidHide: sinon.SinonStub;
    onDidTriggerButton: sinon.SinonStub;
    prompt: string;
    validationMessage: string;
    title: string;
    step: number;
    totalSteps: number;
    enabled: boolean;
    busy: boolean;
    ignoreFocusOut: boolean;
}

function simulateUserTyping(inputBox: MockInputBox) {
    inputBox.value = 'target';
    inputBox.onDidAccept.callsFake(() => {
        console.log('onDidAccept called');
    });
}

test('gotoCharTimer should show labels for multiple matches', async () => {
    // Similar setup but test the label generation and selection
    // ...
});
