import { FunctionDeclaration, ClassDeclaration, ArrowFunction, VariableDeclaration, CallExpression, Node, Symbol } from "ts-morph";
import { ComponentInfo, HooksInfo, PropInfo } from "./utils/tokens";

export default function extractComponentInfo(
    node: FunctionDeclaration | ClassDeclaration | ArrowFunction | VariableDeclaration,
    type: "function" | "class" | "arrow"
): ComponentInfo {
    const hooks: HooksInfo = {
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

    const getName = (): string => {
        if (Node.isFunctionDeclaration(node)) {
          return node.getName() || "AnonymousFunction";
        } else if (Node.isVariableDeclaration(node)) {
          return node.getName();
        } else if (Node.isClassDeclaration(node)) {
          return node.getName() || "AnonymousClass";
        } else if (Node.isArrowFunction(node)) {
          const parent = node.getParent();
          if (parent && Node.isVariableDeclaration(parent)) {
            return parent.getName();
          }
          return "AnonymousArrowFunction";
        }
        return "AnonymousComponent";
    };

    const isExported = (): boolean => {
        if (Node.isFunctionDeclaration(node) || Node.isClassDeclaration(node)) {
          return node.isExported() || node.isDefaultExport();
        } else if (Node.isVariableDeclaration(node)) {
          const statement = node.getParent()?.getParent();
          if (statement && Node.isVariableStatement(statement)) {
            return statement.isExported() || statement.isDefaultExport();
          }
        } else if (Node.isArrowFunction(node)) {
          const parent = node.getParent();
          if (parent && Node.isVariableDeclaration(parent)) {
            const statement = parent.getParent()?.getParent();
            if (statement && Node.isVariableStatement(statement)) {
              return statement.isExported() || statement.isDefaultExport();
            }
          }
        }
        return false;
    };

    const forEachDescendant = (node: Node): void => {
        node.forEachChild(child => {
          if (Node.isCallExpression(child)) {
            processCallExpression(child);
          }
          forEachDescendant(child);
        });
    };

    const processCallExpression = (callExpr: CallExpression): void => {
        const expression = callExpr.getExpression();
        if (Node.isIdentifier(expression)) {
          const name = expression.getText();
    
          if (name === "useState") {
            const args = callExpr.getArguments();
            const initialValue = args.length > 0 ? args[0].getText() : "unknown";
            hooks.stateHooks.useState.push({ 
              name: "state", 
              type: "unknown", 
              initialValue: initialValue 
            });
          } else if (name === "useReducer") hooks.stateHooks.useReducer = true;
          else if (name === "useContext") hooks.stateHooks.useContext = true;
          else if (name === "useSyncExternalStore") hooks.stateHooks.useSyncExternalStore = true;
          else if (name === "useDeferredValue") hooks.stateHooks.useDeferredValue = true;
          else if (name === "useEffect") hooks.valueHooks.useEffect = true;
          else if (name === "useRef") hooks.valueHooks.useRef = true;
          else if (name === "useMemo") hooks.valueHooks.useMemo = true;
          else if (name === "useCallback") hooks.valueHooks.useCallback = true;
          else if (name === "useLayoutEffect") hooks.valueHooks.useLayoutEffect = true;
          else if (name === "useImperativeHandle") hooks.valueHooks.useImperativeHandle = true;
          else if (name === "useTransition") hooks.valueHooks.useTransition = true;
          else if (name === "useId") hooks.valueHooks.useId = true;
          else if (name.startsWith("use") && name !== "use") {
            hooks.customHooks.push(name);
          }
        }
    };
    
    forEachDescendant(node);

    const props: PropInfo[] = [];
    if (Node.isFunctionDeclaration(node)) {
        const parameters = node.getParameters();
        extractPropsFromParameters(parameters, props);
    } else if (Node.isVariableDeclaration(node)) {
        const initializer = node.getInitializer();
        if (initializer && Node.isArrowFunction(initializer)) {
          const parameters = initializer.getParameters();
          extractPropsFromParameters(parameters, props);
        }
    } else if (Node.isArrowFunction(node)) {
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


function detectClientComponent(node: Node): boolean {
    const sourceFile = node.getSourceFile();
    const fileText = sourceFile.getFullText();
    return fileText.trim().startsWith('"use client"') || 
           fileText.trim().startsWith("'use client'") ||
           fileText.includes("\n'use client'") ||
           fileText.includes('\n"use client"');
}


function detectServerComponent(node: Node): boolean {
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

function extractPropsFromParameters(parameters: any[], props: PropInfo[]): void {
    if (parameters.length > 0) {
        const propsParam = parameters[0];
        const paramType = propsParam.getType();
        
        if (paramType && !paramType.isAny()) {
          const properties = paramType.getProperties();
          properties.forEach((property: Symbol) => {
            const declaration = property.getValueDeclaration();
            const propType = declaration?.getType();
            let isRequired = true;
            if (declaration && Node.isPropertySignature(declaration)) {
              isRequired = !declaration.hasQuestionToken();
            }
            if (declaration && Node.isPropertyDeclaration(declaration)) {
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