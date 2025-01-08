import * as assert from 'assert';
import * as vscode from 'vscode';
import { uniqueLetterCombinations, calculateLabelLength } from '../main/extension';
import * as sinon from 'sinon';

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

test('gotoCharTimer should jump to single match immediately', () => {
    const editor = createMockEditor();
    const inputBox = createMockInputBox();

    sinon.stub(vscode.window, 'createInputBox').returns(inputBox);
    sinon.stub(vscode.window, 'visibleTextEditors').value([editor]);

    // Simulate user typing 'target'
    simulateUserTyping(inputBox, editor);

    // Trigger gotoCharTimer
    vscode.commands.executeCommand('GotoCharTimer.gotoCharTimer');
});

function createMockEditor() {
    return {
        document: {
            getText: sinon.stub().returns('some text with target here'),
            offsetAt: sinon.stub().returns(0),
            positionAt: sinon.stub().returns(new vscode.Position(0, 0))
        },
        setDecorations: sinon.stub(),
        selection: null,
        revealRange: sinon.stub(),
        visibleRanges: [new vscode.Range(0, 0, 10, 0)]
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

interface MockEditor {
    document: {
        getText: sinon.SinonStub;
        offsetAt: sinon.SinonStub;
        positionAt: sinon.SinonStub;
    };
    setDecorations: sinon.SinonStub;
    selection: vscode.Selection | null;
    revealRange: sinon.SinonStub;
    visibleRanges: vscode.Range[];
}

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

function simulateUserTyping(inputBox: MockInputBox, editor: MockEditor) {
    inputBox.value = 'target';
    inputBox.onDidAccept.callsFake(() => {
        assert.strictEqual(editor.setDecorations.called, true);
        // Add more assertions here to verify the jump behavior
    });
}

test('gotoCharTimer should show labels for multiple matches', async () => {
    // Similar setup but test the label generation and selection
    // ...
});
