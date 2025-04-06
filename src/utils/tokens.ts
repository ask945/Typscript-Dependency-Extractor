interface StateHookInfo {
    useState: StateInfo[];
    useReducer: boolean;
    useContext: boolean;
    useSyncExternalStore: boolean;
    useDeferredValue: boolean;
  }
  
  interface ValueHookInfo {
    useEffect: boolean;
    useRef: boolean;
    useMemo: boolean;
    useCallback: boolean;
    useLayoutEffect: boolean;
    useImperativeHandle: boolean;
    useTransition: boolean;
    useId: boolean;
  }
  
 export interface HooksInfo {
    stateHooks: StateHookInfo;
    valueHooks: ValueHookInfo;
    customHooks: string[];
  }

  interface StateInfo {
    name: string;
    type: string;
    initialValue: string;
  }
  
  export interface ComponentInfo {
    name: string;
    type: 'function' | 'class' | 'arrow'; 
    isExported: boolean;
    isClientComponent: boolean;
    isServerComponent: boolean;
    props: PropInfo[];
    hooks: HooksInfo;
    usedComponents: string[]; 
    usedInFiles: string[]; 
  }

 export interface PropInfo {
    name: string;
    type: string;
    isRequired: boolean;
  }

  export interface FunctionInfo {
    name: string;
    isExported: boolean;
    params: ParameterInfo[];
    returnType: string;
    usedInFiles: string[]; 
  }
  
  export interface ParameterInfo {
    name: string;
    type: string;
    isRequired: boolean;
  }

 export interface InterfaceInfo {
    name: string;
    isExported: boolean;
    properties: PropertyInfo[];
    usedInFiles: string[]; 
  }
  
 export interface PropertyInfo {
    name: string;
    type: string;
    isRequired: boolean;
  }

 export interface ClassInfo {
    name: string;
    isExported: boolean;
    methods: MethodInfo[];
    properties: PropertyInfo[];
    usedInFiles: string[]; 
  }
export  interface MethodInfo {
    name: string;
    params: ParameterInfo[];
    returnType: string;
  }

 export interface TypeInfo {
    name: string;
    isExported: boolean; 
    type: string;
    usedInFiles: string[]; 
  }

export  interface VariableInfo {
    name: string;              
    isExported: boolean;
    type: string;
    usedInFiles: string[]; 
  }
  
export interface ImportInfo {
  name: string;
  path: string;
  namedImports: string[];
  defaultImport: string;        
  isTypeOnly: boolean;
  resolvedFilePath?: string; 
}

export interface FileAnalysis {
  fileName: string;
  filePath: string;
  exports: {
    components: ComponentInfo[];
    functions: FunctionInfo[];
    interfaces: InterfaceInfo[];
    types: TypeInfo[];
    classes: ClassInfo[];
    variables: VariableInfo[];      
  };
  imports: ImportInfo[];
  incomingDependencies: string[]; 
  outgoingDependencies: string[]; 
}