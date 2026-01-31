import React, { useEffect, useState } from "react";

export type DynamicComponentRegistry = typeof DYNAMIC_COMPONENT_REGISTRY;
type LoadedComponent<N extends keyof DynamicComponentRegistry> = Awaited<
  ReturnType<DynamicComponentRegistry[N]>
>["default"];

export type DynamicComponentProps<N extends keyof DynamicComponentRegistry> = {
  component: N;
  props: React.ComponentProps<LoadedComponent<N>>;
};

const DYNAMIC_COMPONENT_REGISTRY = {
  AuthProviderSetup: () =>
    import("@pages/ServerSettings/AuthProvidersSetup/AuthProvidersSetup").then(
      (mod) => ({ default: mod.AuthProviderSetup }),
    ),
  WebAppConfig: () =>
    import("src/dashboard/ConnectionConfig/WebApp/WebAppConfig").then(
      (mod) => ({ default: mod.WebAppConfig }),
    ),
  Account: () =>
    import("src/pages/Account/Account").then((mod) => ({
      default: mod.Account,
    })),
} as const satisfies Record<
  string,
  () => Promise<{ default: React.ComponentType<any> }>
>;

export const DynamicComponent = <
  C extends keyof typeof DYNAMIC_COMPONENT_REGISTRY,
>({
  component,
  props,
}: DynamicComponentProps<C>) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const loadComponent = async () => {
      const importFunc = DYNAMIC_COMPONENT_REGISTRY[component];
      const { default: LoadedComponent } = await importFunc();
      setComponent(() => LoadedComponent as React.ComponentType<any>);
    };

    void loadComponent();
  }, [component]);

  if (!Component) return <div>Loading...</div>;
  return <Component {...props} />;
};
