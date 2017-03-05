'use strict';

function __$styleInject(css, returnValue) {
  if (typeof document === 'undefined') {
    return returnValue;
  }
  css = css || '';
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  if (style.styleSheet){
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  head.appendChild(style);
  return returnValue;
}

/** Virtual DOM Node */
function VNode(nodeName, attributes, children) {
	/** @type {string|function} */
	this.nodeName = nodeName;

	/** @type {object<string>|undefined} */
	this.attributes = attributes;

	/** @type {array<VNode>|undefined} */
	this.children = children;

	/** Reference to the given key. */
	this.key = attributes && attributes.key;
}

/** Global options
 *	@public
 *	@namespace options {Object}
 */
var options = {

	/** If `true`, `prop` changes trigger synchronous component updates.
  *	@name syncComponentUpdates
  *	@type Boolean
  *	@default true
  */
	//syncComponentUpdates: true,

	/** Processes all created VNodes.
  *	@param {VNode} vnode	A newly-created VNode to normalize/process
  */
	//vnode(vnode) { }

	/** Hook invoked after a component is mounted. */
	// afterMount(component) { }

	/** Hook invoked after the DOM is updated with a component's latest render. */
	// afterUpdate(component) { }

	/** Hook invoked immediately before a component is unmounted. */
	// beforeUnmount(component) { }
};

var stack = [];

var EMPTY_CHILDREN = [];

/** JSX/hyperscript reviver
*	Benchmarks: https://esbench.com/bench/57ee8f8e330ab09900a1a1a0
 *	@see http://jasonformat.com/wtf-is-jsx
 *	@public
 *  @example
 *  /** @jsx h *\/
 *  import { render, h } from 'preact';
 *  render(<span>foo</span>, document.body);
 */
function h(nodeName, attributes) {
	var children = void 0,
	    lastSimple = void 0,
	    child = void 0,
	    simple = void 0,
	    i = void 0;
	for (i = arguments.length; i-- > 2;) {
		stack.push(arguments[i]);
	}
	if (attributes && attributes.children) {
		if (!stack.length) stack.push(attributes.children);
		delete attributes.children;
	}
	while (stack.length) {
		if ((child = stack.pop()) instanceof Array) {
			for (i = child.length; i--;) {
				stack.push(child[i]);
			}
		} else if (child != null && child !== true && child !== false) {
			if (typeof child == 'number') child = String(child);
			simple = typeof child == 'string';
			if (simple && lastSimple) {
				children[children.length - 1] += child;
			} else {
				(children || (children = [])).push(child);
				lastSimple = simple;
			}
		}
	}

	var p = new VNode(nodeName, attributes || undefined, children || EMPTY_CHILDREN);

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode) options.vnode(p);

	return p;
}

/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
function extend(obj, props) {
	if (props) {
		for (var i in props) {
			obj[i] = props[i];
		}
	}
	return obj;
}

/** Fast clone. Note: does not filter out non-own properties.
 *	@see https://esbench.com/bench/56baa34f45df6895002e03b6
 */
function clone(obj) {
	return extend({}, obj);
}

/** Get a deep property value from the given object, expressed in dot-notation.
 *	@private
 */
function delve(obj, key) {
	for (var p = key.split('.'), i = 0; i < p.length && obj; i++) {
		obj = obj[p[i]];
	}
	return obj;
}

/** @private is the given object a Function? */
function isFunction(obj) {
	return 'function' === typeof obj;
}

/** @private is the given object a String? */
function isString(obj) {
	return 'string' === typeof obj;
}

/** Convert a hashmap of CSS classes to a space-delimited className string
 *	@private
 */
function hashToClassName(c) {
	var str = '';
	for (var prop in c) {
		if (c[prop]) {
			if (str) str += ' ';
			str += prop;
		}
	}
	return str;
}

/** Just a memoized String#toLowerCase */
var lcCache = {};
var toLowerCase = function toLowerCase(s) {
	return lcCache[s] || (lcCache[s] = s.toLowerCase());
};

/** Call a function asynchronously, as soon as possible.
 *	@param {Function} callback
 */
var resolved = typeof Promise !== 'undefined' && Promise.resolve();
var defer = resolved ? function (f) {
	resolved.then(f);
} : setTimeout;

// render modes

var NO_RENDER = 0;
var SYNC_RENDER = 1;
var FORCE_RENDER = 2;
var ASYNC_RENDER = 3;

var EMPTY = {};

var ATTR_KEY = typeof Symbol !== 'undefined' ? Symbol.for('preactattr') : '__preactattr_';

// DOM properties that should NOT have "px" added when numeric
var NON_DIMENSION_PROPS = {
	boxFlex: 1, boxFlexGroup: 1, columnCount: 1, fillOpacity: 1, flex: 1, flexGrow: 1,
	flexPositive: 1, flexShrink: 1, flexNegative: 1, fontWeight: 1, lineClamp: 1, lineHeight: 1,
	opacity: 1, order: 1, orphans: 1, strokeOpacity: 1, widows: 1, zIndex: 1, zoom: 1
};

// DOM event types that do not bubble and should be attached via useCapture
var NON_BUBBLING_EVENTS = { blur: 1, error: 1, focus: 1, load: 1, resize: 1, scroll: 1 };

function createLinkedState(component, key, eventPath) {
	var path = key.split('.');
	return function (e) {
		var t = e && e.target || this,
		    state = {},
		    obj = state,
		    v = isString(eventPath) ? delve(e, eventPath) : t.nodeName ? t.type.match(/^che|rad/) ? t.checked : t.value : e,
		    i = 0;
		for (; i < path.length - 1; i++) {
			obj = obj[path[i]] || (obj[path[i]] = !i && component.state[path[i]] || {});
		}
		obj[path[i]] = v;
		component.setState(state);
	};
}

var items = [];

function enqueueRender(component) {
	if (!component._dirty && (component._dirty = true) && items.push(component) == 1) {
		(options.debounceRendering || defer)(rerender);
	}
}

function rerender() {
	var p = void 0,
	    list = items;
	items = [];
	while (p = list.pop()) {
		if (p._dirty) renderComponent(p);
	}
}

function isFunctionalComponent(vnode) {
  var nodeName = vnode && vnode.nodeName;
  return nodeName && isFunction(nodeName) && !(nodeName.prototype && nodeName.prototype.render);
}

/** Construct a resultant VNode from a VNode referencing a stateless functional component.
 *	@param {VNode} vnode	A VNode with a `nodeName` property that is a reference to a function.
 *	@private
 */
function buildFunctionalComponent(vnode, context) {
  return vnode.nodeName(getNodeProps(vnode), context || EMPTY);
}

function isSameNodeType(node, vnode) {
	if (isString(vnode)) {
		return node instanceof Text;
	}
	if (isString(vnode.nodeName)) {
		return !node._componentConstructor && isNamedNode(node, vnode.nodeName);
	}
	if (isFunction(vnode.nodeName)) {
		return (node._componentConstructor ? node._componentConstructor === vnode.nodeName : true) || isFunctionalComponent(vnode);
	}
}

function isNamedNode(node, nodeName) {
	return node.normalizedNodeName === nodeName || toLowerCase(node.nodeName) === toLowerCase(nodeName);
}

/**
 * Reconstruct Component-style `props` from a VNode.
 * Ensures default/fallback values from `defaultProps`:
 * Own-properties of `defaultProps` not present in `vnode.attributes` are added.
 * @param {VNode} vnode
 * @returns {Object} props
 */
function getNodeProps(vnode) {
	var props = clone(vnode.attributes);
	props.children = vnode.children;

	var defaultProps = vnode.nodeName.defaultProps;
	if (defaultProps) {
		for (var i in defaultProps) {
			if (props[i] === undefined) {
				props[i] = defaultProps[i];
			}
		}
	}

	return props;
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};



var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

function removeNode(node) {
	var p = node.parentNode;
	if (p) p.removeChild(node);
}

/** Set a named attribute on the given Node, with special behavior for some names and event handlers.
 *	If `value` is `null`, the attribute/handler will be removed.
 *	@param {Element} node	An element to mutate
 *	@param {string} name	The name/key to set, such as an event or attribute name
 *	@param {any} old	The last value that was set for this name/node pair
 *	@param {any} value	An attribute value, such as a function to be used as an event handler
 *	@param {Boolean} isSvg	Are we currently diffing inside an svg?
 *	@private
 */
function setAccessor(node, name, old, value, isSvg) {

	if (name === 'className') name = 'class';

	if (name === 'class' && value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
		value = hashToClassName(value);
	}

	if (name === 'key') {
		// ignore
	} else if (name === 'class' && !isSvg) {
		node.className = value || '';
	} else if (name === 'style') {
		if (!value || isString(value) || isString(old)) {
			node.style.cssText = value || '';
		}
		if (value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
			if (!isString(old)) {
				for (var i in old) {
					if (!(i in value)) node.style[i] = '';
				}
			}
			for (var _i in value) {
				node.style[_i] = typeof value[_i] === 'number' && !NON_DIMENSION_PROPS[_i] ? value[_i] + 'px' : value[_i];
			}
		}
	} else if (name === 'dangerouslySetInnerHTML') {
		if (value) node.innerHTML = value.__html || '';
	} else if (name[0] == 'o' && name[1] == 'n') {
		var l = node._listeners || (node._listeners = {});
		name = toLowerCase(name.substring(2));
		// @TODO: this might be worth it later, un-breaks focus/blur bubbling in IE9:
		// if (node.attachEvent) name = name=='focus'?'focusin':name=='blur'?'focusout':name;
		if (value) {
			if (!l[name]) node.addEventListener(name, eventProxy, !!NON_BUBBLING_EVENTS[name]);
		} else if (l[name]) {
			node.removeEventListener(name, eventProxy, !!NON_BUBBLING_EVENTS[name]);
		}
		l[name] = value;
	} else if (name !== 'list' && name !== 'type' && !isSvg && name in node) {
		setProperty(node, name, value == null ? '' : value);
		if (value == null || value === false) node.removeAttribute(name);
	} else {
		var ns = isSvg && name.match(/^xlink\:?(.+)/);
		if (value == null || value === false) {
			if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', toLowerCase(ns[1]));else node.removeAttribute(name);
		} else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) !== 'object' && !isFunction(value)) {
			if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', toLowerCase(ns[1]), value);else node.setAttribute(name, value);
		}
	}
}

/** Attempt to set a DOM property to the given value.
 *	IE & FF throw for certain property-value combinations.
 */
function setProperty(node, name, value) {
	try {
		node[name] = value;
	} catch (e) {}
}

/** Proxy an event to hooked event handlers
 *	@private
 */
function eventProxy(e) {
	return this._listeners[e.type](options.event && options.event(e) || e);
}

var nodes = {};

function collectNode(node) {
	removeNode(node);

	if (node instanceof Element) {
		node._component = node._componentConstructor = null;

		var name = node.normalizedNodeName || toLowerCase(node.nodeName);
		(nodes[name] || (nodes[name] = [])).push(node);
	}
}

function createNode(nodeName, isSvg) {
	var name = toLowerCase(nodeName),
	    node = nodes[name] && nodes[name].pop() || (isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName));
	node.normalizedNodeName = name;
	return node;
}

var mounts = [];

/** Diff recursion count, used to track the end of the diff cycle. */
var diffLevel = 0;

/** Global flag indicating if the diff is currently within an SVG */
var isSvgMode = false;

/** Global flag indicating if the diff is performing hydration */
var hydrating = false;

/** Invoke queued componentDidMount lifecycle methods */
function flushMounts() {
	var c = void 0;
	while (c = mounts.pop()) {
		if (options.afterMount) options.afterMount(c);
		if (c.componentDidMount) c.componentDidMount();
	}
}

/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode`
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
function diff(dom, vnode, context, mountAll, parent, componentRoot) {
	// diffLevel having been 0 here indicates initial entry into the diff (not a subdiff)
	if (!diffLevel++) {
		// when first starting the diff, check if we're diffing an SVG or within an SVG
		isSvgMode = parent && typeof parent.ownerSVGElement !== 'undefined';

		// hydration is inidicated by the existing element to be diffed not having a prop cache
		hydrating = dom && !(ATTR_KEY in dom);
	}

	var ret = idiff(dom, vnode, context, mountAll);

	// append the element if its a new parent
	if (parent && ret.parentNode !== parent) parent.appendChild(ret);

	// diffLevel being reduced to 0 means we're exiting the diff
	if (! --diffLevel) {
		hydrating = false;
		// invoke queued componentDidMount lifecycle methods
		if (!componentRoot) flushMounts();
	}

	return ret;
}

function idiff(dom, vnode, context, mountAll) {
	var ref = vnode && vnode.attributes && vnode.attributes.ref;

	// Resolve ephemeral Pure Functional Components
	while (isFunctionalComponent(vnode)) {
		vnode = buildFunctionalComponent(vnode, context);
	}

	// empty values (null & undefined) render as empty Text nodes
	if (vnode == null) vnode = '';

	// Fast case: Strings create/update Text nodes.
	if (isString(vnode)) {
		// update if it's already a Text node
		if (dom && dom instanceof Text && dom.parentNode) {
			if (dom.nodeValue != vnode) {
				dom.nodeValue = vnode;
			}
		} else {
			// it wasn't a Text node: replace it with one and recycle the old Element
			if (dom) recollectNodeTree(dom);
			dom = document.createTextNode(vnode);
		}

		return dom;
	}

	// If the VNode represents a Component, perform a component diff.
	if (isFunction(vnode.nodeName)) {
		return buildComponentFromVNode(dom, vnode, context, mountAll);
	}

	var out = dom,
	    nodeName = String(vnode.nodeName),
	    // @TODO this masks undefined component errors as `<undefined>`
	prevSvgMode = isSvgMode,
	    vchildren = vnode.children;

	// SVGs have special namespace stuff.
	// This tracks entering and exiting that namespace when descending through the tree.
	isSvgMode = nodeName === 'svg' ? true : nodeName === 'foreignObject' ? false : isSvgMode;

	if (!dom) {
		// case: we had no element to begin with
		// - create an element with the nodeName from VNode
		out = createNode(nodeName, isSvgMode);
	} else if (!isNamedNode(dom, nodeName)) {
		// case: Element and VNode had different nodeNames
		// - need to create the correct Element to match VNode
		// - then migrate children from old to new

		out = createNode(nodeName, isSvgMode);

		// move children into the replacement node
		while (dom.firstChild) {
			out.appendChild(dom.firstChild);
		} // if the previous Element was mounted into the DOM, replace it inline
		if (dom.parentNode) dom.parentNode.replaceChild(out, dom);

		// recycle the old element (skips non-Element node types)
		recollectNodeTree(dom);
	}

	var fc = out.firstChild,
	    props = out[ATTR_KEY];

	// Attribute Hydration: if there is no prop cache on the element,
	// ...create it and populate it with the element's attributes.
	if (!props) {
		out[ATTR_KEY] = props = {};
		for (var a = out.attributes, i = a.length; i--;) {
			props[a[i].name] = a[i].value;
		}
	}

	// Optimization: fast-path for elements containing a single TextNode:
	if (!hydrating && vchildren && vchildren.length === 1 && typeof vchildren[0] === 'string' && fc && fc instanceof Text && !fc.nextSibling) {
		if (fc.nodeValue != vchildren[0]) {
			fc.nodeValue = vchildren[0];
		}
	}
	// otherwise, if there are existing or new children, diff them:
	else if (vchildren && vchildren.length || fc) {
			innerDiffNode(out, vchildren, context, mountAll, !!props.dangerouslySetInnerHTML);
		}

	// Apply attributes/props from VNode to the DOM Element:
	diffAttributes(out, vnode.attributes, props);

	// invoke original ref (from before resolving Pure Functional Components):
	if (ref) {
		(props.ref = ref)(out);
	}

	isSvgMode = prevSvgMode;

	return out;
}

/** Apply child and attribute changes between a VNode and a DOM Node to the DOM.
 *	@param {Element} dom		Element whose children should be compared & mutated
 *	@param {Array} vchildren	Array of VNodes to compare to `dom.childNodes`
 *	@param {Object} context		Implicitly descendant context object (from most recent `getChildContext()`)
 *	@param {Boolean} mountAll
 *	@param {Boolean} absorb		If `true`, consumes externally created elements similar to hydration
 */
function innerDiffNode(dom, vchildren, context, mountAll, absorb) {
	var originalChildren = dom.childNodes,
	    children = [],
	    keyed = {},
	    keyedLen = 0,
	    min = 0,
	    len = originalChildren.length,
	    childrenLen = 0,
	    vlen = vchildren && vchildren.length,
	    j = void 0,
	    c = void 0,
	    vchild = void 0,
	    child = void 0;

	if (len) {
		for (var i = 0; i < len; i++) {
			var _child = originalChildren[i],
			    props = _child[ATTR_KEY],
			    key = vlen ? (c = _child._component) ? c.__key : props ? props.key : null : null;
			if (key != null) {
				keyedLen++;
				keyed[key] = _child;
			} else if (hydrating || absorb || props || _child instanceof Text) {
				children[childrenLen++] = _child;
			}
		}
	}

	if (vlen) {
		for (var _i = 0; _i < vlen; _i++) {
			vchild = vchildren[_i];
			child = null;

			// if (isFunctionalComponent(vchild)) {
			// 	vchild = buildFunctionalComponent(vchild);
			// }

			// attempt to find a node based on key matching
			var _key = vchild.key;
			if (_key != null) {
				if (keyedLen && _key in keyed) {
					child = keyed[_key];
					keyed[_key] = undefined;
					keyedLen--;
				}
			}
			// attempt to pluck a node of the same type from the existing children
			else if (!child && min < childrenLen) {
					for (j = min; j < childrenLen; j++) {
						c = children[j];
						if (c && isSameNodeType(c, vchild)) {
							child = c;
							children[j] = undefined;
							if (j === childrenLen - 1) childrenLen--;
							if (j === min) min++;
							break;
						}
					}
				}

			// morph the matched/found/created DOM child to match vchild (deep)
			child = idiff(child, vchild, context, mountAll);

			if (child && child !== dom) {
				if (_i >= len) {
					dom.appendChild(child);
				} else if (child !== originalChildren[_i]) {
					if (child === originalChildren[_i + 1]) {
						removeNode(originalChildren[_i]);
					}
					dom.insertBefore(child, originalChildren[_i] || null);
				}
			}
		}
	}

	if (keyedLen) {
		for (var _i2 in keyed) {
			if (keyed[_i2]) recollectNodeTree(keyed[_i2]);
		}
	}

	// remove orphaned children
	while (min <= childrenLen) {
		child = children[childrenLen--];
		if (child) recollectNodeTree(child);
	}
}

/** Recursively recycle (or just unmount) a node an its descendants.
 *	@param {Node} node						DOM node to start unmount/removal from
 *	@param {Boolean} [unmountOnly=false]	If `true`, only triggers unmount lifecycle, skips removal
 */
function recollectNodeTree(node, unmountOnly) {
	var component = node._component;
	if (component) {
		// if node is owned by a Component, unmount that component (ends up recursing back here)
		unmountComponent(component, !unmountOnly);
	} else {
		// If the node's VNode had a ref function, invoke it with null here.
		// (this is part of the React spec, and smart for unsetting references)
		if (node[ATTR_KEY] && node[ATTR_KEY].ref) node[ATTR_KEY].ref(null);

		if (!unmountOnly) {
			collectNode(node);
		}

		// Recollect/unmount all children.
		// - we use .lastChild here because it causes less reflow than .firstChild
		// - it's also cheaper than accessing the .childNodes Live NodeList
		var c = void 0;
		while (c = node.lastChild) {
			recollectNodeTree(c, unmountOnly);
		}
	}
}

/** Apply differences in attributes from a VNode to the given DOM Element.
 *	@param {Element} dom		Element with attributes to diff `attrs` against
 *	@param {Object} attrs		The desired end-state key-value attribute pairs
 *	@param {Object} old			Current/previous attributes (from previous VNode or element's prop cache)
 */
function diffAttributes(dom, attrs, old) {
	// remove attributes no longer present on the vnode by setting them to undefined
	var name = void 0;
	for (name in old) {
		if (!(attrs && name in attrs) && old[name] != null) {
			setAccessor(dom, name, old[name], old[name] = undefined, isSvgMode);
		}
	}

	// add new & update changed attributes
	if (attrs) {
		for (name in attrs) {
			if (name !== 'children' && name !== 'innerHTML' && (!(name in old) || attrs[name] !== (name === 'value' || name === 'checked' ? dom[name] : old[name]))) {
				setAccessor(dom, name, old[name], old[name] = attrs[name], isSvgMode);
			}
		}
	}
}

var components = {};

function collectComponent(component) {
	var name = component.constructor.name,
	    list = components[name];
	if (list) list.push(component);else components[name] = [component];
}

function createComponent(Ctor, props, context) {
	var inst = new Ctor(props, context),
	    list = components[Ctor.name];
	Component.call(inst, props, context);
	if (list) {
		for (var i = list.length; i--;) {
			if (list[i].constructor === Ctor) {
				inst.nextBase = list[i].nextBase;
				list.splice(i, 1);
				break;
			}
		}
	}
	return inst;
}

function setComponentProps(component, props, opts, context, mountAll) {
	if (component._disable) return;
	component._disable = true;

	if (component.__ref = props.ref) delete props.ref;
	if (component.__key = props.key) delete props.key;

	if (!component.base || mountAll) {
		if (component.componentWillMount) component.componentWillMount();
	} else if (component.componentWillReceiveProps) {
		component.componentWillReceiveProps(props, context);
	}

	if (context && context !== component.context) {
		if (!component.prevContext) component.prevContext = component.context;
		component.context = context;
	}

	if (!component.prevProps) component.prevProps = component.props;
	component.props = props;

	component._disable = false;

	if (opts !== NO_RENDER) {
		if (opts === SYNC_RENDER || options.syncComponentUpdates !== false || !component.base) {
			renderComponent(component, SYNC_RENDER, mountAll);
		} else {
			enqueueRender(component);
		}
	}

	if (component.__ref) component.__ref(component);
}

/** Render a Component, triggering necessary lifecycle events and taking High-Order Components into account.
 *	@param {Component} component
 *	@param {Object} [opts]
 *	@param {boolean} [opts.build=false]		If `true`, component will build and store a DOM node if not already associated with one.
 *	@private
 */
function renderComponent(component, opts, mountAll, isChild) {
	if (component._disable) return;

	var skip = void 0,
	    rendered = void 0,
	    props = component.props,
	    state = component.state,
	    context = component.context,
	    previousProps = component.prevProps || props,
	    previousState = component.prevState || state,
	    previousContext = component.prevContext || context,
	    isUpdate = component.base,
	    nextBase = component.nextBase,
	    initialBase = isUpdate || nextBase,
	    initialChildComponent = component._component,
	    inst = void 0,
	    cbase = void 0;

	// if updating
	if (isUpdate) {
		component.props = previousProps;
		component.state = previousState;
		component.context = previousContext;
		if (opts !== FORCE_RENDER && component.shouldComponentUpdate && component.shouldComponentUpdate(props, state, context) === false) {
			skip = true;
		} else if (component.componentWillUpdate) {
			component.componentWillUpdate(props, state, context);
		}
		component.props = props;
		component.state = state;
		component.context = context;
	}

	component.prevProps = component.prevState = component.prevContext = component.nextBase = null;
	component._dirty = false;

	if (!skip) {
		if (component.render) rendered = component.render(props, state, context);

		// context to pass to the child, can be updated via (grand-)parent component
		if (component.getChildContext) {
			context = extend(clone(context), component.getChildContext());
		}

		while (isFunctionalComponent(rendered)) {
			rendered = buildFunctionalComponent(rendered, context);
		}

		var childComponent = rendered && rendered.nodeName,
		    toUnmount = void 0,
		    base = void 0;

		if (isFunction(childComponent)) {
			// set up high order component link

			var childProps = getNodeProps(rendered);
			inst = initialChildComponent;

			if (inst && inst.constructor === childComponent && childProps.key == inst.__key) {
				setComponentProps(inst, childProps, SYNC_RENDER, context);
			} else {
				toUnmount = inst;

				inst = createComponent(childComponent, childProps, context);
				inst.nextBase = inst.nextBase || nextBase;
				inst._parentComponent = component;
				component._component = inst;
				setComponentProps(inst, childProps, NO_RENDER, context);
				renderComponent(inst, SYNC_RENDER, mountAll, true);
			}

			base = inst.base;
		} else {
			cbase = initialBase;

			// destroy high order component link
			toUnmount = initialChildComponent;
			if (toUnmount) {
				cbase = component._component = null;
			}

			if (initialBase || opts === SYNC_RENDER) {
				if (cbase) cbase._component = null;
				base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, true);
			}
		}

		if (initialBase && base !== initialBase && inst !== initialChildComponent) {
			var baseParent = initialBase.parentNode;
			if (baseParent && base !== baseParent) {
				baseParent.replaceChild(base, initialBase);

				if (!toUnmount) {
					initialBase._component = null;
					recollectNodeTree(initialBase);
				}
			}
		}

		if (toUnmount) {
			unmountComponent(toUnmount, base !== initialBase);
		}

		component.base = base;
		if (base && !isChild) {
			var componentRef = component,
			    t = component;
			while (t = t._parentComponent) {
				(componentRef = t).base = base;
			}
			base._component = componentRef;
			base._componentConstructor = componentRef.constructor;
		}
	}

	if (!isUpdate || mountAll) {
		mounts.unshift(component);
	} else if (!skip) {
		if (component.componentDidUpdate) {
			component.componentDidUpdate(previousProps, previousState, previousContext);
		}
		if (options.afterUpdate) options.afterUpdate(component);
	}

	var cb = component._renderCallbacks,
	    fn = void 0;
	if (cb) while (fn = cb.pop()) {
		fn.call(component);
	}if (!diffLevel && !isChild) flushMounts();
}

/** Apply the Component referenced by a VNode to the DOM.
 *	@param {Element} dom	The DOM node to mutate
 *	@param {VNode} vnode	A Component-referencing VNode
 *	@returns {Element} dom	The created/mutated element
 *	@private
 */
function buildComponentFromVNode(dom, vnode, context, mountAll) {
	var c = dom && dom._component,
	    originalComponent = c,
	    oldDom = dom,
	    isDirectOwner = c && dom._componentConstructor === vnode.nodeName,
	    isOwner = isDirectOwner,
	    props = getNodeProps(vnode);
	while (c && !isOwner && (c = c._parentComponent)) {
		isOwner = c.constructor === vnode.nodeName;
	}

	if (c && isOwner && (!mountAll || c._component)) {
		setComponentProps(c, props, ASYNC_RENDER, context, mountAll);
		dom = c.base;
	} else {
		if (originalComponent && !isDirectOwner) {
			unmountComponent(originalComponent, true);
			dom = oldDom = null;
		}

		c = createComponent(vnode.nodeName, props, context);
		if (dom && !c.nextBase) {
			c.nextBase = dom;
			// passing dom/oldDom as nextBase will recycle it if unused, so bypass recycling on L241:
			oldDom = null;
		}
		setComponentProps(c, props, SYNC_RENDER, context, mountAll);
		dom = c.base;

		if (oldDom && dom !== oldDom) {
			oldDom._component = null;
			recollectNodeTree(oldDom);
		}
	}

	return dom;
}

/** Remove a component from the DOM and recycle it.
 *	@param {Element} dom			A DOM node from which to unmount the given Component
 *	@param {Component} component	The Component instance to unmount
 *	@private
 */
function unmountComponent(component, remove) {
	if (options.beforeUnmount) options.beforeUnmount(component);

	// console.log(`${remove?'Removing':'Unmounting'} component: ${component.constructor.name}`);
	var base = component.base;

	component._disable = true;

	if (component.componentWillUnmount) component.componentWillUnmount();

	component.base = null;

	// recursively tear down & recollect high-order component children:
	var inner = component._component;
	if (inner) {
		unmountComponent(inner, remove);
	} else if (base) {
		if (base[ATTR_KEY] && base[ATTR_KEY].ref) base[ATTR_KEY].ref(null);

		component.nextBase = base;

		if (remove) {
			removeNode(base);
			collectComponent(component);
		}
		var c = void 0;
		while (c = base.lastChild) {
			recollectNodeTree(c, !remove);
		} // removeOrphanedChildren(base.childNodes, true);
	}

	if (component.__ref) component.__ref(null);
	if (component.componentDidUnmount) component.componentDidUnmount();
}

function Component(props, context) {
	/** @private */
	this._dirty = true;
	// /** @public */
	// this._disableRendering = false;
	// /** @public */
	// this.prevState = this.prevProps = this.prevContext = this.base = this.nextBase = this._parentComponent = this._component = this.__ref = this.__key = this._linkedStates = this._renderCallbacks = null;
	/** @public */
	this.context = context;
	/** @type {object} */
	this.props = props;
	/** @type {object} */
	if (!this.state) this.state = {};
}

extend(Component.prototype, {

	/** Returns a `boolean` value indicating if the component should re-render when receiving the given `props` and `state`.
  *	@param {object} nextProps
  *	@param {object} nextState
  *	@param {object} nextContext
  *	@returns {Boolean} should the component re-render
  *	@name shouldComponentUpdate
  *	@function
  */
	// shouldComponentUpdate() {
	// 	return true;
	// },


	/** Returns a function that sets a state property when called.
  *	Calling linkState() repeatedly with the same arguments returns a cached link function.
  *
  *	Provides some built-in special cases:
  *		- Checkboxes and radio buttons link their boolean `checked` value
  *		- Inputs automatically link their `value` property
  *		- Event paths fall back to any associated Component if not found on an element
  *		- If linked value is a function, will invoke it and use the result
  *
  *	@param {string} key		The path to set - can be a dot-notated deep key
  *	@param {string} [eventPath]	If set, attempts to find the new state value at a given dot-notated path within the object passed to the linkedState setter.
  *	@returns {function} linkStateSetter(e)
  *
  *	@example Update a "text" state value when an input changes:
  *		<input onChange={ this.linkState('text') } />
  *
  *	@example Set a deep state value on click
  *		<button onClick={ this.linkState('touch.coords', 'touches.0') }>Tap</button
  */
	linkState: function linkState(key, eventPath) {
		var c = this._linkedStates || (this._linkedStates = {});
		return c[key + eventPath] || (c[key + eventPath] = createLinkedState(this, key, eventPath));
	},


	/** Update component state by copying properties from `state` to `this.state`.
  *	@param {object} state		A hash of state properties to update with new values
  */
	setState: function setState(state, callback) {
		var s = this.state;
		if (!this.prevState) this.prevState = clone(s);
		extend(s, isFunction(state) ? state(s, this.props) : state);
		if (callback) (this._renderCallbacks = this._renderCallbacks || []).push(callback);
		enqueueRender(this);
	},


	/** Immediately perform a synchronous re-render of the component.
  *	@private
  */
	forceUpdate: function forceUpdate() {
		renderComponent(this, FORCE_RENDER);
	},


	/** Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
  *	Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
  *	@param {object} props		Props (eg: JSX attributes) received from parent element/component
  *	@param {object} state		The component's current state
  *	@param {object} context		Context object (if a parent component has provided context)
  *	@returns VNode
  */
	render: function render() {}
});

function render(vnode, parent, merge) {
  return diff(merge, vnode, {}, false, parent);
}

__$styleInject(".Sidebar{display:flex;flex:1;justify-content:space-between}.Sidebar__container{justify-content:center;padding:16px 64px;padding:1rem 4rem;max-height:100vh;overflow-y:scroll}.Sidebar__header{font-size:30px;color:#ff5961;font-weight:100;text-transform:uppercase;align-content:center;text-align:center;margin-bottom:64px;margin-bottom:4rem}", undefined);

__$styleInject(".Tabbar{min-width:130px;max-width:130px;display:flex;flex-direction:column}.Tabbar__fillspace{background:#efefef;flex-grow:1}", undefined);

__$styleInject(".Tab{height:110px;margin-bottom:5px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background-color:#efefef;cursor:pointer;border:0;color:#a0a0a0;font-size:15px;text-transform:uppercase;outline:none}.Tab:hover{background-color:#eaeaea}.Tab:active{background-color:#ddd}.Tab.selected{background-color:#fff}.tab-icon{font-size:48px;font-size:3rem;padding:16px;padding:1rem;color:#fb8d94}.tab-icon.selected{color:#ff5961}", undefined);

// for making conditional class making easier in react
var classMaker = function classMaker(a, b, class_1, class_2) {
  return a === b ? class_1 : class_2;
};

var Tab = function Tab(_ref) {
  var id = _ref.id,
      name = _ref.name,
      currentView = _ref.currentView,
      icon = _ref.icon,
      changeView = _ref.changeView;


  var tabClasses = classMaker(currentView, id, 'Tab selected', 'Tab');
  var iconClasses = classMaker(currentView, id, icon + ' tab-icon selected', icon + ' tab-icon');

  return h(
    'button',
    { 'class': tabClasses, onClick: function onClick() {
        return changeView(id);
      } },
    h('icon', { 'class': iconClasses }),
    name
  );
};

var tabs = [{ name: "Home", id: "home", icon: "fa fa-home" }, { name: "Add A Story", id: "story", icon: "fa fa-commenting-o" }, { name: "Filters / Legend", id: "legend", icon: "fa fa-map-marker" }, { name: "Currently Showing", id: "currently_showing", icon: "fa fa-eye" }, { name: "Your Selection", id: "your_selection", icon: "fa fa-commenting" }, { name: "About", id: "about", icon: "fa fa-clone" }];

/**
 * Constructs the menu tabs that are clickable. 
 */
var TabBar = function TabBar(props) {
  var renderTabs = function renderTabs() {
    return tabs.map(function (tab) {
      return h(Tab, _extends({}, tab, { currentView: props.currentView, changeView: props.changeView }));
    });
  };

  return h(
    'div',
    { 'class': 'Tabbar' },
    renderTabs(),
    h('div', { 'class': 'Tabbar__fillspace' })
  );
};

__$styleInject("", undefined);

__$styleInject(".Header{border-bottom:2px solid #ff5961;color:#ff5961;font-size:25.6px;font-size:1.6rem;margin:48px 0;margin:3rem 0;width:100%;text-transform:uppercase}.Header.large{font-size:25px}", undefined);

var Header = function Header(props) {
  var genClassName = function genClassName() {
    switch (props.type) {
      case 'large':
        return 'Header large';
      default:
        return 'Header';
    }
  };

  return h(
    'div',
    { 'class': genClassName(), style: props.style },
    props.children
  );
};

__$styleInject(".Button{display:flex;flex:1;background:none;border:2px solid #ff5961;border-radius:5px;outline:none;justify-content:center;width:100%;padding:16px;padding:1rem;margin:48px 0;margin:3rem 0;color:#ff5961;font-size:28.8px;font-size:1.8rem;text-transform:uppercase}.Button:hover{border:2px solid #eb3125;box-shadow:1px 2px 1px rgba(0, 0, 0, .1)}.Button:active{border:2px solid red;box-shadow:none}.Button.large{font-size:25px}", undefined);

var Button = function Button(props) {
  var genClassName = function genClassName() {
    switch (props.type) {
      case 'large':
        return 'Button large';
      default:
        return 'Button';
    }
  };

  return h(
    'button',
    {
      onClick: props.onClick,
      'class': genClassName(),
      style: props.style },
    props.children
  );
};

var Home = function Home() {
  return h(
    'div',
    null,
    h(
      'section',
      { 'class': 'Home__welcome' },
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Veniam quidem voluptatem laudantium fuga iste nulla eligendi mollitia velit amet laborum, quia blanditiis rerum, eius nobis quod ipsam sit recusandae ratione!'
    ),
    h(
      'section',
      { 'class': 'Home__cta-addstory' },
      h(
        'p',
        null,
        'We\'d love to hear your stories!'
      ),
      h(
        Button,
        null,
        'Add a story \u25B6'
      )
    ),
    h(
      'section',
      { 'class': 'Home__recent' },
      h(
        Header,
        null,
        'Recently Added Stories'
      )
    )
  );
};

var About = function About() {
  return h(
    'div',
    null,
    h(
      Header,
      null,
      'About'
    ),
    h(
      'p',
      null,
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nesciunt culpa, iste repellendus a, provident saepe! Illum exercitationem, ipsa! Magnam consequatur, nam, atque tempore nihil perspiciatis? Reiciendis sequi est reprehenderit veniam.'
    ),
    h(
      'p',
      null,
      'Doloribus, perferendis ipsa veritatis vitae consequuntur ut autem! Repellendus odit cum cupiditate ab eum laudantium, voluptas hic libero eaque distinctio dolor, nesciunt error eligendi tenetur itaque earum aut ipsa aliquid.'
    ),
    h(
      'p',
      null,
      'Quaerat doloremque suscipit aperiam, velit, perspiciatis mollitia officia ad vero reprehenderit veritatis dolores blanditiis reiciendis iusto quisquam, quasi, incidunt ab hic. Fugit necessitatibus tempore cupiditate aspernatur quaerat. Itaque, labore, provident.'
    ),
    h(
      'p',
      null,
      'Aspernatur, error. Consequatur eos, laudantium unde vitae ipsam voluptatem neque ea quod et velit voluptatum nihil, aperiam. Quod tenetur, rem consequuntur itaque dignissimos saepe est? Modi laudantium delectus tempora ut.'
    ),
    h(
      'p',
      null,
      'Unde a neque laudantium beatae voluptas tenetur, expedita consequuntur nemo quos dolorem quasi, amet quo perspiciatis! Aspernatur nesciunt modi perspiciatis ea nisi iste quam voluptate veritatis. Facilis minus aperiam, perspiciatis.'
    ),
    h(
      'p',
      null,
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nesciunt culpa, iste repellendus a, provident saepe! Illum exercitationem, ipsa! Magnam consequatur, nam, atque tempore nihil perspiciatis? Reiciendis sequi est reprehenderit veniam.'
    ),
    h(
      'p',
      null,
      'Doloribus, perferendis ipsa veritatis vitae consequuntur ut autem! Repellendus odit cum cupiditate ab eum laudantium, voluptas hic libero eaque distinctio dolor, nesciunt error eligendi tenetur itaque earum aut ipsa aliquid.'
    ),
    h(
      'p',
      null,
      'Quaerat doloremque suscipit aperiam, velit, perspiciatis mollitia officia ad vero reprehenderit veritatis dolores blanditiis reiciendis iusto quisquam, quasi, incidunt ab hic. Fugit necessitatibus tempore cupiditate aspernatur quaerat. Itaque, labore, provident.'
    ),
    h(
      'p',
      null,
      'Aspernatur, error. Consequatur eos, laudantium unde vitae ipsam voluptatem neque ea quod et velit voluptatum nihil, aperiam. Quod tenetur, rem consequuntur itaque dignissimos saepe est? Modi laudantium delectus tempora ut.'
    ),
    h(
      'p',
      null,
      'Unde a neque laudantium beatae voluptas tenetur, expedita consequuntur nemo quos dolorem quasi, amet quo perspiciatis! Aspernatur nesciunt modi perspiciatis ea nisi iste quam voluptate veritatis. Facilis minus aperiam, perspiciatis.'
    ),
    h(
      Header,
      null,
      ' Documentation '
    )
  );
};

var YourSelection = function YourSelection() {
  return h(
    'div',
    null,
    h(
      Header,
      null,
      'Your Selection'
    ),
    h(
      'section',
      { 'class': 'YourSelection__cta-addstory' },
      h(
        'p',
        null,
        'Ready to add your own story?'
      ),
      h(
        Button,
        null,
        'Add a story \u25B6'
      )
    )
  );
};

var Current = function Current() {
  return h(
    'div',
    null,
    h(
      Header,
      null,
      'Currently Showing'
    )
  );
};

var Legend = function Legend() {
  return h(
    'div',
    null,
    'Im the LEGEND page'
  );
};

var Story = function Story() {
  return h(
    'div',
    null,
    'Im the STORY page'
  );
};

var Sidebar = function (_Component) {
  inherits(Sidebar, _Component);

  function Sidebar() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, Sidebar);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = Sidebar.__proto__ || Object.getPrototypeOf(Sidebar)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      currentView: 'home'
    }, _this.changeView = function (view_id) {
      _this.setState({
        currentView: view_id
      });
    }, _this.renderSelectedView = function () {
      switch (_this.state.currentView) {
        case 'home':
          return h(Home, null);
        case 'story':
          return h(Story, null);
        case 'legend':
          return h(Legend, null);
        case 'currently_showing':
          return h(Current, null);
        case 'your_selection':
          return h(YourSelection, null);
        case 'about':
          return h(About, null);
        default:
          return h(Home, null);
      }
    }, _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(Sidebar, [{
    key: 'render',
    value: function render$$1() {
      return h(
        'aside',
        { 'class': 'Sidebar' },
        h(
          'section',
          { 'class': 'Sidebar__container' },
          h(
            'h3',
            { 'class': 'Sidebar__header' },
            'AMC Ripple Map'
          ),
          this.renderSelectedView()
        ),
        h(TabBar, { currentView: this.state.currentView, changeView: this.changeView })
      );
    }
  }]);
  return Sidebar;
}(Component);

__$styleInject("html{font-size:62.5%}body{margin:0;padding:0;font-family:Raleway,Arial,Helvetica,sans-serif;font-size:13px;font-size:1.3rem;max-height:100vh}.App{display:flex;min-height:100vh;background:rgb(255)}#sidebar{display:flex;flex:1}#ripplemap-mount{display:flex;flex:2;background:linear-gradient(135deg,#502561,#fd5d62)}", undefined);

__$styleInject(".Ripplemap{display:flex;flex:2;background:linear-gradient(135deg,#502561,#fd5d62)}", undefined);

var state = {};
state.tags = []; // THINK: default to ['plain']?
state.facts = [];
state.tagkeys = {};
state.query = {};

state.safe_mode = false;
state.loading = true; // TODO: fix this

state.all_edges = true; // awkward... :(
state.admin_mode = false; // yep another hack w00t
state.my_maxyear = 2017; // total hackery...
state.my_minyear = 2008; // hack hack hack
state.show_labels = false; // yup
state.current_year = 2017; // more hacks
state.filter_sentences = false; // awkward... :(
state.ring_radius = 40; // lalala

function add_to_server_facts(type, live_item) {
  if (state.loading) return undefined;

  /*
    data model:
   user: id
   action: add/remove/edit
   type: node/edge
   tags: [...]
   [maybe other stats can live here?]
   data:
     node: {id, name, type, cat...}
     edge: {_in, _out, type, label}
    */

  // var item = JSON.parse(JSON.stringify(live_item))
  var item = Object.keys(live_item).reduce(function (acc, key) {
    if (['_in', '_out'].indexOf(key) !== -1) return acc;
    acc[key] = live_item[key];
    return acc;
  }, {});

  if (type === 'edge') {
    item._out = live_item._out._id;
    item._in = live_item._in._id;
  }

  // FIXME: present splash page of some kind

  var fact = { email: state.email,
    action: 'add',
    type: type,
    tags: state.tags,
    data: item
  };

  send_data_to_server(fact);
}

function persist() {
  // THINK: do we still need localstorage caching?
  Dagoba.persist(G, 'rripplemap');
}

persist = debounce(persist, 1000);

function debounce(func, wait, immediate) {
  // via underscore, needs cleaning
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.

  var timeout;
  return function () {
    var context = this,
        args = arguments;
    var later = function later() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function send_data_to_server(data, cb) {
  var url = 'http://ripplemap.io:8888';

  if (state.safe_mode === 'daring') {
    url = 'http://localhost:8888';
  } else if (state.safe_mode) {
    return console.log(G);
  }

  fetch(url, { method: 'post',
    body: JSON.stringify(data)
  }).then(function (response) {
    return response.json();
  }).then(function (result) {
    if (cb) cb(result);
  });
}

function get_facts_from_server(cb) {
  var url = 'http://ripplemap.io:8888';

  // local shunt for airplane mode
  if (state.safe_mode === 'local') return cb(JSON.parse(localStorage['DAGOBA::ripmapdata']));

  if (state.safe_mode === 'daring') {
    url = 'http://localhost:8888';
  }

  fetch(url, {
    method: 'get'
  }).then(function (response) {
    return response.json();
  }).then(function (data) {
    cb(data);
  }).catch(function (err) {
    console.log('lalalal', err);
  });
}

// Some fun functions that help or something

function noop() {}

function eq(attr, val) {
  return function (obj) {
    return obj[attr] === val;
  };
}

function prop(attr) {
  return function (obj) {
    return obj[attr];
  };
}

function clone$1(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function truncate(str, to) {
  if (!to || str.length <= to) return str;
  return str.substr(0, to - 2) + '...';
}

function push_it(list, key, val) {
  if (!list[key]) return list[key] = [val];

  list[key].push(val);
  return list[key];
}

function pipe() {
  var all_funs = [].slice.call(arguments);

  function magic_pipe(data) {
    var funs = all_funs.slice();
    var fun;

    function inner() {
      while (fun = funs.shift()) {
        if (fun.async) {
          // fun is async
          return fun.async(data, cb);
        } else {
          // fun is a function
          data = fun(data);
        }
      }
    }

    function cb(new_data) {
      data = new_data;
      inner();
    }

    // TODO: this should return a promise for data
    inner();
    return true;
  }

  return magic_pipe;
}

function error$1(mess) {
  console.log(arguments, mess);
}

var cats = {}; // ripplemap categories
cats.thing = {};
cats.action = {};
cats.effect = {};
cats.happening = {};

function get_node(catstr, typestr, props) {
  var node = convert_props(props);

  var cat = cats[catstr];
  if (!cat) return error$1('that is not a valid cat', catstr);

  var type = cat[typestr];
  if (!type) return error$1('that is not a valid ' + catstr + ' type', typestr);

  // TODO: check props again the cattype's property list

  node.cat = catstr;
  node.type = typestr;
  node.name = props.name || typestr; // TODO: remove (or something...)

  return node;
}

function add_alias(catstr, typestr, alias) {
  // TODO: check alias

  // add an alias to anything
  var cat = cats[catstr];
  if (!cat) return error$1('Invalid cat', catstr);

  var type = cat[typestr];
  if (!type) return error$1('That is not a valid thing type', typestr);

  // add alias
  type.aliases.push(alias);

  // add type to list
  cat[alias] = type;

  // THINK: alias rules?
}

function add_thing(type, props, persist$$1) {
  var node = get_node('thing', type, props);
  if (!node) return false;

  node.priority = 1; // bbq???

  add_to_graph('node', node);
  if (persist$$1) add_to_server_facts('node', node);

  return node;
}

function add_action(type, props, persist$$1) {
  var node = get_node('action', type, props);
  if (!node) return false;

  node.priority = 1; // bbq???

  // TODO: check props against type (what does this mean?)

  add_to_graph('node', node);
  if (persist$$1) add_to_server_facts('node', node);

  return node;
}

function new_thing_type(type, properties) {
  // TODO: valid type?

  // does this type exist already?
  var cattype = cats.thing[type];
  if (cattype) return error$1('That thing type already exists', type);

  // manually create
  // THINK: should we copy properties here?
  cattype = { type: type };
  cattype.aliases = []; // THINK: but if you do don't override properties.aliases

  // add properties.cc
  cattype.cc = properties.cc || {};

  // add default props for all things
  cattype.props = {}; // THINK: get props from properties.props?
  cattype.props.name = {};
  cattype.props.start = {}; // THINK: these have both fuzziness and confidence issues (how sure is the user of the time, how sure are we of the user)
  cattype.props.end = {};

  // TODO: add questions

  // put in place
  cats.thing[type] = cattype;

  // add properties.aliases
  if (properties.aliases) {
    properties.aliases.forEach(function (alias) {
      add_alias('thing', type, alias);
    });
  }
}

function new_action_type(type, properties) {
  // TODO: valid type?

  // does this type exist already?
  var cattype = cats.action[type];
  if (cattype) return error$1('That action type already exists', type);

  // manually create
  // THINK: should we copy properties here?
  cattype = { type: type };

  // add properties.edges and default edges
  cattype.edges = properties.edges || {};
  cattype.edges.did = { dir: 'in', plural: 0, label: 'did', types: ['person'], aliases: [] };
  cattype.edges.to = { dir: 'in', plural: 0, label: 'to', types: ['effect'], aliases: [] };
  cattype.edges.the = { dir: 'out', plural: 0, label: 'the', types: ['thing'], aliases: [] };

  // add default props for all actions
  cattype.props = {}; // THINK: get props from properties.props?
  cattype.aliases = []; // THINK: but if you do don't override properties.aliases

  // TODO: add questions

  // put in place
  cats.action[type] = cattype;

  // add properties.aliases
  if (properties.aliases) {
    properties.aliases.forEach(function (alias) {
      add_alias('action', type, alias);
    });
  }
}

function new_effect_type(type, properties) {
  // TODO: valid type?

  // does this type exist already?
  var cattype = cats.effect[type];
  if (cattype) return error$1('That effect type already exists', type);

  // manually create
  // THINK: should we copy properties here?
  cattype = { type: type };

  // add properties.edges and default edges
  cattype.edges = properties.edges || {};
  cattype.edges.to = { dir: 'out', plural: 0, label: 'to', types: ['action'], aliases: [] };
  cattype.edges.by = { dir: 'in', plural: 1, label: 'by', types: ['thing'], aliases: [] };
  cattype.edges.was = { dir: 'in', plural: 1, label: 'was', types: ['person'], aliases: [] };
  cattype.edges.during = { dir: 'out', plural: 0, label: 'during', types: ['happening'], aliases: [] };

  // add default props for all effects
  cattype.props = {}; // THINK: get props from properties.props?
  cattype.aliases = []; // THINK: but if you do don't override properties.aliases

  // TODO: add questions

  // put in place
  cats.effect[type] = cattype;

  // add properties.aliases
  if (properties.aliases) {
    properties.aliases.forEach(function (alias) {
      add_alias('effect', type, alias);
    });
  }
}

function new_happening_type(type, properties) {
  // what properties do happenings have?
  // an edge type can have an alias for storytelling purposes

  // TODO: valid type?

  // does this type exist already?
  var cattype = cats.happening[type];
  if (cattype) return error$1('That happening type already exists', type);

  // manually create
  // THINK: should we copy properties here?
  cattype = { type: type };

  // add properties.edges and default edges
  cattype.edges = properties.edges || {};
  cattype.edges.at = { dir: 'out', plural: 0, label: 'at', types: ['place', 'event'], aliases: [] };
  cattype.edges.the = { dir: 'out', plural: 1, label: 'the', types: ['outcome', 'event'], aliases: [] };
  cattype.edges.did = { dir: 'in', plural: 1, label: 'did', types: ['person'], aliases: [] };
  cattype.edges.during = { dir: 'in', plural: 0, label: 'during', types: ['effect'], aliases: [] };

  // add default props for all happenings
  cattype.props = {}; // THINK: get props from properties.props?
  cattype.aliases = []; // THINK: but if you do don't override properties.aliases

  // TODO: add questions

  // put in place
  cats.happening[type] = cattype;

  // add properties.aliases
  if (properties.aliases) {
    properties.aliases.forEach(function (alias) {
      add_alias('happening', type, alias);
    });
  }
}

function add_edge(type, from, to, props, persist$$1) {
  var edge = {};

  // check from and to
  // check type against from and to interfaces
  // publish in dagoba + persist

  edge = convert_props(props);
  edge._in = to;
  edge._out = from;
  edge.type = type;
  edge.label = type;

  // THINK: if Dagoba supported proper subgraphs, we could have RM.facts and RM.G and keep them fully in sync, instead of limiting RM.G to just the "viewable" facts. we'll need a new RM.GG or something for the currently viewable subgraph. this would also help with all the duplicate node warning messages, cut down on allocations, and allow a pipeline based around building new graphs (or extending/syncing the main graph from the factbase). so facts_to_graph would take a graph and some facts and put them together, or something. or as you add new facts they're automatically ramified into the graph. or fizzlemorts.

  add_to_graph('edge', edge);
  if (persist$$1) add_to_server_facts('edge', edge);
}

new_thing_type('person', {});
new_thing_type('org', { cc: ['org'] });
new_thing_type('place', { cc: ['place', 'event'] });
new_thing_type('event', { cc: ['event', 'outcome'], timerange: true }); // already has start and end, so... ?
new_thing_type('outcome', { cc: ['outcome'], aliases: ['artwork', 'session'] }); // local vs ubiquitous outcomes -- they're structurally different

new_action_type('pass', { aliases: [] });
new_action_type('join', { aliases: [] });
new_action_type('leave', { aliases: [] });
new_action_type('create', { aliases: [] });
new_action_type('attend', { aliases: ['participate in'] });
new_action_type('manage', { aliases: ['run', 'lead', 'facilitate', 'coordinate', 'organize'] });
new_action_type('assist', { aliases: ['help', 'host', 'contribute'] });
new_action_type('present', { aliases: [] });
new_action_type('represent', { aliases: [] });
new_action_type('fund', { aliases: [] });
new_action_type('inspire', { aliases: [] });
new_action_type('invite', { aliases: [] });

new_effect_type('inspire', { aliases: ['influenced'] });
new_effect_type('convince', { aliases: ['ask'] });
new_effect_type('introduce', { aliases: ['meet'] });

new_happening_type('conversation', { aliases: [] });
new_happening_type('experience', { aliases: ['see', 'hear', 'watch', 'attend'] });

// MODEL HELPERS


function add_to_graph(type, item) {
  if (type === 'node') {
    // TODO: this is kind of a hack, but also kind of not
    if (!item._id) item._id = get_new_id();
    G.addVertex(item);
  }

  if (type === 'edge') {
    G.addEdge(item);
  }
}

function get_new_id() {
  // TODO: swap this out for maybe a mongo_id implementation
  return ("" + Math.random()).slice(2);
}

function convert_props(props) {
  if ((typeof props === 'undefined' ? 'undefined' : _typeof(props)) !== 'object') return {};

  if (Array.isArray(props)) return {};

  return clone$1(props);
}

var convo = new_conversation();
function join_conversation(conversation) {
  var conversation = conversation || convo;

  var wants = conversation.current.slots[0].key;
  var value = el(wants).value;

  convo = fulfill_desire(conversation, value);

  return convo;
}

function new_sentence() {
  var slots = [{ key: 'subject', type: 'word', cat: 'thing' }, { key: 'verb', type: 'word', cat: 'action' }, { key: 'object', type: 'word', cat: 'thing' }, { key: 'date', type: 'date' }];
  return { slots: slots, filled: [] };
}

function new_conversation() {
  var sentence = new_sentence();
  return { sentences: [sentence], current: sentence };
}

function fulfill_desire(conversation, value) {
  var conversation = conversation || convo;

  var sentence = give_word(conversation.current, value);

  // TODO: allow multi-sentence conversations


  if (!sentence.slots.length) {
    var subject, verb, object, date;
    sentence.filled.forEach(function (slot) {
      if (slot.type === 'gettype') {
        var thing = add_thing(slot.value, { name: slot.name }, true);
        if (slot.oldkey === 'subject') subject = thing;
        if (slot.oldkey === 'object') object = thing;
      } else if (slot.type === 'date') {
        date = slot.value;
      } else if (slot.key === 'subject') {
        subject = slot.word;
      } else if (slot.key === 'object') {
        object = slot.word;
      } else if (slot.key === 'verb') {
        verb = (slot.word || {}).type || slot.value;
      }
    });

    if (subject && verb && object) {
      verb = add_action(verb, { time: new Date(date).getTime() }, true);
      add_edge('the', verb._id, object._id, 0, true);
      add_edge('did', subject._id, verb._id, 0, true);
    }

    // start over
    // TODO: show the sentence
    conversation = new_conversation();
    render$1(); // THINK: this should queue or something... rAF?
  }

  return conversation;
}

function give_word(sentence, value) {
  var slot = sentence.slots.shift();
  if (!slot) return error$1('This sentence is finished');

  // TODO: check this logic modularly
  if (slot.type === 'word') {
    var word = G.v({ name: value, cat: slot.cat }).run()[0];
    if (word) {
      slot.word = word;
    }
  }

  if (slot.cat === 'thing') {
    if (slot.type === 'word') {
      if (!slot.word) {
        sentence.slots.unshift({ key: 'type', type: 'gettype', name: value, cat: slot.cat, oldkey: slot.key });
      }
    } else if (slot.type === 'gettype') {
      // var nameslot = sentence.filled[sentence.filled.length-1]
    }
  }

  // fix it in post
  slot.value = value;
  sentence.filled.push(slot);

  return sentence;
}

// this does some dom things

var el = function () {
  var els = {};
  var default_el = { addEventListener: noop };

  return function (el_id) {
    // NOTE: removing caching for now to deal with vdom
    // if(els[el_id])
    //   return els[el_id]
    els[el_id] = document.getElementById(el_id) || default_el;
    return els[el_id];
  };
}();

function set_el(el_id, val) {
  el(el_id).innerHTML = val;
}

function append_el(el_id, val) {
  el(el_id).innerHTML += val;
}

// LOGIN/ORG/TAG STUFF

function login(e) {
  e.preventDefault();
  state.email = el('email').value;
  el('login').classList.add('hide');
  el('storytime').classList.remove('hide');
}

// SOME HIGHLIGHTING OR SOMETHING

var highlight_fun;
var highlight_target;

function activate_highlighter() {
  highlight_fun = el('sentences').addEventListener('mousemove', highlighter);
}

function deactivate_highlighter() {
  el('sentences').removeEventListener('mousemove', highlight_fun);
}

function highlighter(e) {
  for (var t = e.target; t && t.matches; t = t.parentNode) {
    if (t.matches('.sentence')) {
      if (highlight_target === t) return undefined;

      highlight_target = t;
      var ids = [].slice.call(t.children).map(function (node) {
        return node.dataset.id;
      }).filter(Boolean);
      var fun = function fun(v) {
        return ~ids.indexOf(v._id);
      };
      // ids.forEach(id => G.v(id).run()[0].highlight = true)
      // render()
      highlight(fun);
      return undefined;
    }
  }
}

function highlight(o_or_f) {
  var current = G.v({ highlight: true }).run();
  current.forEach(function (node) {
    // node.highlight = false
    delete node.highlight; // better when collapsing
  });

  if (!o_or_f) {
    render$1();
    return undefined;
  }

  if (typeof o_or_f === 'function') {
    current = G.v().filter(o_or_f).run();
  } else {
    current = G.v(o_or_f).run();
  }

  current.forEach(function (node) {
    node.highlight = true;
  });

  render$1();
}

// INTERACTIONS & DOM BINDINGS

function click_tagnames(ev) {
  ev.preventDefault();
  var target = ev.target;
  var tag = target.innerText;
  if (!tag) return undefined;
  removetag(tag);
}

function mouseover_tagnames(ev) {
  var target = ev.target;
  var tag = target.innerText;

  if (!tag) return undefined;

  if (highlight_target === tag) return undefined;

  highlight_target = tag;
  highlight(function (v) {
    return ~v.tags.indexOf(tag);
  });
}

function mouseout_tagnames(ev) {
  if (!highlight_target) return undefined;

  highlight_target = false;
  highlight();
}

function global_keydown(ev) {
  // TODO: clean this up (prevent span hijacking)
  if (ev.target.tagName === 'SPAN' || ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.target.tagName === 'TEXTAREA') return true;

  var key = ev.keyCode || ev.which;

  // var key_a = 97
  var key_e = 69;
  var key_f = 70;
  var key_l = 76;
  var key_n = 78;
  var key_p = 80;
  // var key_s = 115
  var tilde = 126;
  var larro = 37;
  var uarro = 38;
  var rarro = 39;
  var darro = 40;
  // var langl = 60
  // var rangl = 62

  if (key === larro || key === darro || key === key_p) {
    ev.preventDefault();
    if (state.current_year <= state.my_minyear) return false;
    state.current_year--;
    render$1();
  }

  if (key === rarro || key === uarro || key === key_n) {
    ev.preventDefault();
    if (state.current_year >= state.my_maxyear) return false;
    state.current_year++;
    render$1();
  }

  if (key === key_f) {
    state.filter_sentences = !state.filter_sentences;
    render$1();
  }

  if (key === key_e) {
    state.all_edges = !state.all_edges;
    render$1();
  }

  if (key === key_l) {
    state.show_labels = !state.show_labels;
    render$1();
  }

  if (key === tilde) {
    state.admin_mode = !state.admin_mode;
    render$1();
  }
}

function submit_addtag(ev) {
  ev.preventDefault();
  addtag(el('othertags').value);
}

function keyup_sentences(ev) {
  // var key = ev.keyCode || ev.which
  var span = ev.target;
  var type = span.classList.contains('edge') ? 'edge' : 'cat';
  var val = span.textContent;
  var id = span.getAttribute('data-id');

  // TODO: trap return for special effects
  // TODO: maybe trap tab also

  // ev.preventDefault()

  // handle the node case
  if (type === 'cat' && id && val) {
    var node = G.vertexIndex[id];
    if (node && node.name !== val) {
      // update the name/label in the real graph
      node.name = val;
      pub(id);
    }
  }

  // handle the edge case
  if (type === 'edge') {
    var id1 = span.getAttribute('data-id1');
    var id2 = span.getAttribute('data-id2');

    var node1 = G.vertexIndex[id1];
    var edges = node1._in.concat(node1._out);
    var edge = edges.filter(function (edge) {
      return edge._in._id === id1 && edge._out._id === id2 || edge._in._id === id2 && edge._out._id === id1;
    })[0];

    if (!edge) return undefined;

    edge.label = val;
    edge.type = val;

    // pub(id1 + '-' + id2)
    // Dagoba.persist(G, 'rripplemap')
    persist();
  }

  function pub(id) {
    // publish the change
    // Dagoba.persist(G, 'rripplemap')
    persist();

    // update all other sentences
    var spans = document.querySelectorAll('span.node-' + id);
    for (var i = 0; i < spans.length; i++) {
      if (spans[i] !== span) spans[i].textContent = val;
    }

    // rerender the graph
    render$1(0);
  }
}

function click_sentences(ev) {
  var target = ev.target;
  if (target.nodeName !== 'BUTTON') return true;

  var id = target.getAttribute('data-id');
  var node = G.vertexIndex[id];

  if (!node) return error$1('That node does not exist');

  if (node.cat === 'action') {
    // remove "sentence"
    G.removeVertex(node);
  } else {
    G.removeVertex(node); // THINK: is this really reasonable?
  }

  persist();
  render$1();
}

function submit_convo(ev) {
  ev.preventDefault();

  whatsnext(G, join_conversation());

  return false;
}

var ctx = el('ripples').getContext('2d');

var viz_pipe;
var word_pipe;

// RENDER PIPELINE

function init$1() {
  // TODO: consider a workflow for managing this tripartite pipeline, so we can auto-cache etc
  viz_pipe = pipe(mod('data', sg_compact), mod('data', likenamed), mod('data', cluster), mod('data', Dagoba.cloneflat)
  // layout:
  , set_year, data_to_graph, add_fakes, set_coords, set_score, minimize_edge_length, remove_fakes, unique_y_pos, filter_by_year
  // shapes:
  , add_rings, add_ring_labels, copy_edges, copy_nodes, add_node_labels, add_edge_labels
  // rendering:
  , clear_it, draw_it, draw_metadata);

  word_pipe = pipe(get_actions, filter_actions, make_sentences, write_sentences);
}

function render$1() {
  // TODO: cloning is inefficient: make lazy subgraphs
  var env = { data: Dagoba.clone(G), params: { my_maxyear: state.my_maxyear, my_minyear: state.my_minyear }, shapes: [], ctx: ctx };

  viz_pipe(env);
  word_pipe(env);

  // if(n === undefined)
  //   state.pipelines.forEach(function(pipeline) { pipeline(env) })
  // else
  //   state.pipelines[n](env)
}

// COMPACTIONS

function sg_compact(g) {
  // so... this is pretty silly i guess or something. use subgraphs instead.
  var newg = Dagoba.graph();
  var edges = [];

  g.v().run().forEach(function (node) {
    if (node.time) return undefined;

    var others = g.v(node._id).both().run();
    others.forEach(function (other) {
      if (other.time) node.time = Math.min(node.time || Infinity, other.time);

      var oo = g.v(other._id).both().run();
      if (oo.length < 2) return undefined;

      var edge = { _in: oo[0]._id, _out: oo[1]._id, label: other.name || "" };
      edges.push(edge);
      newg.addVertex(node);
    });
  });

  edges.forEach(function (edge) {
    newg.addEdge(edge);
  });

  return newg;
}

function likenamed(g) {
  var namemap = {};

  g.v().run().forEach(function (node) {
    if (!node.name) return undefined;

    if (!namemap[node.name]) {
      namemap[node.name] = [node];
    } else {
      namemap[node.name].push(node);
    }
  });

  Object.keys(namemap).forEach(function (name) {
    if (namemap[name].length > 1) g.mergeVertices(namemap[name]);
  });

  return g;
}

/// modularize this:

var clusters = [['AMC', 'amc', 'Allied Media Conference', 'allied media conference', 'Allied media Conference'], ['AMP', 'amp', 'Allied Media Projects', 'allied media projects'], ['AMC2016 Coordinators Weekend', 'AMC 2016 Coordinators Meeting'], ['jayy dodd', 'jayy']];

function cluster(g) {
  clusters.map(function (names) {
    return names.reduce(function (acc, name) {
      return acc.concat(g.v({ name: name }).run());
    }, []);
  }).forEach(g.mergeVertices.bind(g));

  return g;
}

// LAYOUT

function mod(prop$$1, fun) {
  return function (env) {
    env[prop$$1] = fun(env[prop$$1]);
    return env;
  };
}

function set_year(env) {
  var minyear = Infinity;
  var maxyear = 0;
  var list = env.params.years = {};

  env.data.V = env.data.V.map(function (node) {

    if (node.time < 1199161600000) return node; // HACK: remove me!!!

    var year = new Date(node.time + 100000000).getFullYear();
    if (year < minyear) minyear = year; // effectful :(
    if (year > maxyear) maxyear = year; // effectful :(

    node.year = year; // mutation :(
    push_it(list, node.year, node); //, G.vertexIndex[node._id])

    return node;
  });

  // env.params.minyear = minyear
  // env.params.maxyear = maxyear
  env.params.minyear = state.my_minyear;
  env.params.maxyear = state.my_maxyear;

  return env;
}

function data_to_graph(env) {
  // THINK: this is kind of weird... we could probably get more leverage by just using G itself
  env.params.graph = Dagoba.graph(env.data.V, env.data.E);
  env.data.V = env.params.graph.vertices;
  env.data.E = env.params.graph.edges;
  return env;
}

function add_fakes(env) {
  var years = env.params.years;

  Object.keys(years).forEach(function (yearstr) {
    var year = years[yearstr];
    var fake = { type: 'fake', year: yearstr, name: 'fake', _in: [], _out: [] };
    // var copies = 3 + Math.ceil(year.length / 5)
    var copies = 10 - year.length < 0 ? 2 : 10 - year.length;
    // var fakes = [clone(fake), clone(fake), clone(fake), clone(fake), clone(fake), clone(fake), clone(fake), clone(fake)]
    var fakes = [];
    for (var i = 0; i < copies; i++) {
      fakes.push(clone$1(fake));
    }

    Array.prototype.push.apply(year, fakes);
    Array.prototype.push.apply(env.data.V, fakes);
  });

  return env;
}

function set_coords(env) {
  var years = env.params.years;

  env.data.V.forEach(function (node) {
    if (node.x) return node;

    var offset = node.year - env.params.my_minyear + 1;
    var radius = offset * state.ring_radius; // HACK: remove this!

    var nabes = years[node.year];
    // var gnode = G.vertexIndex[node._id]

    if (!nabes) return false;

    var index = nabes.indexOf(node);
    var arc = 2 * Math.PI / nabes.length;

    var deg = offset + index * arc;
    var cx = radius * Math.cos(deg);
    var cy = radius * Math.sin(deg);
    var edge_count = node._in.length + node._out.length;

    node.shape = 'circle';
    node.x = cx;
    node.y = cy;
    node.r = 4 + 2 * Math.min(5, edge_count / 2); //Math.floor(node.name.charCodeAt(0)/20)

    return node;
  });

  return env;
}

function set_score(env) {
  env.data.V = env.data.V.map(function (node) {
    node.score = score(node);return node;
  });
  return env;
}

function minimize_edge_length(env) {
  var years = env.params.years;

  Object.keys(years).sort().forEach(function (key) {
    var peers = years[key];
    peers.sort(score_sort);
    peers.forEach(function (node) {
      peers.forEach(function (peer) {
        swap(node, peer);
        var new_node_score = score(node);
        var new_peer_score = score(peer);
        if (node.score + peer.score < new_node_score + new_peer_score) {
          swap(node, peer);
        } else {
          node.score = new_node_score;
          peer.score = new_peer_score;
        }
      });
    });
  });

  return env;

  function swap(n1, n2) {
    var x = n1.x,
        y = n1.y;
    n1.x = n2.x;n1.y = n2.y;
    n2.x = x;n2.y = y;
  }

  function score_sort(n1, n2) {
    return n1.score - n2.score;
  }
}

function score(node) {
  return [].concat(node._in || [], node._out || []).reduce(function (acc, edge) {
    return acc + score_edge(edge, node);
  }, 0);

  function score_edge(edge, self) {
    //// TODO: if other end is "older" than this end, don't count it...
    if (edge._in === node && edge._out.year > node.year) return 0;
    if (edge._out === node && edge._in.year > node.year) return 0;

    // return edge._in.x + edge._out.x

    var dx = Math.abs(edge._in.x - edge._out.x);
    var dy = Math.abs(edge._in.y - edge._out.y);

    return Math.sqrt(dx * dx + dy * dy);
  }
}

function remove_fakes(env) {
  env.data.V = env.data.V.filter(function (node) {
    return node.type !== 'fake';
  });
  return env;
}

function unique_y_pos(env) {
  var threshold = 6;
  // var node_radius = 5
  var arc = Math.PI / 100;
  var years = env.params.years;
  var ys = [];

  Object.keys(years).sort().forEach(function (key) {
    var peers = years[key];
    peers.forEach(function (node) {
      var coords, closest;

      if (node.type === 'fake') // le sigh
        return;

      // A) do a binary search on an array of midpoints to find the closest one
      // B) if it's within threshold walk around the circle in both directions until you find an opening
      // C) if you reach the antipode give up

      for (var da = arc; da < Math.PI; da = -1 * (da + arc * (da / Math.abs(da)))) {
        coords = modify_coords(node, da);
        closest = find_closest(coords.y, ys);
        if (!closest || Math.abs(closest - coords.y) > threshold) break;
      }

      // console.log(da, closest, coords.y, Math.abs(closest - coords.y))

      node.x = coords.x;
      node.y = coords.y;
      ys.push(coords.y);

      ys.sort(function (a, b) {
        return a - b;
      }); // OPT: just insert coords.y in place
    });
  });

  return env;

  function modify_coords(node, da) {
    return { x: node.x * Math.cos(da) - node.y * Math.sin(da),
      y: node.x * Math.sin(da) + node.y * Math.cos(da)
    };
  }

  function find_closest(n, ns) {
    // binary search
    var closest;
    var index = Math.floor(ns.length / 2);
    var item = ns[index];

    if (ns.length < 5) {
      for (var i = 0; i < ns.length; i++) {
        if (closest === undefined || Math.abs(ns[i] - n) < Math.abs(closest - n)) closest = ns[i];
      }
      return closest;
    }

    if (item === n) return item;

    if (item > n) return find_closest(n, ns.slice(0, index));

    return find_closest(n, ns.slice(index + 1));
  }
}

function filter_by_year(env) {
  var max = env.params.my_maxyear;
  var min = env.params.my_minyear;

  // hack hack hack
  if (state.current_year < max) max = state.current_year;

  // TODO: do this in Dagoba so we can erase edges automatically
  env.data.V = env.data.V.filter(function (node) {
    // yuckyuckyuck
    if (node.year > max || node.year < min) {
      env.params.graph.removeVertex(node);
      return false;
    }
    return true;
  });
  return env;
}

// SHAPES

function add_rings(env) {
  for (var i = env.params.minyear; i <= env.params.maxyear; i++) {
    var color = i === state.current_year ? '#999' : '#ccc';
    var radius = state.ring_radius * (i - env.params.my_minyear + 1);
    env.shapes.unshift({ shape: 'circle', x: 0, y: 0, r: radius, stroke: color, fill: 'rgba(0, 0, 0, 0)', line: 1, type: 'ring', year: i });
  }
  return env;
}

function add_ring_labels(env) {
  var labels = [];

  env.shapes.filter(eq('type', 'ring')).forEach(function (shape) {
    var fill = shape.year === state.current_year ? '#999' : '#ccc';
    var label = { shape: 'text', str: shape.year, x: -15, y: -shape.r - 5, fill: fill, font: "18px Raleway" };
    labels.push(label);
  });

  env.shapes = env.shapes.concat(labels);
  return env;
}

function copy_edges(env) {
  env.data.E.forEach(function (edge) {
    if (!state.all_edges && !(edge._out.year === state.current_year || edge._in.year === state.current_year)) // HACK: remove this
      return undefined;

    var label = edge.label || "777";
    var color = str_to_color(label);

    // function str_to_color(str) { return 'hsl' + (state.show_labels?'a':'') + '(' + str_to_num(str) + ',100%,40%' + (state.show_labels?',0.3':'') + ')';}
    function str_to_color(str) {
      return 'hsla' + '(' + str_to_num(str) + ',30%,40%,0.' + (state.show_labels ? '3' : '7') + ')';
    }
    function str_to_num(str) {
      return char_to_num(str, 0) + char_to_num(str, 1) + char_to_num(str, 2);
    }
    function char_to_num(char, index) {
      return char.charCodeAt(index) % 20 * 20;
    }

    var line = { shape: 'line', x1: edge._in.x, y1: edge._in.y, x2: edge._out.x, y2: edge._out.y, stroke: color, type: 'edge', label: label };
    env.shapes.push(line);
  });
  return env;
}

function copy_nodes(env) {
  env.shapes = env.shapes.concat.apply(env.shapes, env.data.V.map(function (node) {
    // HACK: move this elsewhere
    if (!state.all_edges) {
      var ghost = !node._in.concat(node._out).map(function (e) {
        return [e._in.year, e._out.year];
      }).reduce(function (acc, t) {
        return acc.concat(t);
      }, []).filter(function (y) {
        return y === state.current_year;
      }).length;
      if (ghost) return [];
    }

    // var this_year = state.all_edges || node.year === state.current_year
    // var color =  'hsla(0,0%,20%,0.' + (this_year ? '99' : '3') + ')'

    // Person: Blue
    // Org: Green
    // Event: Magenta
    // Outcome: Orange
    // Concept: Purple
    // Labels should be black
    // Connections should be grey
    var hues = { outcome: '40'
      // , action '20'
      , person: '240',
      event: '320',
      org: '100'
    };

    var color = 'hsla(' + hues[node.type] + ',80%,50%,0.99)';

    var shape = { shape: 'circle',
      x: node.x,
      y: node.y,
      r: node.r,
      name: node.name,
      fill: color
    };

    if (!node.highlight) return shape;

    var highlight = { shape: 'circle',
      x: node.x,
      y: node.y,
      r: node.r + 12,
      line: 0.01,
      fill: 'hsla(0, 80%, 50%, 0.20)'
    };

    return [highlight, shape];
  }));
  return env;
}

function add_node_labels(env) {
  var labels = [];

  env.shapes.forEach(function (shape) {
    if (!shape.name) return undefined;
    var str = truncate(shape.name, 50);
    var label = { shape: 'text', str: str, x: shape.x + 15, y: shape.y + 5 };
    labels.push(label);
  });

  env.shapes = env.shapes.concat(labels);
  return env;
}

function add_edge_labels(env) {
  if (!state.show_labels) return env;

  var labels = [];

  env.shapes.forEach(function (shape) {
    if (shape.type !== 'edge') return undefined;
    var label = { shape: 'angle_text', x1: shape.x1, y1: shape.y1, x2: shape.x2, y2: shape.y2, fill: shape.stroke, str: shape.label };
    labels.push(label);
  });

  env.shapes = env.shapes.concat(labels);
  return env;
}

// RENDERING

function clear_it(env) {
  env.ctx.clearRect(0, 0, 1000, 1000);
  return env;
}

function draw_it(env) {
  env.shapes.forEach(function (node) {
    draw_shape(env.ctx, node);
  });
  return env;
}

function draw_metadata(env) {
  // el('minyear').textContent = 1900 + env.params.minyear
  // el('maxyear').textContent = 1900 + state.current_year
  return env;
}

// CANVAS FUNCTIONS

function draw_shape(ctx, node) {
  var cx = 450;
  var cy = 450;

  if (node.shape === 'circle') draw_circle(ctx, cx + node.x, cy + node.y, node.r, node.stroke, node.fill, node.line);

  if (node.shape === 'line') draw_line(ctx, cx + node.x1, cy + node.y1, cx + node.x2, cy + node.y2, node.stroke, node.line);

  if (node.shape === 'text') draw_text(ctx, cx + node.x, cy + node.y, node.str, node.font, node.fill);

  if (node.shape === 'angle_text') draw_angle_text(ctx, cx + node.x1, cy + node.y1, cx + node.x2, cy + node.y2, node.str, node.font, node.fill);
}

function draw_circle(ctx, x, y, radius, stroke_color, fill_color, line_width) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2, false);
  ctx.fillStyle = fill_color || '#444444';
  ctx.fill();
  ctx.lineWidth = line_width || 2;
  ctx.strokeStyle = stroke_color || '#eef';
  ctx.stroke();
}

function draw_line(ctx, fromx, fromy, tox, toy, stroke_color, line_width) {
  var path = new Path2D();
  path.moveTo(fromx, fromy);
  path.lineTo(tox, toy);
  ctx.strokeStyle = stroke_color || '#eef';
  ctx.lineWidth = line_width || 0.5;
  ctx.stroke(path);
}

function draw_text(ctx, x, y, str, font, fill_color) {
  ctx.fillStyle = fill_color || '#000';
  ctx.font = font || "14px Raleway";
  if (isNaN(x)) return undefined;
  x = x || 0;
  y = y || 0;
  ctx.fillText(str, x, y);
}

function draw_angle_text(ctx, x1, y1, x2, y2, str, font, fill_color) {
  ctx.fillStyle = fill_color || '337';
  ctx.font = font || "14px sans-serif";

  // modified from http://phrogz.net/tmp/canvas_rotated_text.html

  var padding = 5;
  var dx = x2 - x1;
  var dy = y2 - y1;
  var len = Math.sqrt(dx * dx + dy * dy);
  var avail = len - 2 * padding;
  var pad = 1 / 2;
  var x = x1;
  var y = y1;

  var textToDraw = str;
  if (ctx.measureText && ctx.measureText(textToDraw).width > avail) {
    while (textToDraw && ctx.measureText(textToDraw + "…").width > avail) {
      textToDraw = textToDraw.slice(0, -1);
    }textToDraw += "…";
  }

  // Keep text upright
  var angle = Math.atan2(dy, dx);
  if (angle < -Math.PI / 2 || angle > Math.PI / 2) {
    x = x2;
    y = y2;
    dx *= -1;
    dy *= -1;
    angle -= Math.PI;
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.translate(x + dx * pad, y + dy * pad);
  ctx.rotate(angle);
  ctx.fillText(textToDraw, 0, -3);
  ctx.restore();
}

// SENTENCE STRUCTURES

function get_actions(env) {
  var actions = G.v({ cat: 'action' }).run(); // FIXME: use env.data, not G
  env.params.actions = actions;
  return env;
}

function filter_actions(env) {
  env.params.actions = env.params.actions.map(function (action) {
    action.year = new Date(action.time + 100000000).getFullYear();
    return action;
  });

  if (!state.filter_sentences) return env;

  env.params.actions = env.params.actions.filter(function (action) {
    return action.year === state.current_year;
  });

  return env;
}

function make_sentences(env) {
  var sentences = env.params.actions.map(construct).filter(Boolean);
  env.params.sentences = sentences;
  return env;
}

function construct(action) {
  var list = [];
  var edges = action._out.concat(action._in);
  if (!edges[1]) return false;
  if (edges[0].label === 'the') edges = [edges[1], edges[0]];
  function notme(id, edge) {
    return edge._in._id === id ? edge._out : edge._in;
  }
  list.push(notme(action._id, edges[0]), edges[0], action, edges[1], notme(action._id, edges[1]));
  list.year = action.year;
  return list;
}

function write_sentences(env) {
  set_el('sentences', '');
  var oldyear = 1;

  env.params.sentences.sort(function (a, b) {
    return a.year - b.year;
  });

  env.params.sentences.forEach(function (list) {
    var sentence = '';
    var innerwords = '';
    var highlight_count = 0;

    if (list.year !== oldyear) {
      sentence = '<h2>' + list.year + '</h2>';
      oldyear = list.year;
    }

    list.forEach(function (thing) {
      var data;
      var word = thing.name || thing.label;
      var cat = thing.cat;
      var type = cat ? thing.type : 'edge';

      var classes = [type];
      if (cat) {
        classes.push(cat);
        classes.push('node-' + thing._id);
      } else {
        classes.push('node-' + thing._in._id + '-' + thing._out._id);
      }

      if (thing.highlight) highlight_count++;

      if (type !== 'edge') data = { id: thing._id || '' };else data = { id1: thing._in._id, id2: thing._out._id };

      if (!state.admin_mode) innerwords += template(classes, data, word);else innerwords += admin_template(thing, type, cat, word);
    });

    var sentence_classes = 'sentence';
    sentence_classes += highlight_count === 3 ? ' highlight' : '';
    sentence += '<p class="' + sentence_classes + '">' + innerwords + '.</p>';

    append_el('sentences', sentence);
  });

  function template(classes, data, text) {
    classes.unshift('word');
    var classtext = classes.join(' ');

    var datatext = Object.keys(data).map(function (key) {
      return 'data-' + key + '="' + data[key] + '"';
    }).join(' ');

    return ' <span class="' + classtext + '"' + datatext + ' contentEditable="true">' + text + '</span>';
  }

  function admin_template(thing, type, cat, text) {
    var button = '';
    var notes = '';

    if (cat === 'action') {
      button = '<button class="delete" data-id="' + thing._id + '">delete just this sentence</button>';
    } else if (type !== 'edge') {
      notes = ' (' + type + ')';
      button = '<button class="delete" data-id="' + thing._id + '">delete this thing and all its sentences entirely</button>';
    }

    return ' ' + text + notes + button;
  }

  return env;
}

// FORM BUILDER & FRIENDS

function whatsnext(graph, conversation) {
  // TODO: incorporate graph knowledge (graph is the whole world, or the relevant subgraph)
  // THINK: what is a conversation?
  // are we currently in a sentence? then find the highest weighted unfilled 'port'

  render_conversation(conversation);
}

function get_cat_dat(cat, q) {
  var substrRegex = new RegExp(q, 'i');
  var frontRegex = new RegExp('^' + q, 'i');
  var nodes = G.vertices.filter(function (node) {
    return node.cat === cat;
  }).map(prop('name')).filter(function (name) {
    return substrRegex.test(name);
  });

  nodes.sort(function (a, b) {
    return frontRegex.test(b) - frontRegex.test(a) || a.charCodeAt() - b.charCodeAt();
  });

  return nodes;
}

function render_conversation(conversation) {
  var typeahead_params = { hint: true, highlight: true, minLength: 1 };
  function typeahead_source(cat) {
    return { name: 'states', source: function source(q, cb) {
        cb(get_cat_dat(cat, q));
      } };
  }

  var inputs = '';
  var prelude = '';
  var submit_button = '<input type="submit" style="position: absolute; left: -9999px">';

  // special case the first step
  var sentence = conversation.current;

  sentence.filled.forEach(function (slot, i) {
    prelude += inject_value(slot, slot.value, i) + ' ';
  });

  // display the unfilled slot
  var slot = sentence.slots[0];
  var input = '';
  if (slot.type === 'word') {
    input = inject_value(slot, make_word_input(slot.cat, slot.key));
  } else if (slot.type === 'gettype') {
    input = inject_value(slot, make_type_input(slot.cat, slot.key));
  } else if (slot.type === 'date') {
    input = inject_value(slot, make_date_input(slot.key));
  }

  prelude += input;

  // do the DOM
  set_el('the-conversation', prelude + inputs + submit_button);

  // wiring... /sigh
  var catnames = Object.keys(cats);
  catnames.forEach(function (cat) {
    $('.' + cat + '-input').typeahead(typeahead_params, typeahead_source(cat));
  });

  if (sentence.filled.length) $('#' + slot.key).focus();

  return false;

  // helper functions

  function make_word_input(cat, key) {
    var text = '';

    if (cat === 'thing') return '<input class="typeahead ' + cat + '-input" type="text" placeholder="A' + mayben(cat) + ' ' + cat + '" id="' + key + '">';
    if (cat === 'action') {
      text += '<select id="verb" name="verb">';
      var options = ['participate in', 'lead', 'fund', 'organize', 'inspire', 'invite'];
      // var options = ['facilitate', 'coordinate', 'contribute', 'create', 'attend', 'manage', 'assist', 'present', 'join', 'leave']
      options.forEach(function (option) {
        text += '<option>' + option + '</option>';
      });
      text += '</select>';
      return text;
    }
  }

  function make_type_input(cat, key) {
    // TODO: this assumes cat is always 'thing'
    var str = '<select id="' + key + '">';
    str += '<option value="person">person</option>';
    str += '<option value="org">org</option>';
    str += '<option value="event">event</option>';
    str += '<option value="outcome">outcome</option>';
    str += '</select>';
    return str;
  }

  function make_date_input(key) {
    var str = '<input id="' + key + '" type="date" name="' + key + '" value="2016-01-01" />';
    return str;
  }

  function inject_value(slot, value, index) {
    // HACK: index is a huge hack, remove it.
    var text = '';

    if (slot.key === 'subject') {
      if (slot.value) {
        text += '<p><b>' + slot.value + '</b></p>';
      } else {
        text += "Okay, let's fill in the blanks. Tell us about ";
        text += value + ' ';
      }
    } else if (slot.key === 'verb') {
      text += ' did ';
      text += value;
      text += ' the ';
    } else if (slot.key === 'object') {
      text += value + ' ';
    } else if (slot.type === 'gettype') {
      if (index === 1) {
        text += ' is a';
        text += mayben(value) + ' ';
        text += value + ' ';
        if (slot.value) text += slot.value === 'person' ? 'who ' : 'which ';
      } else {
        text += ' (a';
        text += mayben(value) + ' ';
        text += value + ') ';
      }
    } else if (slot.type === 'date') {
      text += ' in/on ';
      text += value + ' ';
    } else {
      text = ' ' + value + ' ';
    }

    return text;
  }
}

function mayben(val) {
  return (/^[aeiou]/.test(val) ? 'n' : ''
  );
}

function set_minus(xs, ys) {
  return xs.filter(function (x) {
    return ys.indexOf(x) === -1;
  });
}

function showtags() {
  // generate current tags
  // hoverable span for highlight, plus clickable for remove
  var tagwrapper = ['<span class="tag">', '</span>'];
  var tagstr = state.tags.map(function (tag) {
    return tagwrapper[0] + tag + tagwrapper[1];
  }).join(', ');
  set_el('tagnames', tagstr);

  // generate select box
  var unused = set_minus(Object.keys(state.tagkeys), state.tags).sort();
  var optionstr = '<option>' + unused.join('</option><option>') + '</option>';
  set_el('othertags', optionstr);
}

function render_all() {
  render$1();
  render_conversation(convo);
  showtags();
}

/*global Dagoba */

var G = Dagoba.graph();
function addtag(tag) {
  state.tags.push(tag);
  G = Dagoba.graph();
  fact_to_graph(state.facts);
  render_all();
}

function removetag(tag) {
  var index = state.tags.indexOf(tag);
  if (index === -1) return undefined;

  state.tags.splice(index, 1);
  G = Dagoba.graph();
  fact_to_graph(state.facts);
  render_all();
}

// function reset_graph() {
//   G = Dagoba.graph()
// }

function add_data(cb) {
  get_facts_from_server(function (facts) {
    cb(fact_to_graph(capture_facts(facts)));
  });
}

function capture_facts(facts) {
  state.facts = facts;
  return facts;
}

function fact_to_graph(facts) {
  /*
    data model:
   user: id
   action: add/remove/edit
   type: node/edge
   tags: [...]
   org: id
   [maybe other stats can live here?]
   data:
   node: {id, name, type, cat...}
   edge: {_in, _out, type, label}
    */

  var tree = factor_facts(filter_facts(facts));
  state.tagkeys = get_tagkeys(facts);

  tree.nodes.add.forEach(function (node) {
    var fun = window['add_' + node.cat]; // FIXME: ugh erk yuck poo
    if (!fun) return undefined;
    fun(node.type, node);
  });

  tree.edges.add.forEach(function (edge) {
    // we need to delay these so the nodes are all in place (sometimes the facts get added in weird orders)
    add_edge(edge.type, edge._out, edge._in, edge);
  });

  tree.nodes.edit.forEach(function (node) {
    // FIXME: what on earth is this??? should it be G.edit?
    // RM.graph.edit(node) //////
  });
}

function get_tagkeys(facts) {
  var keys = {};
  facts.forEach(function (fact) {
    ~(fact.tags || []).forEach(function (tag) {
      keys[tag] = true;
    });
  });
  return keys;
}

function filter_facts(facts) {
  facts = facts.filter(function (fact) {
    return !!set_intersect(fact.tags, state.tags).length; // THINK: this implies no empty tag arrays (so 'plain' as default?)
  });

  return facts;
}

function factor_facts(facts) {
  var tree = { nodes: { add: [], edit: [], remove: [] }, edges: { add: [], edit: [], remove: [] } };
  facts.forEach(function (fact) {
    // var branch = tree[fact.type+'s']
    // var list = branch[fact.action] || []
    // if(!branch[fact.action])
    //   branch[fact.action] = list
    var list = tree[fact.type + 's'][fact.action]; // TODO: error handling

    // var item = clone(fact.data)
    var item = fact.data; // THINK: is mutating here okay?
    item.org = fact.org;
    item.user = fact.user;
    item.tags = fact.tags;
    list.push(item);
  });
  return tree;
}

function set_intersect(xs, ys) {
  return xs.filter(function (x) {
    return ys.indexOf(x) !== -1;
  });
}

///////////////////////// DOM GLUE ///////////////////////////////


function do_the_glue() {

  el('login').addEventListener('submit', login);

  el('addtag').addEventListener('submit', submit_addtag);

  el('the-conversation').addEventListener('submit', submit_convo);

  el('sentences').addEventListener('mouseover', activate_highlighter);
  el('sentences').addEventListener('mouseout', deactivate_highlighter);
  el('sentences').addEventListener('keyup', keyup_sentences);
  el('sentences').addEventListener('click', click_sentences);

  el('tagnames').addEventListener('click', click_tagnames);
  el('tagnames').addEventListener('mouseover', mouseover_tagnames);
  el('tagnames').addEventListener('mouseout', mouseout_tagnames);

  document.addEventListener('keydown', global_keydown);
}

///////////////////// END DOM GLUE ///////////////////////////////


// package and expose some functionality for the view side,
// and create outward-facing bindings to spin everything up.


// init network load
// expose rendering functions
// create dom hooks on demand as html is rendered


// TODO: partition incoming bleep bloops by action
// TODO: build edit functions
// TODO: build remove functions
// TODO: ask user for email address
// TODO: show current tags
// TODO: allow changing of tags
// TODO: allow multitag views
// TODO: add all tags on server
// TODO: try to get an additional compaction in

// TODO: consolidate like-named nodes
// TODO: consolidate email addresses on server
// TODO: copy tags into url


// INIT


// TODO: break this up a little so the logic is clearer

function init$$1() {
  do_the_glue();

  if (window.location.host === "127.0.0.1") {
    if (window.location.hash) state.safe_mode = window.location.hash.slice(1);else state.safe_mode = true;
  }

  if (window.location.search) {
    state.query = window.location.search.substr(1).split('&').reduce(function (acc, pair) {
      var p = pair.split('=');
      acc[p[0]] = p[1];
      return acc;
    }, {});
    if (state.query.tag) state.tags = [state.query.tag];else if (state.query.tags) state.tags = state.query.tags.split('|');
  }

  // G = Dagoba.graph()

  init$1();

  function cb() {
    render_all();
    state.loading = false; // TODO: get rid of this somehow
  }

  add_data(cb);

  setTimeout(function () {
    render$1();
  }, 111);
}

init$$1();

/**
 * 
 * The Entry point to all of Ripplemap. (RM)
 * Creates the sidebar for controlling the RM. (built with Preact, see src/Sidebar)
 * Mounts RM to the dom using `createRippleMap()` 
 */

render(h(Sidebar, null), document.getElementById('sidebar'));
// createRippleMap()
//# sourceMappingURL=bundle.js.map
