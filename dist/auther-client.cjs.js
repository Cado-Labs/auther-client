'use strict';

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }
  return target;
}
function _regeneratorRuntime() {
  _regeneratorRuntime = function () {
    return exports;
  };
  var exports = {},
    Op = Object.prototype,
    hasOwn = Op.hasOwnProperty,
    $Symbol = "function" == typeof Symbol ? Symbol : {},
    iteratorSymbol = $Symbol.iterator || "@@iterator",
    asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator",
    toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
  function define(obj, key, value) {
    return Object.defineProperty(obj, key, {
      value: value,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }), obj[key];
  }
  try {
    define({}, "");
  } catch (err) {
    define = function (obj, key, value) {
      return obj[key] = value;
    };
  }
  function wrap(innerFn, outerFn, self, tryLocsList) {
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
      generator = Object.create(protoGenerator.prototype),
      context = new Context(tryLocsList || []);
    return generator._invoke = function (innerFn, self, context) {
      var state = "suspendedStart";
      return function (method, arg) {
        if ("executing" === state) throw new Error("Generator is already running");
        if ("completed" === state) {
          if ("throw" === method) throw arg;
          return doneResult();
        }
        for (context.method = method, context.arg = arg;;) {
          var delegate = context.delegate;
          if (delegate) {
            var delegateResult = maybeInvokeDelegate(delegate, context);
            if (delegateResult) {
              if (delegateResult === ContinueSentinel) continue;
              return delegateResult;
            }
          }
          if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) {
            if ("suspendedStart" === state) throw state = "completed", context.arg;
            context.dispatchException(context.arg);
          } else "return" === context.method && context.abrupt("return", context.arg);
          state = "executing";
          var record = tryCatch(innerFn, self, context);
          if ("normal" === record.type) {
            if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue;
            return {
              value: record.arg,
              done: context.done
            };
          }
          "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg);
        }
      };
    }(innerFn, self, context), generator;
  }
  function tryCatch(fn, obj, arg) {
    try {
      return {
        type: "normal",
        arg: fn.call(obj, arg)
      };
    } catch (err) {
      return {
        type: "throw",
        arg: err
      };
    }
  }
  exports.wrap = wrap;
  var ContinueSentinel = {};
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });
  var getProto = Object.getPrototypeOf,
    NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function (method) {
      define(prototype, method, function (arg) {
        return this._invoke(method, arg);
      });
    });
  }
  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if ("throw" !== record.type) {
        var result = record.arg,
          value = result.value;
        return value && "object" == typeof value && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) {
          invoke("next", value, resolve, reject);
        }, function (err) {
          invoke("throw", err, resolve, reject);
        }) : PromiseImpl.resolve(value).then(function (unwrapped) {
          result.value = unwrapped, resolve(result);
        }, function (error) {
          return invoke("throw", error, resolve, reject);
        });
      }
      reject(record.arg);
    }
    var previousPromise;
    this._invoke = function (method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function (resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }
      return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
    };
  }
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (undefined === method) {
      if (context.delegate = null, "throw" === context.method) {
        if (delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel;
        context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method");
      }
      return ContinueSentinel;
    }
    var record = tryCatch(method, delegate.iterator, context.arg);
    if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
    var info = record.arg;
    return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel);
  }
  function pushTryEntry(locs) {
    var entry = {
      tryLoc: locs[0]
    };
    1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
  }
  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal", delete record.arg, entry.completion = record;
  }
  function Context(tryLocsList) {
    this.tryEntries = [{
      tryLoc: "root"
    }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
  }
  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) return iteratorMethod.call(iterable);
      if ("function" == typeof iterable.next) return iterable;
      if (!isNaN(iterable.length)) {
        var i = -1,
          next = function next() {
            for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next;
            return next.value = undefined, next.done = !0, next;
          };
        return next.next = next;
      }
    }
    return {
      next: doneResult
    };
  }
  function doneResult() {
    return {
      value: undefined,
      done: !0
    };
  }
  return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) {
    var ctor = "function" == typeof genFun && genFun.constructor;
    return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name));
  }, exports.mark = function (genFun) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
  }, exports.awrap = function (arg) {
    return {
      __await: arg
    };
  }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    void 0 === PromiseImpl && (PromiseImpl = Promise);
    var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
    return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
      return result.done ? result.value : iter.next();
    });
  }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () {
    return this;
  }), define(Gp, "toString", function () {
    return "[object Generator]";
  }), exports.keys = function (object) {
    var keys = [];
    for (var key in object) keys.push(key);
    return keys.reverse(), function next() {
      for (; keys.length;) {
        var key = keys.pop();
        if (key in object) return next.value = key, next.done = !1, next;
      }
      return next.done = !0, next;
    };
  }, exports.values = values, Context.prototype = {
    constructor: Context,
    reset: function (skipTempReset) {
      if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined);
    },
    stop: function () {
      this.done = !0;
      var rootRecord = this.tryEntries[0].completion;
      if ("throw" === rootRecord.type) throw rootRecord.arg;
      return this.rval;
    },
    dispatchException: function (exception) {
      if (this.done) throw exception;
      var context = this;
      function handle(loc, caught) {
        return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught;
      }
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i],
          record = entry.completion;
        if ("root" === entry.tryLoc) return handle("end");
        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc"),
            hasFinally = hasOwn.call(entry, "finallyLoc");
          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
          } else {
            if (!hasFinally) throw new Error("try statement without catch or finally");
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          }
        }
      }
    },
    abrupt: function (type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }
      finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
      var record = finallyEntry ? finallyEntry.completion : {};
      return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
    },
    complete: function (record, afterLoc) {
      if ("throw" === record.type) throw record.arg;
      return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel;
    },
    finish: function (finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
      }
    },
    catch: function (tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if ("throw" === record.type) {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }
      throw new Error("illegal catch attempt");
    },
    delegateYield: function (iterable, resultName, nextLoc) {
      return this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      }, "next" === this.method && (this.arg = undefined), ContinueSentinel;
    }
  }, exports;
}
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}
function _asyncToGenerator(fn) {
  return function () {
    var self = this,
      args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);
      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }
      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }
      _next(undefined);
    });
  };
}
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}
function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}
function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;
  var _s, _e;
  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);
      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }
  return _arr;
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _classPrivateFieldGet(receiver, privateMap) {
  var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get");
  return _classApplyDescriptorGet(receiver, descriptor);
}
function _classExtractFieldDescriptor(receiver, privateMap, action) {
  if (!privateMap.has(receiver)) {
    throw new TypeError("attempted to " + action + " private field on non-instance");
  }
  return privateMap.get(receiver);
}
function _classApplyDescriptorGet(receiver, descriptor) {
  if (descriptor.get) {
    return descriptor.get.call(receiver);
  }
  return descriptor.value;
}
function _checkPrivateRedeclaration(obj, privateCollection) {
  if (privateCollection.has(obj)) {
    throw new TypeError("Cannot initialize the same private elements twice on an object");
  }
}
function _classPrivateFieldInitSpec(obj, privateMap, value) {
  _checkPrivateRedeclaration(obj, privateMap);
  privateMap.set(obj, value);
}

var decodeB64 = function decodeB64(str) {
  return atob(str).split("");
};
var encodeURI = function encodeURI(str) {
  var encoded = str.map(function (c) {
    return "%".concat(c.charCodeAt(0).toString(16));
  });
  return encoded.join("");
};
var decodeURI = function decodeURI(str) {
  var decodedB64 = decodeB64(str);
  var encodedURI = encodeURI(decodedB64);
  return decodeURIComponent(encodedURI);
};

var decode = function decode(token) {
  var structure = token.split(".");
  var _structure = _slicedToArray(structure, 3),
    header = _structure[0],
    payload = _structure[1],
    signature = _structure[2];
  if (!header || !payload || !signature) {
    throw new Error("token.invalid_token");
  }
  var decodedPayload = decodeURI(payload);
  var decodedHeader = decodeURI(header);
  return {
    header: JSON.parse(decodedHeader),
    payload: JSON.parse(decodedPayload),
    signature: signature
  };
};
var verify = function verify(token) {
  if (!token) {
    throw new Error("token.not_found");
  }
  var _decode = decode(token),
    payload = _decode.payload;
  if (!payload.iat || !payload.exp) {
    throw new Error("token.invalid");
  }
  var currentTime = new Date().getTime();
  if (currentTime > payload.exp * 1000) {
    throw new Error("token.expired");
  }
  return token;
};

var jwt = /*#__PURE__*/Object.freeze({
  __proto__: null,
  decode: decode,
  verify: verify
});

var doFetch = function doFetch(url) {
  return function (params) {
    var path = params.path,
      body = params.body,
      _params$method = params.method,
      method = _params$method === void 0 ? "POST" : _params$method,
      _params$headers = params.headers,
      headers = _params$headers === void 0 ? "" : _params$headers;
    var buildHeaders = function buildHeaders() {
      var defaultHeaders = {
        "Content-Type": "application/json",
        Accept: "application/json"
      };
      return _objectSpread2(_objectSpread2({}, defaultHeaders), headers);
    };
    var buildBody = function buildBody() {
      if (!body) return null;
      return JSON.stringify(body);
    };
    var buildUrl = function buildUrl() {
      return new URL(path, url).toString();
    };
    var requestUrl = buildUrl();
    var requestHeaders = buildHeaders();
    var requestBody = buildBody();
    return fetch(requestUrl, {
      method: method,
      headers: requestHeaders,
      body: requestBody
    });
  };
};

// TODO: delete
var ONE_SECOND_MS = 1000;
// const ONE_MINUTE_MS = 60 * 1000
var ONE_DAY_MS = 24 * 60 * 60 * 1000;
var _location = /*#__PURE__*/new WeakMap();
var _INITIATE_PATH = /*#__PURE__*/new WeakMap();
var _REVOKE_PATH = /*#__PURE__*/new WeakMap();
var _REFRESH_PATH = /*#__PURE__*/new WeakMap();
var _LOGIN_PATH = /*#__PURE__*/new WeakMap();
var _buildOauthUrl = /*#__PURE__*/new WeakMap();
var AutherClient = /*#__PURE__*/_createClass(function AutherClient(_ref) {
  var _this = this;
  var redirectUri = _ref.redirectUri,
    autherUrl = _ref.autherUrl,
    http = _ref.http,
    appcode = _ref.appcode,
    logger = _ref.logger;
  _classCallCheck(this, AutherClient);
  _classPrivateFieldInitSpec(this, _location, {
    writable: true,
    value: window.location
  });
  _classPrivateFieldInitSpec(this, _INITIATE_PATH, {
    writable: true,
    value: "/tokens/initiate"
  });
  _classPrivateFieldInitSpec(this, _REVOKE_PATH, {
    writable: true,
    value: "/tokens/revoke"
  });
  _classPrivateFieldInitSpec(this, _REFRESH_PATH, {
    writable: true,
    value: "/tokens/refresh"
  });
  _classPrivateFieldInitSpec(this, _LOGIN_PATH, {
    writable: true,
    value: "/login"
  });
  _classPrivateFieldInitSpec(this, _buildOauthUrl, {
    writable: true,
    value: function value() {
      var returnUrl = new URL(_this.redirectUri);
      var redirectUrl = new URL(_classPrivateFieldGet(_this, _LOGIN_PATH), _this.autherUrl);
      redirectUrl.searchParams.append("return_url", returnUrl);
      redirectUrl.searchParams.append("appcode", _this.appcode);
      return redirectUrl.toString();
    }
  });
  _defineProperty(this, "login", function () {
    return _classPrivateFieldGet(_this, _location).replace(_classPrivateFieldGet(_this, _buildOauthUrl).call(_this));
  });
  _defineProperty(this, "logout", function (accessToken) {
    if (!accessToken) {
      throw new Error("invalid.access_token");
    }
    return _this.http({
      path: _classPrivateFieldGet(_this, _REVOKE_PATH),
      headers: {
        Authorization: "Bearer ".concat(accessToken)
      }
    });
  });
  _defineProperty(this, "getTokens", function (authorizationCode) {
    if (!authorizationCode) {
      throw new Error("invalid.authorization_code");
    }
    return _this.http({
      path: _classPrivateFieldGet(_this, _INITIATE_PATH),
      body: {
        authorization_code: authorizationCode
      }
    });
  });
  _defineProperty(this, "updateTokens", function (refreshToken) {
    if (!refreshToken) {
      throw new Error("invalid.refresh_token");
    }
    return _this.http({
      path: _classPrivateFieldGet(_this, _REFRESH_PATH),
      body: {
        refreshToken: refreshToken
      }
    });
  });
  _defineProperty(this, "refreshByTimer", function (_ref2) {
    var fetchTokens = _ref2.fetchTokens,
      saveTokens = _ref2.saveTokens;
    var _fetchTokens = fetchTokens(),
      accessToken = _fetchTokens.accessToken;
    verify(accessToken);
    var decodedToken = decode(accessToken);
    var tokenExpDateMs = decodedToken.payload.exp * 1000;
    var refreshTimeout = (tokenExpDateMs - new Date()) / 2;

    // TODO: delete
    if (refreshTimeout < ONE_SECOND_MS) {
      refreshTimeout = ONE_SECOND_MS;
    }

    // if (refreshTimeout < ONE_MINUTE_MS) {
    //   refreshTimeout = ONE_MINUTE_MS
    // }

    if (refreshTimeout > ONE_DAY_MS) {
      refreshTimeout = ONE_DAY_MS;
    }
    var tokenExpDate = new Date(tokenExpDateMs);
    var refreshDate = new Date(Date.now() + refreshTimeout);
    _this.logger.log("Token will expire at ".concat(tokenExpDate, " [").concat(tokenExpDate.toUTCString(), "]"));
    _this.logger.log("Token will be refreshed at ".concat(refreshDate, " [").concat(refreshDate.toUTCString(), "]"));
    setTimeout(function () {
      try {
        _this.refresh({
          fetchTokens: fetchTokens,
          saveTokens: saveTokens
        });
      } catch (error) {
        _this.logger.error("Error during tokens refreshing at ".concat(new Date(), " [").concat(new Date().toUTCString(), "]"));
        throw error;
      }
    }, refreshTimeout);
  });
  _defineProperty(this, "refresh", /*#__PURE__*/function () {
    var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(_ref3) {
      var fetchTokens, saveTokens, currentTime, _fetchTokens2, refreshToken, response, tokens;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              fetchTokens = _ref3.fetchTokens, saveTokens = _ref3.saveTokens;
              currentTime = "".concat(new Date(), " [").concat(new Date().toUTCString(), "]");
              _fetchTokens2 = fetchTokens(), refreshToken = _fetchTokens2.refreshToken;
              _context.next = 5;
              return _this.updateTokens(refreshToken);
            case 5:
              response = _context.sent;
              _context.next = 8;
              return response.json();
            case 8:
              tokens = _context.sent;
              saveTokens(tokens);
              _this.logger.log("Access token has been refreshed successfully at ".concat(currentTime));
              _this.logger.log("Refresh token has been refreshed successfully at ".concat(currentTime));
              _this.refreshByTimer({
                fetchTokens: fetchTokens,
                saveTokens: saveTokens
              });
            case 13:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));
    return function (_x) {
      return _ref4.apply(this, arguments);
    };
  }());
  _defineProperty(this, "authWithRefresh", /*#__PURE__*/function () {
    var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(_ref5) {
      var fetchTokens, saveTokens, immediate, _fetchTokens3, refreshToken;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              fetchTokens = _ref5.fetchTokens, saveTokens = _ref5.saveTokens, immediate = _ref5.immediate;
              _fetchTokens3 = fetchTokens(), refreshToken = _fetchTokens3.refreshToken;
              verify(refreshToken);
              if (!immediate) {
                _context2.next = 8;
                break;
              }
              _context2.next = 6;
              return _this.refresh({
                fetchTokens: fetchTokens,
                saveTokens: saveTokens
              });
            case 6:
              _context2.next = 9;
              break;
            case 8:
              _this.refreshByTimer({
                fetchTokens: fetchTokens,
                saveTokens: saveTokens
              });
            case 9:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));
    return function (_x2) {
      return _ref6.apply(this, arguments);
    };
  }());
  _defineProperty(this, "authentication", /*#__PURE__*/function () {
    var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(_ref7) {
      var fetchTokens, saveTokens, _fetchTokens4, accessToken;
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              fetchTokens = _ref7.fetchTokens, saveTokens = _ref7.saveTokens;
              _fetchTokens4 = fetchTokens(), accessToken = _fetchTokens4.accessToken;
              _context3.prev = 2;
              verify(accessToken);
              _context3.next = 12;
              break;
            case 6:
              _context3.prev = 6;
              _context3.t0 = _context3["catch"](2);
              // TODO: delete
              _this.logger.error("err: ", _context3.t0);
              _context3.next = 11;
              return _this.authWithRefresh({
                fetchTokens: fetchTokens,
                saveTokens: saveTokens,
                immediate: true
              });
            case 11:
              return _context3.abrupt("return");
            case 12:
              // TODO: delete
              _this.logger.log("fine 💚💚💚💚");
              return _context3.abrupt("return", _this.authWithRefresh({
                fetchTokens: fetchTokens,
                saveTokens: saveTokens,
                immediate: false
              }));
            case 14:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, null, [[2, 6]]);
    }));
    return function (_x3) {
      return _ref8.apply(this, arguments);
    };
  }());
  this.redirectUri = redirectUri;
  this.autherUrl = autherUrl;
  this.http = http;
  this.appcode = appcode;
  this.logger = logger;
});

var _default = /*#__PURE__*/function () {
  function _default() {
    _classCallCheck(this, _default);
  }
  _createClass(_default, null, [{
    key: "init",
    value: function init(_ref) {
      var redirectUri = _ref.redirectUri,
        autherUrl = _ref.autherUrl,
        appcode = _ref.appcode,
        _ref$logger = _ref.logger,
        logger = _ref$logger === void 0 ? console : _ref$logger;
      return new AutherClient({
        http: doFetch(autherUrl),
        redirectUri: redirectUri,
        autherUrl: autherUrl,
        appcode: appcode,
        logger: logger
      });
    }
  }]);
  return _default;
}();

exports.AutherClient = _default;
exports.token = jwt;
