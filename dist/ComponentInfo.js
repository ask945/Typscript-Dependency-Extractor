"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = extractComponentInfo;
const ts_morph_1 = require("ts-morph");
function extractComponentInfo(node, type) {
    const hooks = {
        stateHooks: {
            useState: [],
            useReducer: false,
            useContext: false,
            useSyncExternalStore: false,
            useDeferredValue: false,
        },
        valueHooks: {
            useEffect: false,
            useRef: false,
            useMemo: false,
            useCallback: false,
            useLayoutEffect: false,
            useImperativeHandle: false,
            useTransition: false,
            useId: false,
        },
        customHooks: [],
    };
    const getName = () => {
        if (ts_morph_1.Node.isFunctionDeclaration(node)) {
            return node.getName() || "AnonymousFunction";
        }
        else if (ts_morph_1.Node.isVariableDeclaration(node)) {
            return node.getName();
        }
        else if (ts_morph_1.Node.isClassDeclaration(node)) {
            return node.getName() || "AnonymousClass";
        }
        else if (ts_morph_1.Node.isArrowFunction(node)) {
            const parent = node.getParent();
            if (parent && ts_morph_1.Node.isVariableDeclaration(parent)) {
                return parent.getName();
            }
            return "AnonymousArrowFunction";
        }
        return "AnonymousComponent";
    };
    const isExported = () => {
        var _a, _b;
        if (ts_morph_1.Node.isFunctionDeclaration(node) || ts_morph_1.Node.isClassDeclaration(node)) {
            return node.isExported() || node.isDefaultExport();
        }
        else if (ts_morph_1.Node.isVariableDeclaration(node)) {
            const statement = (_a = node.getParent()) === null || _a === void 0 ? void 0 : _a.getParent();
            if (statement && ts_morph_1.Node.isVariableStatement(statement)) {
                return statement.isExported() || statement.isDefaultExport();
            }
        }
        else if (ts_morph_1.Node.isArrowFunction(node)) {
            const parent = node.getParent();
            if (parent && ts_morph_1.Node.isVariableDeclaration(parent)) {
                const statement = (_b = parent.getParent()) === null || _b === void 0 ? void 0 : _b.getParent();
                if (statement && ts_morph_1.Node.isVariableStatement(statement)) {
                    return statement.isExported() || statement.isDefaultExport();
                }
            }
        }
        return false;
    };
    const forEachDescendant = (node) => {
        node.forEachChild(child => {
            if (ts_morph_1.Node.isCallExpression(child)) {
                processCallExpression(child);
            }
            forEachDescendant(child);
        });
    };
    const processCallExpression = (callExpr) => {
        const expression = callExpr.getExpression();
        if (ts_morph_1.Node.isIdentifier(expression)) {
            const name = expression.getText();
            if (name === "useState") {
                const args = callExpr.getArguments();
                const initialValue = args.length > 0 ? args[0].getText() : "unknown";
                hooks.stateHooks.useState.push({
                    name: "state",
                    type: "unknown",
                    initialValue: initialValue
                });
            }
            else if (name === "useReducer")
                hooks.stateHooks.useReducer = true;
            else if (name === "useContext")
                hooks.stateHooks.useContext = true;
            else if (name === "useSyncExternalStore")
                hooks.stateHooks.useSyncExternalStore = true;
            else if (name === "useDeferredValue")
                hooks.stateHooks.useDeferredValue = true;
            else if (name === "useEffect")
                hooks.valueHooks.useEffect = true;
            else if (name === "useRef")
                hooks.valueHooks.useRef = true;
            else if (name === "useMemo")
                hooks.valueHooks.useMemo = true;
            else if (name === "useCallback")
                hooks.valueHooks.useCallback = true;
            else if (name === "useLayoutEffect")
                hooks.valueHooks.useLayoutEffect = true;
            else if (name === "useImperativeHandle")
                hooks.valueHooks.useImperativeHandle = true;
            else if (name === "useTransition")
                hooks.valueHooks.useTransition = true;
            else if (name === "useId")
                hooks.valueHooks.useId = true;
            else if (name.startsWith("use") && name !== "use") {
                hooks.customHooks.push(name);
            }
        }
    };
    forEachDescendant(node);
    const props = [];
    if (ts_morph_1.Node.isFunctionDeclaration(node)) {
        const parameters = node.getParameters();
        extractPropsFromParameters(parameters, props);
    }
    else if (ts_morph_1.Node.isVariableDeclaration(node)) {
        const initializer = node.getInitializer();
        if (initializer && ts_morph_1.Node.isArrowFunction(initializer)) {
            const parameters = initializer.getParameters();
            extractPropsFromParameters(parameters, props);
        }
    }
    else if (ts_morph_1.Node.isArrowFunction(node)) {
        const parameters = node.getParameters();
        extractPropsFromParameters(parameters, props);
    }
    const isClientComponent = detectClientComponent(node);
    const isServerComponent = detectServerComponent(node);
    return {
        name: getName(),
        type,
        isExported: isExported(),
        isClientComponent,
        isServerComponent,
        props,
        hooks,
        usedComponents: [],
        usedInFiles: [],
    };
}
function detectClientComponent(node) {
    const sourceFile = node.getSourceFile();
    const fileText = sourceFile.getFullText();
    return fileText.trim().startsWith('"use client"') ||
        fileText.trim().startsWith("'use client'") ||
        fileText.includes("\n'use client'") ||
        fileText.includes('\n"use client"');
}
function detectServerComponent(node) {
    const sourceFile = node.getSourceFile();
    const fileText = sourceFile.getFullText();
    const isExplicitServer = fileText.trim().startsWith('"use server"') ||
        fileText.trim().startsWith("'use server'") ||
        fileText.includes("\n'use server'") ||
        fileText.includes('\n"use server"');
    const filePath = sourceFile.getFilePath();
    const isInAppDir = filePath.includes('/app/') || filePath.includes('\\app\\');
    return isExplicitServer || (isInAppDir && !detectClientComponent(node));
}
function extractPropsFromParameters(parameters, props) {
    if (parameters.length > 0) {
        const propsParam = parameters[0];
        const paramType = propsParam.getType();
        if (paramType && !paramType.isAny()) {
            const properties = paramType.getProperties();
            properties.forEach((property) => {
                const declaration = property.getValueDeclaration();
                const propType = declaration === null || declaration === void 0 ? void 0 : declaration.getType();
                let isRequired = true;
                if (declaration && ts_morph_1.Node.isPropertySignature(declaration)) {
                    isRequired = !declaration.hasQuestionToken();
                }
                if (declaration && ts_morph_1.Node.isPropertyDeclaration(declaration)) {
                    isRequired = !declaration.hasQuestionToken();
                }
                props.push({
                    name: property.getName(),
                    type: propType ? propType.getText() : "unknown",
                    isRequired: isRequired
                });
            });
        }
    }
}
