import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

export async function loadModule(path, globals = {}, imports = {}) {
    const source = await readFile(path, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const compiledModule = { exports: {} };
    const context = vm.createContext({ module: compiledModule, exports: compiledModule.exports, require: name => {
        if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
        return imports[name];
    }, console: { log() {}, error() {} }, Promise, AbortSignal, Response, ...globals });
    vm.runInContext(code, context, { filename: path });
    return { api: compiledModule.exports, context };
}

export async function loadHandler(path, name, globals) {
    const source = await readFile(path, 'utf8');
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let initializer;
    const visit = node => {
        if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) initializer = node.initializer;
        ts.forEachChild(node, visit);
    };
    visit(ast);
    if (!initializer) throw new Error(`Missing actual handler ${path}:${name}`);
    const compiledModule = { exports: {} };
    const setters = {};
    const state = {};
    const findSetters = node => {
        if (ts.isIdentifier(node) && /^set[A-Z]/.test(node.text)) setters[node.text] = value => {
            state[node.text] = typeof value === 'function' ? value(state[node.text] || []) : value;
        };
        ts.forEachChild(node, findSetters);
    };
    findSetters(initializer);
    const code = ts.transpileModule(`export const invoke = ${initializer.getText(ast)};`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, console: { error() {} }, ...setters, ...globals }, { filename: `${path}:${name}` });
    return { invoke: compiledModule.exports.invoke, state };
}

export const flush = () => new Promise(resolve => setImmediate(resolve));
