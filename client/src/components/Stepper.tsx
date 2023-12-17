
import React from 'react';

type MyProps = {
  steps: { 
    completed?: boolean;
    current?: boolean;
    onClick?: () => any;
  }[]
}

export default class Stepper extends React.Component<MyProps, any> {
  render(){
    const { steps = [] } = this.props;
    const style = { width: ".625em", height: ".625em"},
      currentStep = steps.findIndex(s => s.current);

    const getDividerLine = (i: number) => (
      <div className="absolute inset-0 flex ai-center">
        <div className={"h-p125 w-full " + ((i < currentStep)? "bg-indigo-600" : "bg-gray-200")}></div>
      </div>
    );

    return (
      <nav>
        <ul className="flex ai-center" style={{  listStyle: "none", padding: 0 }}>
          {steps.map((s, i)=> (
            <li key={i} className={"relative " + (i < steps.length - 1? " pr-2 f-1 " : "")} >
              {(s.completed && !s.current) ? (
                <>
                  {getDividerLine(i)}
                  <div onClick={s.onClick} className="pointer relative w-2 h-2 flex ai-center jc-center bg-indigo-600 rounded-full transition-150 bg-indigo-900-hover">
                    <svg className="w-1p25 h-1p25 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </>

              ) : s.current? (
                <>
                  {getDividerLine(i)}
                  <span onClick={s.onClick} className="relative w-2 h-2 flex ai-center jc-center bg-0 border-2 border-indigo-600 rounded-full ">
                    <span style={style} className="h-2.5 w-2.5 bg-indigo-600 rounded-full"></span>
                  </span>
                </>
              ) : (
                <>
                  {getDividerLine(i)}
                  <div onClick={s.onClick} className="pointer relative w-2 h-2 flex ai-center jc-center bg-0 border-2 border-gray-300 rounded-full border-gray-400-hover bg-gray-300-c-hover transition-150">
                    <span style={style} className="h-2.5 w-2.5 bg-transparent rounded-full bg-gray-300-hover transition-150"></span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>
    )
  }
}