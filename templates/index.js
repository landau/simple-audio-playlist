(function() {
  'use strict';

  function assert(assertion, msg) {
    if (!assertion) {
      throw new Error(msg);
    }
  }

  // Mobile does not like inheriting from elements. :(
  // So we use adpater pattern
  function defineGetter(obj, objName, prop) {
    Object.defineProperty(obj, prop, {
      get() {
        return this[objName][prop];
      }
    });
  }

  function defineGetterAndSetter(obj, objName, prop) {
    Object.defineProperty(obj, prop, {
      get() {
        return this[objName][prop];
      },

      set(v) {
        return this[objName][prop] = v;
      }
    });
  }

  class Event {
    constructor(namespace, fn) {
      this.namespace = namespace;
      this.fn = fn;
    }

    is(namespace, fn) {
      return this.namespace === namespace && this.fn === fn;
    }
  }

  class EventEmitter {
    constructor() {
      this._events = {};
    }

    on(event, fn) {
      let eventNamespace = this._events[event];

      if (!eventNamespace) {
        eventNamespace = this._events[event] = [];
      }

      eventNamespace.push(new Event(event, fn));

      let called = false;
      return () => {
        if (!called) {
          called = true;
          this.off(event, fn);
        }
      };
    }

    off(event, fn) {
      // Clumsy logic since anyone could call off. /shrug
      if (!event && !fn) {
        this._events = {};
      } else if (!fn) {
        this._events[event] = null;
      } else {
        this._events[event] = this._events[event].filter(e => e.is(event, fn));
      }
    }

    once(event, fn) {
      const remove = this.on(event, (...args) => {
        fn(...args);
        remove();
      });
      return remove;
    }

    emit(event, ...args) {
      let eventNamespace = this._events[event];


      if (!this._events[event]) {
        return;
      }
      eventNamespace.forEach(e => e.fn(...args));
    }
  }

  class AudioX extends EventEmitter {
    constructor(src) {
      super();

      this.audio = new Audio();
      this._src = src;

      this.mins = 0;
      this.secs = 0;
      this.initial = 0;
      this.remaining = 100;
      this.autoplay = false;

      this.onTickEvents = [];

      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement#Event_handlers
      this.on('timeupdate', () => {
        this.setTime();
        this.emit('tick', this);
      });
    }

    play() {
      // To prevent loading all audio files, only set src once play is pressed
      if (!this.src) {
        this.src = this._src;
      }
      this.audio.play();
    }

    pause() {
      this.audio.pause();
    }

    stop() {
      this.pause();
      this.currentTime = 0;
    }

    // FIXME: memory leak with addEventListener
    on(event, fn) {
      this.audio.addEventListener(event, fn);
      return super.on(event, fn);
    }

    off(event, fn) {
      this.audio.removeEventListener(event, fn);
      return super.off(event, fn);
    }

    setTime() {
      const rem = parseInt(this.duration - this.currentTime, 10);
      this.mins = Math.floor(rem / 60, 10);
      this.secs = rem - this.mins * 60;

      // Percentage of song
      this.initial = (this.currentTime / this.duration) * 100;
      this.remaining = 100 - this.initial;
    }

    back(time) {
      console.log(`Seeking back ${time} seconds`);
      this.currentTime -= time;
    }

    fwd(time) {
      console.log(`Seeking fwd ${time} seconds`);
      this.currentTime += time
    }

    get isReady() {
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
      return this.readyState > 1;
    }
  }

  ['duration', 'ended', 'error', 'readyState', 'paused'].forEach(defineGetter.bind(null, AudioX.prototype, 'audio'));
  ['src', 'currentTime', 'autoplay'].forEach(defineGetterAndSetter.bind(null, AudioX.prototype, 'audio'));

  class El extends EventEmitter {
    /*
     * @constructor
     * @param options
     * @param options.rootSelector
     * @param options.templateSelector
     *
     */
    constructor(options) {
      super();
      this.options = options;

      // Required options
      [
        'rootSelector',
        'templateSelector'
      ].forEach(opt => {
        assert(options[opt], `El not defined with required prop ${opt}`);
        this[opt] = options[opt];
      })

      this._isAttached = false;

      this._$template = this._getTemplate();
      // Reach into childnodes. Since content is a doc frag
      // Once this is attached to dom, the fragment is cleared
      this.$el = this._$template.content.cloneNode(true).firstElementChild;
    }

    find(selector) {
      return El.find(selector, this.$el);
    }

    // namespace `event` as `event:selector` to bind to a different sub element
    addEventListener(namespacedEvent, fn) {
      assert(this._isAttached, 'Cannot addEventListener until document is attached to DOM.');
      let [event, selector] = namespacedEvent.split(':');
      let element = selector ? this.find(selector) : this.$el;
      element.addEventListener(event, fn);

      let called = false;
      return () => {
        if (!called) {
          this._removeEventListener(element, event, fn);
          return;
        }
        called = true;
      };
    }

    _removeEventListener(element, event, fn) {
      element.removeEventListener(event, fn);
    }

    removeEventListener(event, fn) {
      return this._removeEventListener(this.$el, event, fn);
    }

    _getTemplate() {
      return El.find(this.templateSelector);
    }

    _attachEvents() {}

    _attachToRoot() {
      if (!this._isAttached) {
        El.find(this.rootSelector).appendChild(this.$el);
        this._isAttached = true;
        this._attachEvents();
      }
    }

    attach() {
      this._attachToRoot();
    }

    static find(selector, root) {
      if (!root) {
        root = document.body;
      }

      const element = root.querySelector(selector);
      assert(element, `Unable to find element with selector ${selector}.`);

      return element;
    }
  }

  // TODO: Cache found elements with root as key in map which maps to a obj of selectors
  // El._nodeCache = new WeakMap();

  class Track extends El {
    // TODO: is this pattern of chaning super class signature acceptable?
    constructor(options) {
      super(options);
      this.label = options.label;

      assert(this.label, 'Cannot construct track without a label')
      console.log(`Track constructed with label ${this.label}.`);

      // TODO: make super class read a map of prop names to selectors
      this.$button = this.find('span[data-button]');

      this.$label = this.find('[data-label]');
      this.$label.innerHTML = this.label;
    }

    _attachEvents() {
      this.addEventListener('click', e => {
        e.preventDefault();
        this.emit('click');
      });
    }

    _setDefaultButtonClass() {
      this.$button.classList.remove('glyphicon-play-circle');
      this.$button.classList.remove('glyphicon-music');
      this.$button.classList.remove('glyphicon-refresh');
      this.$button.classList.remove('glyphicon-spin');
    }

    setAsPlaying() {
      this._setDefaultButtonClass();
      this.$button.classList.add('glyphicon-play-circle');
    }

    setAsStopped() {
      this._setDefaultButtonClass();
      this.$button.classList.add('glyphicon-music');
    }

    setAsLoading() {
      this._setDefaultButtonClass();
      this.$button.classList.add('glyphicon-refresh');
      this.$button.classList.add('glyphicon-spin');
    }
  }

  class Slider extends El {
    constructor(options) {
      super(options)
      console.log('Slider constructed');

      this.$time = this.find('[data-time]');
      this.$range = this.find('input');

      this.step = 1;
      this.min = 0;
      // this.max = ?;
    }

    _attachEvents() {
      this.addEventListener('change', this._onChange.bind(this));
    }

    _onChange(e) {
      const N = e.target.valueAsNumber;
      this.value = N;
      this.emit('change', N);
    }

    setTime(audio) {
      let {mins, secs} = audio;

      if (secs < 10) {
        secs = `0${secs}`;
      }

      this.$time.innerHTML = `${mins}:${secs}`;
      this.value = audio.currentTime;

      if (audio.duration !== this.max) {
        this.max = audio.duration;
      }
    }
  }

  ['step', 'min', 'max', 'value'].forEach(defineGetterAndSetter.bind(null, Slider.prototype, '$range'));

  class Controls extends El {
    constructor(options) {
      super(options);
      console.log('PlayerControls constructed');
    }

    _attachEvents() {
      this.addEventListener('click:button[data-play]', e => {
        this.emit('play');
      });

      this.addEventListener('click:button[data-stop]', e => {
        this.emit('stop');
      });

      this.addEventListener('click:button[data-pause]', e => {
        this.emit('pause');
      });

      this.addEventListener('click:button[data-back]', () => {
        this.emit('back');
      });

      this.addEventListener('click:button[data-fwd]', () => {
        this.emit('fwd');
      });
    }
  }

  class System extends EventEmitter {
    constructor(data) {
      super();
      this.data = data;
      this.activeAudio = null;

      this.audioList = this.data.map(d => new AudioX(d.src)); // TODO: don't autoload when src is set

      this.tracks = this.data.map(a => new Track(({
        rootSelector: 'div[data-track-root]',
        templateSelector: '#track-template',
        label: a.label
      }))); // TODO: embed this html

      this.tracks.forEach((track, i) => {
        track.on('click', () => {
          this.play(this.audioList[i]);
        });
      });

      this.controls = new Controls({
        rootSelector: 'div[data-controls-root]',
        templateSelector: '#controls-template'
      });

      this.controls.on('play', () => {
        this.play(this.activeAudio);
      });

      this.controls.on('stop', () => {
        this.stop();
      });

      this.controls.on('pause', () => {
        this.pause();
      });

      const SEEK_TIME = 15;
      this.controls.on('back', () => {
        if (this.activeAudio) {
          this.activeAudio.back(SEEK_TIME);
        }
      });

      this.controls.on('fwd', () => {
        if (this.activeAudio) {
          this.activeAudio.fwd(SEEK_TIME);
        }
      });

      this.slider = new Slider({
        rootSelector: 'div[data-controls-root]',
        templateSelector: '#slider-template'
      });

      this.slider.on('change', n => {
        if (this.activeAudio) {
          this.activeAudio.currentTime = n;
        }
      });

      this.audioList.forEach(audio => {
        audio.on('tick', audio => {
          this.slider.setTime(audio);
        });
      })
    }

    render() {
      this.controls.attach();
      this.slider.attach();
      this.tracks.forEach(t => t.attach());
    }

    play(audio) {
      if (!audio) {
        console.log('Cannot play. No audio provided.');
        return;
      }

      // Same track clicked,
      if (audio === this.activeAudio) {
        if (audio.paused) {
          this.resume();
        } else {
          console.log('This audio is already playing.');
        }
        return;
      } else {
        this.stop();
      }

      console.log(`Playing audio ${audio.src}.`);

      this.activeAudio = audio;
      const track = this.tracks[this.audioList.indexOf(audio)];

      if (!audio.isReady) {
        audio.on('loadstart', () => {
          track.setAsLoading();
        });
      }

      audio.on('playing', () => {
        track.setAsPlaying();
        this.slider.setTime(audio);
      });

      audio.on('ended', () => {
        this.stop();
        this.activeAudio = null;
      });

      audio.play();
    }

    stop() {
      const audio = this.activeAudio;
      if (audio) {
        console.log(`Stopping audio ${audio.src}.`);
        const track = this.tracks[this.audioList.indexOf(audio)];

        audio.stop();
        track.setAsStopped();
      }
    }

    pause() {
      const audio = this.activeAudio;
      if (audio) {
        console.log(`Pausing audio ${audio.src}.`);
        audio.pause();

        const track = this.tracks[this.audioList.indexOf(audio)];
        track.setAsStopped();
      }
    }

    resume() {
      const audio = this.activeAudio;
      if (audio) {
        console.log(`Resuming audio ${audio.src}.`);
        audio.play();

        const track = this.tracks[this.audioList.indexOf(audio)];
        track.setAsPlaying();
      }

    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    let system = window.system = new System(window.data);
    system.render();
  });
})();
