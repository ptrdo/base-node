"use strict";
var comps = window.comps || {};
/**
 * notifier is singleton class for management and execution of notifications to the user.
 * Notifications are queued, so every one will show subsequent to any previous one(s) that may be in process.
 *
 * Note: No dependencies here (e/g jQuery) because user may need to be notified of such.
 *
 * USAGE: window.comps.notifier.toast(message, type, pause, delay); OR Lodash: _.invoke(window, "comps.notifier.toast", "Hello World");
 * NOTICE: A callback is the final argument and can usurp null defaults, e/g comps.notifier.toast("Using defaults!", function(success){ console.log("Messaged?", success); });
 *
 * @param {String} message // the text to message to the user in a notification. A line-break can be forced with a "\n".
 * @param {String} type // "error", "warning", "alert", "success", "custom" (a CSS class), null defaults to "alert".
 * @param {Number|String} pause // duration of view for notification, use SPAN.terms OR integer (ms) OR null (computes a value perCharacterFactor) OR Infinity (persists toast until closed).
 * @param {Number|String} delay // period before notification is put into view, use SPAN.terms OR integer (ms) OR null (TIME.immediate) OR 0 which bypasses queue and messages immediately.
 * @param {Function} callback // optional code to execute when message has transpired. Passes a true if messaged, of false if not (e/g a duplicate was in queue).
 */

/* TODO: implement an alert/prompt failsafe */
/* TODO: integrate with comps.logger or provide an independent, user-accessible log */
/* TODO: provide a means to send a sequence of messages at once */

comps.notifier = function (options) {

  /* MANDATORIES */

  var element;

  var defaults = {
    name: "Notifier",
    label: "notifier",
    selector: "#notifier" /* code assumes selector is an id */
  };

  /* PRIVATE MEMBERS */

  /**
   * @property {HTMLElement} messageElement // the currently rendered SPAN {for text)
   * @property {HTMLElement} clickerElement // the currently rendered BUTTON (to close}
   * @property {Integer} transition // the milliseconds of CSS transition duration
   * @property {Boolean} active // when true, a notification is in process
   * @property {Boolean} echo // when true, also send message to browser console.log/warn/error
   * @property {Boolean} trace // when true, sends computed toasts values to console.log
   * @property {Boolean} bubbler // when true, broadcasts every toast to window.comps.bubbler.addItem()
   * @property {Boolean} reiterate // when true, will show messages even if aleady in view or queue
   * @property {Array} queue // a collection of the messages in queue for toast
   * @property {Array} currentToast // containing the current message in process of toast
   * @property {Array} previousToast // containing the most recent message in process of toast
   */
  var messageElement,
      clickerElement,
      transition = 300,
      active = false,
      echo = false,
      trace = false,
      bubbler = false,
      reiterate = false,
      queue = [],
      currentToast = [],
      previousToast = [];

  /**
   * TYPE are the CSS classNames that style #notifier.
   */
  var TYPE = {
    error: "error",
    warning: "warning",
    alert: "alert",
    success: "success",
    persist: "persist",
    update: "update"
  };

  /**
   * TIME are the milliseconds configured for expanses of time.
   * @property delay // elapsed time between render and intro animation
   * @property brief // elapsed time of a "brief" (short) duration
   * @property pause // expased time when toast is in view to be read
   * @property extend // elapsed time of a "extend" (long) duration
   * @property persist // elapsed time of a "persist" (one hour) duration
   * @property immediate // elapsed time that is practically spontaneous
   * @property perCharacterFactor // computes sufficient duration to read a message
   */
  var TIME = {
    delay: 400,
    brief: 2000,
    pause: 3000,
    extend: 8000,
    persist: 1000 * 60 * 60,
    immediate: 300,
    perCharacterFactor: 100
  };

  /**
   * SPAN are @public string references of TIME
   */
  var SPAN = {
    brief: "brief",
    normal: "normal",
    extend: "extend",
    compute: "compute",
    getValue: function (term, msg) {
      if (/^\d+$/.test(term)) {
        return Math.max(TIME.immediate, Math.abs(parseInt(term)));
      } else if (term === Infinity) {
        return TIME.persist;
      } else {
        switch (term) {
          case this.brief:
            return TIME.brief;
          case this.normal:
            return TIME.pause;
          case this.extend:
            return TIME.extend;
          default:
            return !!msg && msg.length > 0
                ? Math.max(TIME.immediate, msg.length * TIME.perCharacterFactor)
                : TIME.pause;
        }
      }
    }
  };

  var timerStart = 0,
      timerShow = 0,
      timerDone = 0;

  /* MODEL & COLLECTION */

  var collection = [];
  var Model = function (text, type, pause, delay) {
    var id = Date.now();
    var user = "";
    var now = new Date();
    try {
      id = window.comps.util.generateGuid();
      user = window.comps.auth.getUserName();
    } catch (e) {
    }
    return {
      id: id,
      user: user,
      text: text,
      title: "toast " + type,
      type: type,
      pause: pause,
      delay: delay,
      created: now,
      href: window.location.hash
    }
  };

  var setCurrentToast = function (bits) {
    previousToast = currentToast.slice(0);
    currentToast = !!bits && Array.isArray(bits) ? bits.slice(0) : [];
  };

  /* PRIVATE METHODS */

  var go = function (bits) {

    /* compensate for prototype.apply */
    var txt,
        msg = bits[0],
        type = bits[1],
        pause = bits[2],
        delay = bits[3],
        callback = bits[4],
        width, offset,
        transitionHandler;

    active = true;
    setCurrentToast(bits);
    messageElement.innerHTML = "";
    element.setAttribute("style", "");

    msg.split("\n").forEach(function (line, i) {
      txt = document.createTextNode(line);
      if (!!i) {
        messageElement.appendChild(document.createElement("BR"));
      }
      messageElement.appendChild(txt);
    });

    for (var style in TYPE) {
      if (TYPE.hasOwnProperty(style)) {
        element.classList.remove(style);
      }
    }

    clearTimeout(timerStart);
    clearTimeout(timerShow);
    clearTimeout(timerDone);
    if (delay != TIME.immediate) {
      element.classList.remove("show");
    } else if (element.classList.contains("show")) {
      /* a notification going directly to the toast */
      transitionHandler = function (e) {
        element.classList.remove(TYPE.update);
        element.classList.add(TYPE.updated);
        element.removeEventListener("transitionend", transitionHandler);
      };
      element.addEventListener("transitionend", transitionHandler, true);
      element.classList.add(TYPE.update);
    }

    width = element.offsetWidth;
    offset = -Math.floor(width / 2) - 25;
    element.setAttribute("style", "width:" + width + "px;margin-left:" + offset + "px;");

    if (pause === TIME.persist) {
      element.classList.add(TYPE.persist);
    }

    element.classList.add(type);
    timerStart = setTimeout(function () {
      element.classList.add("show");
      timerShow = setTimeout(function () {
        element.classList.remove("show");
        timerDone = setTimeout(function () {
          active = false;
          callback(true);
          setCurrentToast([]);
          if (queue.length > 0) {
            go(queue.pop());
          }
        }, transition);
      }, pause);
    }, delay);

    if (echo) {
      switch (type) {
        case TYPE.error:
          console.error("comps.notifier:", msg);
          break;
        case TYPE.warning:
          console.warn("comps.notifier:", msg);
          break;
        default:
          console.log("comps.notifier:", msg);
      }
    }
  };

  /* PRIVATE UTILITIES */

  var isUnique = function (bits) {
    /* @param {array} bits, toast config (usually sans callback) */
    var bitsProfile = bits.slice(0, 4).toString();
    var unique = bitsProfile !== currentToast.slice(0, 4).toString();
    queue.forEach(function (queuedBits) {
      if (bitsProfile === queuedBits.slice(0, 4).toString()) {
        unique = false;
      }
    });
    return unique;
  };

  /* PRIVATE CONSTRUCTOR */

  var construct = function () {

    var ins, p, span, button;

    element = document.getElementById(defaults.selector.replace("#", ""));

    if (!element) {
      ins = document.createElement("ins");
      ins.setAttribute("id", defaults.selector.replace("#", ""));
      element = document.body.appendChild(ins);
    } else if (element.hasChildNodes()) {
      if (!!window.removeEventListener) {
        element.removeEventListener("click", closeHandler);
      } else if (!!window.detachEvent) {
        element.detachEvent("onclick", closeHandler);
      }
      while (!!element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }

    p = document.createElement("p");
    span = document.createElement("span");
    button = document.createElement("button");
    button.innerHTML = "&#215;";

    element.appendChild(p);
    p.appendChild(span);
    p.appendChild(button);

    messageElement = element.getElementsByTagName("SPAN")[0];
    clickerElement = element.getElementsByTagName("BUTTON")[0];
    if (!!window.addEventListener) {
      clickerElement.addEventListener("click", closeHandler, false);
    } else if (!!window.attachEvent) {
      clickerElement.attachEvent("onclick", closeHandler);
    }
  };

  /* PRIVATE HANDLERS */

  var closeHandler = function (event) {

    /* closes any currently running toast routine (queue will continue) */

    if (!!event) {
      event.stopPropagation();
    }

    clearTimeout(timerStart);
    clearTimeout(timerShow);
    clearTimeout(timerDone);
    element.classList.remove("show");

    setTimeout(function () {
      element.classList.remove("persist");
      active = false;
      setCurrentToast([]);
      if (queue.length > 0) {
        go(queue.pop());
      }
    }, transition);
  };


  /* INSTANTIATION */

  var initialize = function () {

    /* This self-executes upon instantiation... */

    if (!!options && Object.keys(options).length > 0) {
      /* passed options will usurp/extend defaults */
      for (var property in options) {
        if (options.hasOwnProperty(property)) {
          defaults[property] = options[property];
        }
      }
    }

    element = document.getElementById(defaults.selector.replace("#", ""));

    if (!element || (!!element && !element.hasChildNodes())) {
      setTimeout(construct, 0);
    } else {
      messageElement = element.getElementsByTagName("SPAN")[0];
      clickerElement = element.getElementsByTagName("BUTTON")[0];
      if (!messageElement || !clickerElement) {
        setTimeout(construct, 0);
      } else {
        if (!!window.addEventListener) {
          clickerElement.addEventListener("click", closeHandler, false);
        } else if (!!window.attachEvent) {
          clickerElement.attachEvent("onclick", closeHandler);
        }
      }
    }

  }();

  return {

    /* PUBLIC API */
    compsInterface: {
      data: {},
      events: [],
      defaults: defaults
    },

    init: function (overrides) {
      options = overrides;
      initialize();
      this.isInitialized = true;
    },

    isInitialized: false,

    toast: function (msg, type, pause, delay, callback) {

      /** USAGE: comps.notifier.toast(message, type, pause, delay); OR Lodash: _.invoke(window, "comps.notifier.toast", "Hello World");
       *  NOTICE: A callback is the final argument and can usurp null defaults, e/g comps.notifier.toast("Using defaults!", function(success){ console.log("Messaged?", success); });
       *
       *  @param {String} message // the text to message to the user in a notification. A newline character "\n" may be embedded to impose line-break(s).
       *  @param {String} type // "error", "warning", "alert", "success", "custom" (a CSS class), null defaults to "alert".
       *  @param {Number|String} pause // duration of view for notification, use SPAN.terms OR integer (ms) OR null (computes a value perCharacterFactor) OR Infinity (persists toast until closed).
       *  @param {Number|String} delay // period before notification is put into view, use SPAN.terms OR integer (ms) OR null (TIME.immediate) OR 0 which bypasses queue and messages immediately.
       *  @param {Function} callback // optional code to execute when message has transpired. Passes a true if messaged, of false if not (e/g a duplicate was in queue).
       */

      var t, p, d, c, model;

      if (!msg || !(/string/i.test(typeof msg))) {
        /* short-circuit bad info */
        console.error("comps.notifier could not process an input. Please fix.", msg);
        return false;
      }

      /* callback could be the last of any number of arguments */
      if (arguments[arguments.length - 1] instanceof Function) {
        c = arguments[arguments.length - 1];
        arguments[arguments.length - 1] = null;
      } else {
        c = function () {
        }; // noop
      }

      /* derive all other arguments, setting defaults as needed */
      t = !!type && ["error", "warning", "success"].indexOf(type) > -1 ? type : TYPE.alert,
          p = SPAN.getValue(pause, msg),
          d = !!delay ? SPAN.getValue(delay) : delay === 0 ? TIME.immediate : TIME.delay;

      if (reiterate || isUnique([msg, t, p, d])) {

        model = new Model(msg, t, p, d);
        collection.push(model);

        if (bubbler) {
          try {
            comps.bubbler.addItem(model);
          } catch (e) {
            console.warn("comps.notifier.toast(); could not find comps.bubbler.addItem();", e);
          }
        }

        if (trace) {
          console.log("toast", t, p, d);
        }

        if (active) {
          if (d === TIME.immediate) {
            go([msg, t, p, d, c]);
          } else {
            queue.unshift([msg, t, p, d, c]);
          }
        } else {
          go([msg, t, p, d, c]);
        }

      } else {
        c(false);
      }
      return true;
    },

    /**
     * toastOnce will preempt any message previously delivered to the current user.
     * @see notifier.toast() for full argument profile.
     * @returns {Boolean} true when messaging, false when previously messaged.
     */
    toastOnce: function (msg, type, pause, delay, callback) {
      var messaged = false;
      var user = "";
      try {
        user = window.comps.auth.getUserName();
      } catch (e) {
      }
      collection.forEach(function (item) {
        if (item.text === msg && item.type === type && item.user === user) {
          messaged = true;
        }
      });
      if (!messaged) {
        this.toast(msg, type, pause, delay, callback);
        return true;
      } else {
        return false;
      }
    },

    getCollection: function () {
      return collection;
    },

    close: closeHandler,

    toggleReiterate: function () {
      reiterate = !reiterate;
      return reiterate;
    },

    toggleEcho: function () {
      echo = !echo;
      return echo;
    },

    toggleTrace: function () {
      trace = !trace;
      return trace;
    },

    toggleBubbler: function () {
      bubbler = !bubbler;
      if (bubbler && collection.length > 0) {
        try {
          collection.forEach(function (item) {
            window.comps.bubbler.addItem(item);
          });
        } catch (e) {
          console.warn("comps.notifier.toggleBubbler(); could not find comps.bubbler.addItem();", e);
        }
      }
      return bubbler;
    },

    getTypes: function () {
      return TYPE;
    },

    getTimes: function () {
      return TIME;
    },

    getSpans: function () {
      return SPAN;
    },

    setComputeFactor: function (val) {
      if (/^\d+$/.test(val)) {
        return TIME.perCharacterFactor = Math.max(10, Math.abs(parseInt(val)));
      } else {
        console.error("comps.notifier.setComputeFactor(int); Integer required.");
      }
    },

    getCurrentToast: function () {
      return currentToast;
    },

    getQueue: function () {
      return queue;
    },

    clearQueue: function () {
      queue = [];
    },

    log: function () {
      if (collection.length > 0) {
        collection.forEach(function (item) {
          switch (item.type) {
            case TYPE.error:
              console.error(item.created.toLocaleTimeString(), '"' + item.text + '"', item.href);
              break;
            case TYPE.warning:
              console.warn(item.created.toLocaleTimeString(), '"' + item.text + '"', item.href);
              break;
            default:
              console.log(item.created.toLocaleTimeString(), '"' + item.text + '"', item.href);
          }
        });
      } else {
        console.log("Not messages currently stored for comps.notifier.");
      }
    },

    selector: function (value) {
      if (!arguments.length) {
        return defaults.selector;
      }
      defaults.selector = value;
      return this;
    },

    load: function (info) {
      /**
       * Incoming request from Router
       * @param {array} info.route hash values split by slash, ["module","directive","etc"]
       * @param {object} info.params name=value pairs parsed from URL arguments
       */
      return element;
    },

    unload: function () {
      if (!element) {
        element = document.getElementById(defaults.selector);
      }
      if (!!window.removeEventListener) {
        element.removeEventListener("click", closeHandler);
      } else if (!!window.detachEvent) {
        element.detachEvent("onclick", closeHandler);
      }
      element.parentNode.removeChild(element);
    }
  }
}();