var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/.pnpm/rettime@0.11.11/node_modules/rettime/build/index.mjs
var index_exports = {};
__export(index_exports, {
  Emitter: () => Emitter,
  TypedEvent: () => TypedEvent
});
module.exports = __toCommonJS(index_exports);

// node_modules/.pnpm/rettime@0.11.11/node_modules/rettime/build/lens-list.mjs
var LensList = class {
  #list;
  #lens;
  constructor() {
    this.#list = [];
    this.#lens = /* @__PURE__ */ new Map();
  }
  get [Symbol.iterator]() {
    return this.#list[Symbol.iterator].bind(this.#list);
  }
  entries() {
    return this.#lens.entries();
  }
  /**
  * Return an order-sensitive list of values by the given key.
  */
  get(key) {
    return this.#lens.get(key) || [];
  }
  /**
  * Return an order-sensitive list of all values.
  */
  getAll() {
    return this.#list.map(([, value]) => value);
  }
  /**
  * Append a new value to the given key.
  */
  append(key, value) {
    this.#list.push([key, value]);
    this.#openLens(key, (list) => list.push(value));
  }
  /**
  * Prepend a new value to the given key.
  */
  prepend(key, value) {
    this.#list.unshift([key, value]);
    this.#openLens(key, (list) => list.unshift(value));
  }
  /**
  * Delete the value belonging to the given key.
  * Returns `true` if the value was present and removed, `false` otherwise.
  */
  delete(key, value) {
    if (this.size === 0) return false;
    const values = this.#lens.get(key);
    if (!values) return false;
    const index = values.indexOf(value);
    if (index === -1) return false;
    values.splice(index, 1);
    this.#list.splice(this.#list.findIndex((item) => item[0] === key && item[1] === value), 1);
    return true;
  }
  /**
  * Delete all values belogning to the given key.
  */
  deleteAll(key) {
    if (this.size === 0) return;
    this.#list = this.#list.filter((item) => item[0] !== key);
    this.#lens.delete(key);
  }
  get size() {
    return this.#list.length;
  }
  clear() {
    if (this.size === 0) return;
    this.#list.length = 0;
    this.#lens.clear();
  }
  #openLens(key, setter) {
    setter(this.#lens.get(key) || this.#lens.set(key, []).get(key));
  }
};

// node_modules/.pnpm/rettime@0.11.11/node_modules/rettime/build/index.mjs
var kDefaultPrevented = /* @__PURE__ */ Symbol("kDefaultPrevented");
var kPropagationStopped = /* @__PURE__ */ Symbol("kPropagationStopped");
var kImmediatePropagationStopped = /* @__PURE__ */ Symbol("kImmediatePropagationStopped");
var TypedEvent = class extends MessageEvent {
  /**
  * @note Keep a placeholder property with the return type
  * because the type must be set somewhere in order to be
  * correctly associated and inferred from the event.
  */
  #returnType;
  [kDefaultPrevented];
  [kPropagationStopped];
  [kImmediatePropagationStopped];
  constructor(...args) {
    super(args[0], args[1]);
    this[kDefaultPrevented] = false;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented];
  }
  preventDefault() {
    super.preventDefault();
    this[kDefaultPrevented] = true;
  }
  stopImmediatePropagation() {
    super.stopImmediatePropagation();
    this[kImmediatePropagationStopped] = true;
  }
};
var Emitter = class {
  #listeners;
  #listenerOptions;
  #listenerAbortCleanups;
  #typelessListeners;
  #hookListeners;
  #hookListenerOptions;
  #hookListenerAbortCleanups;
  hooks;
  constructor() {
    this.#listeners = new LensList();
    this.#listenerOptions = /* @__PURE__ */ new WeakMap();
    this.#listenerAbortCleanups = /* @__PURE__ */ new WeakMap();
    this.#typelessListeners = /* @__PURE__ */ new WeakSet();
    this.#hookListeners = new LensList();
    this.#hookListenerOptions = /* @__PURE__ */ new WeakMap();
    this.#hookListenerAbortCleanups = /* @__PURE__ */ new WeakMap();
    this.hooks = {
      on: (hook, callback, options) => {
        if (options?.signal?.aborted) return;
        if (options?.once) {
          const original = callback;
          const wrapper = ((...args) => {
            this.#deleteHookListener(hook, wrapper);
            return original(...args);
          });
          callback = wrapper;
        }
        this.#hookListeners.append(hook, callback);
        if (options) this.#hookListenerOptions.set(callback, options);
        if (options?.signal) {
          const { signal } = options;
          const onAbort = () => {
            this.#deleteHookListener(hook, callback);
          };
          signal.addEventListener("abort", onAbort, { once: true });
          this.#hookListenerAbortCleanups.set(callback, () => {
            signal.removeEventListener("abort", onAbort);
          });
        }
      },
      removeListener: (hook, callback) => {
        this.#deleteHookListener(hook, callback);
      }
    };
  }
  #deleteHookListener(hook, callback) {
    this.#hookListeners.delete(hook, callback);
    const cleanup = this.#hookListenerAbortCleanups.get(callback);
    if (cleanup) {
      cleanup();
      this.#hookListenerAbortCleanups.delete(callback);
    }
  }
  #deleteListener(type, listener) {
    const removed = this.#listeners.delete(type, listener);
    const cleanup = this.#listenerAbortCleanups.get(listener);
    if (cleanup) {
      cleanup();
      this.#listenerAbortCleanups.delete(listener);
    }
    return removed;
  }
  /**
  * Adds a listener for the given event type.
  */
  on(type, listener, options) {
    this.#addListener(type, listener, options);
    return this;
  }
  /**
  * Adds a one-time listener for the given event type.
  */
  once(type, listener, options) {
    return this.on(type, listener, {
      ...options || {},
      once: true
    });
  }
  /**
  * Prepends a listener for the given event type.
  */
  earlyOn(type, listener, options) {
    this.#addListener(type, listener, options, "prepend");
    return this;
  }
  /**
  * Prepends a one-time listener for the given event type.
  */
  earlyOnce(type, listener, options) {
    return this.earlyOn(type, listener, {
      ...options || {},
      once: true
    });
  }
  /**
  * Emits the given typed event.
  *
  * @returns {boolean} Returns `true` if the event had any listeners, `false` otherwise.
  */
  emit(event) {
    if (this.#listeners.size === 0) return false;
    const hasListeners = this.listenerCount(event.type) > 0;
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#matchListeners(event.type)) {
      if (proxiedEvent.event[kPropagationStopped] != null && proxiedEvent.event[kPropagationStopped] !== this) {
        proxiedEvent.revoke();
        return false;
      }
      if (proxiedEvent.event[kImmediatePropagationStopped]) break;
      this.#callListener(proxiedEvent.event, listener);
    }
    proxiedEvent.revoke();
    return hasListeners;
  }
  /**
  * Emits the given typed event and returns a promise that resolves
  * when all the listeners for that event have settled.
  *
  * @returns {Promise<Array<Emitter.ListenerReturnType>>} A promise that resolves
  * with the return values of all listeners.
  */
  async emitAsPromise(event) {
    if (this.#listeners.size === 0) return [];
    const pendingListeners = [];
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#matchListeners(event.type)) {
      if (proxiedEvent.event[kPropagationStopped] != null && proxiedEvent.event[kPropagationStopped] !== this) {
        proxiedEvent.revoke();
        return [];
      }
      if (proxiedEvent.event[kImmediatePropagationStopped]) break;
      const returnValue = await Promise.resolve(this.#callListener(proxiedEvent.event, listener));
      if (!this.#isTypelessListener(listener)) pendingListeners.push(returnValue);
    }
    proxiedEvent.revoke();
    return Promise.allSettled(pendingListeners).then((results) => {
      return results.map((result) => result.status === "fulfilled" ? result.value : result.reason);
    });
  }
  /**
  * Emits the given event and returns a generator that yields
  * the result of each listener in the order of their registration.
  * This way, you stop exhausting the listeners once you get the expected value.
  */
  *emitAsGenerator(event) {
    if (this.#listeners.size === 0) return;
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#matchListeners(event.type)) {
      if (proxiedEvent.event[kPropagationStopped] != null && proxiedEvent.event[kPropagationStopped] !== this) {
        proxiedEvent.revoke();
        return;
      }
      if (proxiedEvent.event[kImmediatePropagationStopped]) break;
      const returnValue = this.#callListener(proxiedEvent.event, listener);
      if (!this.#isTypelessListener(listener)) yield returnValue;
    }
    proxiedEvent.revoke();
  }
  /**
  * Removes a listener for the given event type.
  */
  removeListener(type, listener) {
    const options = this.#listenerOptions.get(listener);
    if (!this.#deleteListener(type, listener)) return;
    for (const hook of this.#hookListeners.get("removeListener").slice()) hook(type, listener, options);
  }
  /**
  * Removes all listeners for the given event type.
  * If no event type is provided, removes all existing listeners.
  */
  removeAllListeners(type) {
    if (type == null) {
      for (const [listenerType, listeners$1] of this.#listeners.entries()) while (listeners$1.length > 0) this.removeListener(listenerType, listeners$1[0]);
      for (const [hookType, hookListener] of [...this.#hookListeners]) if (!this.#hookListenerOptions.get(hookListener)?.persist) this.#deleteHookListener(hookType, hookListener);
      return;
    }
    const listeners = this.listeners(type);
    while (listeners.length > 0) this.removeListener(type, listeners[0]);
  }
  /**
  * Returns the list of listeners for the given event type.
  * If no even type is provided, returns all listeners.
  */
  listeners(type) {
    if (type == null) return this.#listeners.getAll();
    return this.#listeners.get(type);
  }
  /**
  * Returns the number of listeners for the given event type.
  * If no even type is provided, returns the total number of listeners.
  */
  listenerCount(type) {
    if (type == null) return this.#listeners.size;
    return this.listeners(type).length;
  }
  #addListener(type, listener, options, insertMode = "append") {
    if (options?.signal?.aborted) return;
    for (const hook of this.#hookListeners.get("newListener").slice()) hook(type, listener, options);
    if (type === "*") this.#typelessListeners.add(listener);
    if (insertMode === "prepend") this.#listeners.prepend(type, listener);
    else this.#listeners.append(type, listener);
    if (options) {
      this.#listenerOptions.set(listener, options);
      if (options.signal) {
        const { signal } = options;
        const onAbort = () => {
          this.removeListener(type, listener);
        };
        signal.addEventListener("abort", onAbort, { once: true });
        this.#listenerAbortCleanups.set(listener, () => {
          signal.removeEventListener("abort", onAbort);
        });
      }
    }
  }
  #proxyEvent(event) {
    const { stopPropagation } = event;
    event.stopPropagation = () => {
      event[kPropagationStopped] = this;
      stopPropagation.call(event);
    };
    return {
      event,
      revoke() {
        event.stopPropagation = stopPropagation;
      }
    };
  }
  #callListener(event, listener) {
    for (const hook of this.#hookListeners.get("beforeEmit").slice()) if (hook(event) === false) return;
    const returnValue = listener.call(this, event);
    const options = this.#listenerOptions.get(listener);
    if (options?.once) {
      const type = this.#isTypelessListener(listener) ? "*" : event.type;
      if (this.#deleteListener(type, listener)) for (const hook of this.#hookListeners.get("removeListener").slice()) hook(type, listener, options);
    }
    return returnValue;
  }
  /**
  * Return a list of all event listeners relevant for the given event type.
  * This includes the explicit event listeners and also typeless event listeners.
  *
  * @note Snapshot the matching listeners before yielding. Listeners can add or
  * remove other listeners during emission (e.g. `earlyOn` unshifts `#list`),
  * which would otherwise shift the live iterator and re-yield prior entries.
  */
  *#matchListeners(type) {
    const snapshot = [];
    for (const [key, listener] of this.#listeners) if (key === "*" || key === type) snapshot.push(listener);
    yield* snapshot;
  }
  #isTypelessListener(listener) {
    return this.#typelessListeners.has(listener);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Emitter,
  TypedEvent
});
