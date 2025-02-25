import { Editor } from '../editor';
describe('Editor', () => {
    let container;
    let editor;
    beforeEach(() => {
        container = document.createElement('div');
        editor = new Editor({
            container,
            initialValue: '# Test'
        });
    });
    afterEach(() => {
        editor.destroy();
    });
    test('should initialize with the given value', () => {
        expect(editor.getValue()).toBe('# Test');
    });
    test('should update value when setValue is called', () => {
        editor.setValue('## New Test');
        expect(editor.getValue()).toBe('## New Test');
    });
    test('should emit change event when content changes', () => {
        const mockCallback = jest.fn();
        editor.on('change', mockCallback);
        editor.setValue('New content');
        expect(mockCallback).toHaveBeenCalledWith('New content');
    });
});
