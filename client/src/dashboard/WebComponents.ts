
/* UTILS */
export function loadCSS(document, css_style, STYLE_ID){

  if(!document.head.querySelector(`style#${STYLE_ID}`)){
      const style = document.createElement("style");
      style.innerHTML = css_style;
      style.setAttribute("id", STYLE_ID);
      document.head.append(style);
  }
}

export function addEvent(node, type, func){
  const wrappedEvent = function(ev){
    if(!node.isConnected){
      node.removeEventListener(type, wrappedEvent,  {passive: false});
    } else {
      func(ev)
    }
  }
  node.removeEventListener(type, wrappedEvent,  {passive: false});
  node.addEventListener(type, wrappedEvent,  {passive: false});
}

function getAttrs(node, attrNames = ["title"]){
  const res = {};
  attrNames.map(key => {
    res[key] = node[key];
  })
  return res;
}

export function get(obj, propertyPath){

  let p = propertyPath,
      o = obj;

  if(typeof p === "string") p = p.split(".");
  return p.reduce((xs, x) =>{ 
      if(xs && xs[x]) { 
          return xs[x] 
      } else { 
          return undefined; 
      } 
  }, o);
}

/* 

COMPONENTS 

*/

export default class Component extends HTMLElement {
  // static get observedparams() {
  //   return ['zindex'];
  // }
  // attributeChangedCallback(name, oldValue, newValue){
  //   console.log(name, newValue);
  // }
  refRoot?: ChildNode;
  refs: { [key: string]: Element } = {};
  _events: any[] = [];
  static DEFINE(comp){
    if(!comp || !comp.TAG_NAME) throw "invalid component";
    customElements.define(comp.TAG_NAME, comp);
  }

  constructor(attrs?){
    super(); //super(attrs);
    Object.assign(this, attrs);
    // this.render(attrs);
  }

  // render(p){
  //   Object.assign(this, p);
  //   Object.assign(this.params, p);
  // }

  addScriptIfMissing(src){
    if(!document.head.querySelector(`script[src="${src}"]`)){
      return new Promise((resolve, reject) => {
        const scrpt = document.createElement('script');
        try{
          scrpt.type = 'text/javascript';
          scrpt.setAttribute('src', src);
          scrpt.addEventListener('load', function() {
            resolve(1);
          });
          // document.body.appendChild(scrpt);
          document.body.insertBefore(scrpt, document.body.firstChild);
        } catch(e){
          reject(e);
        }
        
      })
    }
    return Promise.resolve(1);
  }
  addLinkIfMissing(href){
    if(!document.head.querySelector(`link[href="${href}"]`)){
      const lnk = document.createElement('link');
      lnk.setAttribute('href', href);
      document.head.appendChild(lnk);
    }
  }

  removeChildren(parent){
    removeChildren(parent)
  }
  
  setCSS(css){
    loadCSS(this.ownerDocument, css, this.constructor.name.toLowerCase() + "-comp-style");
  }

  setHTML(html){
    this.innerHTML = html;
    this.refRoot = this.firstChild ?? undefined;
    this.refs = {};
    Array.from(this.querySelectorAll("[data-ref]")).map(elem => {
      /* Ignore nested id duplicates */
      if(elem instanceof HTMLElement && !this.refs[toCammelCase(elem.dataset.ref)]){
        this.refs[toCammelCase(elem.dataset.ref)] = elem;
      }
    });

    function toCammelCase(str){
      return str.toLowerCase().replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    }
    function toDashed(strCammel){
      return strCammel.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
    }
  }

  addEvent(type, node, listener){
    node.removeEventListener(type, listener,  { passive: false });
    node.addEventListener(type, listener,  { passive: false });
    this._events.push({ type, node, listener })
  }

  disconnectedCallback(){
    this._events.map(({ type, node, listener }) => {
      node.removeEventListener(type, listener, { passive: false });
    });
  }
}

export function removeChildren(node){
  while (node.lastChild) {
    node.removeChild(node.lastChild);
  }
}

export class Icon extends HTMLElement {
  constructor(){
    super();
    this.render()
  }

  render(){
    const path = this.innerText;
    if(path && !/^[a-zA-Z0-9-]+$/.test(path)) throw "invalid path";
    this.style.height = "24px";
    this.style.width = "24px";
    this.style.alignItems = "center";
    this.innerHTML = `<img  loading="lazy" src="/svg/${path}.svg" alt="${path}" style="width:24px;height:24px; vertical-align: middle;     filter: opacity(0.4); " />`
  }
}
customElements.define("comp-icon", Icon);

export class IconButton extends Component {
  static CSS = `
    .icon-btn {
      border-radius: 20px;
      width: 36px;
      height: 36px;
      display: flex;
    }
    .icon-btn button {
      background: transparent;
      border: unset;
      box-shadow: unset;
      padding: 0;
      width: 36px;
      height: 36px;
      min-width: 0;
      min-height: 0;
      margin-right: 0;
    }
  `;

  constructor(){
    super();
    super.setCSS(IconButton.CSS);
    this.render();
  }

  render(){
    const path = this.innerText;
    this.classList.add("icon-btn")
    this.innerHTML = `
      <button>
        <comp-icon>${path}</comp-icon>
      </button>
    `;
  }
}
customElements.define("icon-btn", IconButton);

// const Input_TAG_NAME = "comp-input";
// export class Input extends Component {
//   static TAG_NAME = Input_TAG_NAME;

//   constructor(p){
//     super(p);
//     this.setCSS(`
//       ${Input_TAG_NAME} {
//         margin-right: 8px;
//       }

//       ${Input_TAG_NAME} > input {
//         -webkit-box-direction: normal;
//         caret-color: #3f51b5;
//         font: inherit;
//         background: transparent;
//         color: currentColor;
//         border: none;
//         outline: none;
//         padding: 0;
//         margin: 0;
//         width: 100%;
//         max-width: 100%;
//         vertical-align: bottom;
//         text-align: inherit;
//         -webkit-appearance: none;
//         margin-top: -.0625em;
//         animation: cdk-text-field-autofill-end 0s 1ms;

//         border: 1px solid currentColor;
//         border-color: rgba(0,0,0,.12);
//         border-radius: 4px;
//         padding: 8px;

//       }

//       ${Input_TAG_NAME} > input.mini {
//         padding: 2px;
//       }
//   `);
//     this.setHTML(`<input data-ref="root" />`)
//     this.render(this);
//   }

//   getValue(){
//     return this.refs.root.value;
//   }

//   render(delta){
//     Object.assign(this, delta);

//     const { type = "text", value = "", onChange, mini = false } = this;
//     if(delta.type){
//       this.refs.root.setAttribute("type", type);
//     }
//     if(delta.value && value !== this.refs.root.value){
//       this.refs.root.value = value;
//     }
//     if(onChange){
//       this.refs.root.oninput = e => {
//         onChange(this.refs.root.value, e);
//       }
//     }
//     if(this.isDefined(delta.mini)){
//       this.refs.root.classList.toggle("mini", mini);
//     }
//   }
// }
// customElements.define(Input.TAG_NAME, Input);

// const DropDown_TAG_NAME = "comp-drop-down";
// export class DropDown extends Component {
// static TAG_NAME = DropDown_TAG_NAME

// constructor(){
//     super();

//     this.setCSS(`
//       ${DropDown_TAG_NAME} {

//       }

//       .popup-drop-down .option {
//         display: inline-block;
//         flex-grow: 1;
//         overflow: hidden;
//         text-overflow: ellipsis;
//         font-size: inherit;
//         line-height: 3em;
//         height: 3em;

//         white-space: nowrap;
//         overflow: hidden;
//         text-overflow: ellipsis;
//         display: block;
//         line-height: 48px;
//         height: 48px;
//         padding: 0 16px;
//         text-align: left;
//         text-decoration: none;
//         max-width: 100%;
//         position: relative;
//         cursor: pointer;
//         outline: none;
//         display: flex;
//         flex-direction: row;
//         max-width: 100%;
//         box-sizing: border-box;
//         align-items: center;
//         -webkit-tap-highlight-color: transparent;
//       }

//       .popup-drop-down .option:hover {
//         background: rgba(0,0,0,.04);
//       }
//       ${DropDown_TAG_NAME} button {
//         background: transparent;
        
//         min-width: unset;
//         font-size: 16px;
//         font-weight: 600; 
//         padding: 0 8px;
//       }
      
//     `);
//     this.setHTML(`
//       <div data-ref="root" class="flex-col">
//         <icon-btn data-ref="btn-icon" class="hidden">menu-down</icon-btn>
//         <button data-ref="btn-text" class="hidden">dropdown</button>
//         <comp-popup data-ref="popup" class="popup-drop-down noselect"></comp-popup>
//       </div>
//     `);
//     this.render(this);
// }

// render(delta){
//   Object.assign(this, delta);
//   const { options, onChange, iconButton, textButton } = this;

//   if(delta.options){
//     this.popupContent = document.createElement("div");
//     this.popupContent.className = "flex-col options";
//     options.map(key => {
//       let div = document.createElement("div");
//       div.className = "option";
//       div.innerText = key;
//       div.onclick = e => {
//         onChange(key);
//         this.refs.popup.remove();
//       }
//       this.popupContent.append(div);
//     });
//   }

//   if(delta.iconButton){
//     this.refs.btnText.classList.toggle("hidden", true);
//     this.refs.btnIcon.classList.toggle("hidden", false);
//     this.refs.btnIcon.innerText = iconButton;
//     this.refs.btnIcon.render();

//     this.refs.btnIcon.onpointerdown = e => {
//       this.setPopup(e, this.refs.btnIcon);
//     }
//   }

//   if(delta.textButton){
//     this.refs.btnText.classList.toggle("hidden", false);
//     this.refs.btnIcon.classList.toggle("hidden", true);
    
//     this.refs.btnText.innerText = textButton;
//     this.refs.btnText.onpointerdown = e => {
//       this.setPopup(e, this.refs.btnText);
//     }
//   }
// }

// setPopup(e, node){
//   const rect = node.getBoundingClientRect();
//   this.refs.popup.render({
//     x: rect.x,
//     y: rect.y,
//     content: this.popupContent,
//     asPopover: true,
//     onClose: () => {}
//   });
// }
// }
// customElements.define(DropDown.TAG_NAME, DropDown);

// export function isEmpty(obj){
//   return Boolean(!obj || Object.keys(obj).length === 0);
// }

// class DOM {
//   Component: Component | string;
//   content: any;
//   params?: { [key: string]: any };
//   constructor(Component, params = {}, content){
//     this.Component = Component;
//     this.content = content;
//     this.params = params;
//   }

//   render(delta){
//     let node;
//     if(typeof Component === "string"){
//       node = document.createElement(Component);
//       Object.assign(node, this.params);
//     } else {
//       node = new this.Component(this.params);
//       node.render(delta || this.params);
//     }
//     return node;
//   }
// }

// export function _dom(Component, params = {}, content){

//   return new DOM(Component, params, content);
// }

// export function _domAttach(node: HTMLElement, _domContent, idField){
//   if(!(node instanceof HTMLElement)) throw "expecting HTMLElement as first param";
//   if(_domContent){
//     if(Array.isArray(_domContent)){
//       _domContent.map(checkIfValidContent);
//       if(!_domContent.length){
//         removeChildren(node);
//         return;
//       }
//     } else {
//       checkIfValidContent(_domContent);
//     }

//     function checkIfValidContent(cont){
//       if(!(cont instanceof DOM)) throw "expecting DOM (_dom) as second param";
//       if(cont.Component !== customElements.get(cont.Component.TAG_NAME)) throw "DOM Component static TAG_NAME missing in class or Component not defined (customElements.define)";
//     }
//   } else {
//     removeChildren(node);
//     return;
//   }

//   if(Array.isArray(_domContent)){
//     const getExisting = () => {
//       return Array.from(node.children).filter(el => {
//         return (!idField || el[idField] == domContent.params[idField]);
//       });
//     }

//     /* Remove deleted */
//     getExisting().map((el, i) => {
//       if(
//         i > _domContent.length - 1 ||
//         el.tagName.toLowerCase() !== _domContent[i].Component.TAG_NAME.toLowerCase()
//       ){
//         node.removeChild(el);
//       }
//     });

//     /* Check if needs full overwrite */
//     if(
//       getExisting().length === _domContent.length &&
//       !getExisting().some((el, i) => {
//         return el.tagName.toLowerCase() !== _domContent[i].Component.TAG_NAME.toLowerCase();
//       })
//     ){
//       getExisting().map((el, i) => {
//         checkDelta(el, _domContent[i]);
//         checkChildren(el, _domContent[i])
//       });
//     } else {
//       removeChildren(node);
//       _domContent.forEach(domContent => {
//         let attachedNode = node.appendChild(domContent.render());
//         checkChildren(attachedNode, domContent);
//       })
//     }

//   } else {
//     attachDom(node, _domContent, idField);
//   }

//   function attachDom(node: HTMLElement, domContent, idField){

//     const getExisting = () => {
//       return Array.from(node.children).find(el => {
//         return el.tagName.toLowerCase() === domContent.Component.TAG_NAME.toLowerCase() && 
//           (!idField || el[idField] == domContent.params[idField]);
//       });
//     }

//     let existing = getExisting(),
//       attachedNode = null;
//     if(!existing){
//       attachedNode = node.appendChild(domContent.render());
//     } else {
//       attachedNode = existing;
//       checkDelta(attachedNode, domContent)
//       // let delta = null;
//       // Object.keys(domContent.params)
//       //   .map(attrName => {
//       //     if(existing[attrName] !== domContent.params[attrName]){
//       //       // existing[attrName] = _domContent.params[attrName];
//       //       delta = delta || {};
//       //       delta[attrName] = domContent.params[attrName];
//       //     }
//       //   });
//       // if(delta){
//       //   existing.render(delta);
//       // }
//     }


//     checkChildren(attachedNode, domContent)
//     // if(domContent instanceof DOM && domContent.content){
//     //   _domAttach(attachedNode, domContent.content)
//     // }
//   }

//   function checkDelta(attachedNode, domContent){
//     let delta = null;
//     Object.keys(domContent.params)
//       .map(attrName => {
//         if(attachedNode[attrName] !== domContent.params[attrName]){
//           // existing[attrName] = _domContent.params[attrName];
//           delta = delta || {};
//           delta[attrName] = domContent.params[attrName];
//         }
//       });
//     if(delta){
//       attachedNode.render(delta);
//     }
//   }

//   function checkChildren(attachedNode, domContent){
//     if(domContent instanceof DOM && domContent.content){
//       _domAttach(attachedNode, domContent.content)
//     }
//   }

// }

// export function dom(tagName, params = {}, ...content){
// let elem = document.createElement(tagName);
// Object.assign(elem, params);

// if(content){
//   content.map(c => {
//       if(content instanceof HTMLElement){
//           elem.appendChild(c);
//       } else {
//           elem.innerText = c;
//       }
//   });
// }
// return elem;
// }

// export function domMerge(parent, children, { keyName = "id", tagFilter = null } = {}){
// if(!parent.firstChild && children && children.length){
//   appendChildren(parent, children);
// } else {
  
//   /* Remove missing children */
//   const getExisting = () => {
//     return Array.from(parent.children).filter(el => {
//       return !tagFilter || el.tagName.toLowerCase() === tagFilter.toLowerCase()
//     });
//   }

//   getExisting().filter(c => {
//       /* Remove if cannot find in children same id */
//       return !children.find(nc => nc[keyName] === c[keyName] );
//     }).map(c => {
//       parent.removeChild(c);
//     });

//   /* Add new children */
//   const newChildren = children.filter(nc => !getExisting().find(c => nc[keyName] === c[keyName] ));
//   appendChildren(parent, newChildren);
// }
// }

// function appendChildren(parent, children) {
//   if(!children || !children.length) return;

//   var fragment = document.createDocumentFragment();
//   for (var i = 0; i < children.length; i++) {  
//     fragment.appendChild(children[i]);
//   }
//   parent.appendChild(fragment);
// }





// export function initPanning(handlerDiv, { onPanStart=()=>{}, onPan=()=>{}, onPanEnd=()=>{} , clamp = true }){
//   if(handlerDiv && !handlerDiv._initPanning){
//       handlerDiv._initPanning = true;
//       const onPress = (ev) => {
//               ev.preventDefault();
//               var rect = handlerDiv.getBoundingClientRect();
//               var offsetX = ev.clientX - rect.left; //x position within the element.
//               var offsetY = ev.clientY - rect.top;  //y position within the element.
//               const { clientX: xStart, clientY: yStart } = ev;
//               handlerDiv._pointerdown = { offsetX, offsetY, xStart, yStart };
//               onPanStart(handlerDiv._pointerdown, ev);
//           },
//           onRelease = (ev) => {
//             if(handlerDiv._pointerdown){
//               ev.preventDefault();
//               onPanEnd({ ...handlerDiv._panning }, ev);
//               handlerDiv._pointerdown = false;
//             }
//           },
//           onMove = (ev) => {
//             if(handlerDiv._pointerdown){
//               ev.preventDefault();
//                 const { offsetX, offsetY, xStart, yStart } = handlerDiv._pointerdown;
//                 const { clientX, clientY } = ev;
//                 handlerDiv._panning = {
//                   x: clientX - offsetX,
//                   y: clientY - offsetY,
//                   xStart, yStart,
//                 }
//                 if(clamp){
//                   handlerDiv._panning.x = Math.max(0, handlerDiv._panning.x)
//                   handlerDiv._panning.y = Math.max(0, handlerDiv._panning.y)
//                 }
//                 onPan({ ...handlerDiv._panning });
//             }
//           };
//       addEvent(handlerDiv, "pointerdown", onPress);
//       addEvent(window.document.body, "pointerup", onRelease);
//       addEvent(window.document.body, "pointermove", onMove);
//       window.document.body.style.touchAction = "none";
//   }
// }

// export function initPan({ defaultValues, handle, target, manual = false, onPanStart = ()=>{}, onPan = ()=>{}, onPanEnd = ()=>{} }){

// initPanning(handle, { 
//   onPanStart,
//   onPan: ({ x, y }) => {
//     setVal({ x, y });
//     onPan({ x, y });
//   },
//   onPanEnd
// });
// if(defaultValues){
//   const { x = 10, y = 10 } = defaultValues;
//   setVal({ x, y });
// }

// function setVal({ x, y }){
//   if(!manual){
//     target.style.position = "absolute";
//     target.style.left = `${Math.max(0, (x))}px`;
//     target.style.top = `${Math.max(0, (y))}px`;
//   }
// }
// }

// export function classes(node, obj){
// let classNames = Object.keys(obj);
// classNames.map(className =>{
//   node.classList[obj[className]? "add" : "remove"](className)
// });
// }

// export function initResize({ defaultValues, handle, target, manual = false, onResizeStart=()=>{}, onResize=()=>{}, onResizeEnd=()=>{}}){

//   initPanning(handle, {
//     onPanStart: ()=>{
//       target._size = {
//         width: target.offsetWidth,
//         height: target.offsetHeight
//       }
//       onResizeStart(target._size);
//     },
//     onPan: ({ x, y, xStart, yStart }) => {
//       if(!target._size) return;

//       const W = [300, window.innerWidth], H = [300, window.innerHeight],
//       { width, height } = target._size;
      

//       let newW = width + x - xStart,
//         newH = height + y - yStart;

//       newW = Math.max(W[0], Math.min(W[1], newW));
//       newH = Math.max(H[0], Math.min(H[1], newH));
//       setVal({ width: newW, height: newH });
//       onResize({ width: newW, height: newH });
//     },
//     onPanEnd: ()=>{
//       target._size = null;
//       onResizeEnd({
//         width: target.offsetWidth,
//         height: target.offsetHeight
//       });
//     },
//   });

//   if(defaultValues){
//     const { width = 400, height = 400 } = defaultValues;
//     setVal({ width, height });
//   }
//   function setVal({ width, height }){
//     if(!manual){
//       target.style.width = `${width}px`;
//       target.style.height = `${height}px`;
//     }
//   }
// }
