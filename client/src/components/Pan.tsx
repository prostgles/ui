import React from "react";
import type { TestSelectors } from "../Testing";
import { setPan, type PanListeners } from "../dashboard/setPan";

type PanProps = TestSelectors &
  PanListeners & {
    style?: React.CSSProperties;
    className?: string;
    threshold?: number;
    children?: React.ReactNode;
  };

// export class Pan extends React.Component<PanProps> {
//   componentDidMount() {
//     this.setListeners();
//   }

//   setListeners = () => {
//     if (this.ref) {
//       setPan(this.ref, {
//         onPanStart: this.props.onPanStart,
//         onPan: this.props.onPan,
//         onPanEnd: this.props.onPanEnd,
//         onRelease: this.props.onRelease,
//         onPress: this.props.onPress,
//         threshold: this.props.threshold,
//         onDoubleTap: this.props.onDoubleTap,
//       });
//     }
//   };

//   ref?: HTMLDivElement;
//   render() {
//     const { style = {}, className = "", children } = this.props;

//     return (
//       <div
//         ref={(e) => {
//           if (e) {
//             this.ref = e;
//           }
//         }}
//         id={this.props.id}
//         data-command={this.props["data-command"]}
//         data-key={this.props["data-key"]}
//         style={style}
//         className={className}
//       >
//         {children}
//       </div>
//     );
//   }
// }

export const Pan = (props: PanProps) => {
  // componentDidMount() {
  //   this.setListeners();
  // }

  // setListeners = () => {
  //   if (this.ref) {
  //     setPan(this.ref, {
  //       onPanStart: this.props.onPanStart,
  //       onPan: this.props.onPan,
  //       onPanEnd: this.props.onPanEnd,
  //       onRelease: this.props.onRelease,
  //       onPress: this.props.onPress,
  //       threshold: this.props.threshold,
  //       onDoubleTap: this.props.onDoubleTap,
  //     });
  //   }
  // };

  // ref?: HTMLDivElement;
  // render() {
  const { style = {}, className = "", children, id } = props;
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current) {
      return;
    }
    return setPan(ref.current, {
      onPanStart: props.onPanStart,
      onPan: props.onPan,
      onPanEnd: props.onPanEnd,
      onRelease: props.onRelease,
      onPress: props.onPress,
      threshold: props.threshold,
      onDoubleTap: props.onDoubleTap,
    });
  }, [props]);

  return (
    <div
      ref={ref}
      id={id}
      data-command={props["data-command"]}
      data-key={props["data-key"]}
      style={style}
      className={className}
    >
      {children}
    </div>
  );
  // }
};
