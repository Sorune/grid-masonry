declare module "react" {
  export type DependencyList = readonly unknown[];

  export interface ReactElement {
    readonly type: unknown;
    readonly props: unknown;
    readonly key: string | null;
  }

  export type ReactNode =
    | ReactElement
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined
    | readonly ReactNode[];

  export interface CSSProperties {
    [property: string]: string | number | undefined;
  }

  export type RefCallback<T> = (instance: T | null) => void;

  export function createElement(
    type: string | ((props: never) => ReactNode),
    props?: Record<string, unknown> | null,
    ...children: ReactNode[]
  ): ReactElement;

  export function useCallback<T extends (...args: never[]) => unknown>(
    callback: T,
    deps: DependencyList,
  ): T;

  export function useEffect(
    effect: () => void | (() => void),
    deps?: DependencyList,
  ): void;

  export function useMemo<T>(factory: () => T, deps: DependencyList): T;

  export function useState<S>(
    initialState: S | (() => S),
  ): [S, (next: S | ((previous: S) => S)) => void];

  export function useRef<T>(initialValue: T): { current: T };
}
