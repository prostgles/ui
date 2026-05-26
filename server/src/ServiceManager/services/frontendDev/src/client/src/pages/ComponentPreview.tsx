import { getSerialisableError } from "prostgles-types";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";

export const ComponentPreview = () => {
  const { component } = useParams<{ component: string }>();
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    import(`../components/${component}/${component}.tsx`)
      .then((mod) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const LoadedComponent = (mod[`${component}`] ||
          mod.default) as React.ComponentType;
        setComponent(() => LoadedComponent);
      })
      .catch((err) => {
        setError(err);
      });
  }, [component]);

  if (error)
    return (
      <div>
        Error loading component: {JSON.stringify(getSerialisableError(error))}
      </div>
    );
  if (!Component) return <div>Loading...</div>;
  return <Component />;
};
