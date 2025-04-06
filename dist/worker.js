"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts = __importStar(require("typescript"));
const worker_threads_1 = require("worker_threads");
const parseFiles_1 = __importDefault(require("./parseFiles"));
function simplifyNode(node) {
    const result = {
        kind: node.kind,
        pos: node.pos,
        end: node.end,
        flags: node.flags
    };
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        result.text = node.text;
    }
    if (node.name && ts.isIdentifier(node.name)) {
        result.name = node.name.text;
    }
    const children = [];
    node.forEachChild(child => {
        children.push(simplifyNode(child));
    });
    if (children.length > 0) {
        result.children = children;
    }
    return result;
}
const { files, workerIndex } = worker_threads_1.workerData;
try {
    const results = (0, parseFiles_1.default)(files);
    if (worker_threads_1.parentPort) {
        worker_threads_1.parentPort.postMessage(results);
    }
    else {
        process.exit(1);
    }
}
catch (err) {
    process.exit(1);
}
