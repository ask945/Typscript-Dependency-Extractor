import * as ts from 'typescript';
import * as fs from 'fs';
import { workerData, parentPort } from 'worker_threads';
import parseFiles from './parseFiles';
function simplifyNode(node: ts.Node): any {
    const result: any = {
        kind: node.kind,
        pos: node.pos,
        end: node.end,
        flags: node.flags
    };
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        result.text = node.text;
    }
    if ((node as any).name && ts.isIdentifier((node as any).name)) {
        result.name = (node as any).name.text;
    }
    const children: any[] = [];
    node.forEachChild(child => {
        children.push(simplifyNode(child));
    });
    
    if (children.length > 0) {
        result.children = children;
    }

    return result;
}


const { files, workerIndex } = workerData;

try {
    const results = parseFiles(files);
    if (parentPort) {
        parentPort.postMessage(results);
    } else {
        process.exit(1);
    }
} catch (err) {
    process.exit(1);
}