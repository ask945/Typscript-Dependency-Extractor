import { FunctionDeclaration, ArrowFunction, VariableDeclaration, Node, Symbol, Type } from "ts-morph";
import { FunctionInfo, ParameterInfo } from "./utils/tokens";

export default function extractFunctionInfo(
  node: FunctionDeclaration | ArrowFunction | VariableDeclaration,
  type: "function" | "arrow"
): FunctionInfo {
  const getName = (): string => {
    if (Node.isFunctionDeclaration(node)) {
      return node.getName() || "AnonymousFunction";
    } else if (Node.isVariableDeclaration(node)) {
      return node.getName();
    } else if (Node.isArrowFunction(node)) {
      const parent = node.getParent();
      if (parent && Node.isVariableDeclaration(parent)) {
        return parent.getName();
      }
      return "AnonymousArrowFunction";
    }
    return "AnonymousFunction";
  };

  const isExported = (): boolean => {
    if (Node.isFunctionDeclaration(node)) {
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

  const getReturnType = (): string => {
    if (Node.isFunctionDeclaration(node)) {
      const returnType = node.getReturnType();
      return returnType ? returnType.getText() : "any";
    } else if (Node.isArrowFunction(node)) {
      const returnType = node.getReturnType();
      return returnType ? returnType.getText() : "any";
    } else if (Node.isVariableDeclaration(node)) {
      const initializer = node.getInitializer();
      if (initializer && Node.isArrowFunction(initializer)) {
        const returnType = initializer.getReturnType();
        return returnType ? returnType.getText() : "any";
      }
    }
    return "any";
  };

  const params: ParameterInfo[] = [];
  
  const extractParameters = (parameters: any[]): void => {
    parameters.forEach(param => {
      const paramName = param.getName();
      const paramType = param.getType();
      const isOptional = param.isOptional();
      
      params.push({
        name: paramName,
        type: paramType ? paramType.getText() : "any",
        isRequired: !isOptional
      });
    });
  };

  if (Node.isFunctionDeclaration(node)) {
    extractParameters(node.getParameters());
  } else if (Node.isVariableDeclaration(node)) {
    const initializer = node.getInitializer();
    if (initializer && Node.isArrowFunction(initializer)) {
      extractParameters(initializer.getParameters());
    }
  } else if (Node.isArrowFunction(node)) {
    extractParameters(node.getParameters());
  }

  return {
    name: getName(),
    isExported: isExported(),
    params: params,
    returnType: getReturnType(),
    usedInFiles: []
  };
}