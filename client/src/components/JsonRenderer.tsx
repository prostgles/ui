import React from "react";

type P = {
  value: any;
};

export const JsonRenderer: React.FC<P> = ({ value }) => {
  const renderObject = (obj: any, idx = 1) => {
    if (Array.isArray(obj)) {
      return obj.map(renderObject);
    }

    if (Object(obj) !== obj) {
      return <span>{obj}</span>;
    }

    return (
      <div key={idx} className="json-object flex-col gap-p25">
        {Object.entries(obj).map(([key, value]) => (
          <div key={key} className="flex-row-wrap">
            <div className="bold">{key}:</div>
            <div>{renderObject(value)}</div>
          </div>
        ))}
      </div>
    );
  };

  return <div className="flex-col">{renderObject(value)}</div>;
};
