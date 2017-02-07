(() => {
  'use strict';

  const BUTTON_PLAY_CLASS = 'glyphicon-play';
  const BUTTON_PAUSE_CLASS = 'glyphicon-pause';


  class AudioX extends Audio {
    constructor() {
      super();

      this.step = 0.01;
      this.max = 100;
      this.min = 0;

      this.mins = 0;
      this.secs = 0;
      this.initial = 0;
      this.remaining = 100;



      this.onTickEvents = [];

      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement#Event_handlers
      this.addEventListener('timeupdate', () => {
        this.setTime();
        this.onTickEvents.forEach(fn => fn(this));
      });
    }

    setTime() {
      const rem = parseInt(this.duration - this.currentTime, 10);
      this.mins = Math.floor(rem / 60, 10);
      this.secs = rem - this.mins * 60;

      // console.log(mins, secs);

      // Percentage of song
      this.initial = (this.currentTime / this.duration) * 100;
      this.remaining = 100 - this.initial;
    }

    onTick(fn) {
      this.onTickEvents.push(fn);
    }

    back(time) {
      console.log(`Seeking back ${time} seconds`);
      this.currentTime -= time;
    }

    fwd(time) {
      console.log(`Seeking fwd ${time} seconds`);
      this.currentTime += time
    }
  }

  class Track {
    constructor(element) {
      this.element = element;

      this.button = element.querySelector('[data-button]');
      if (!this.button) {
        throw new Error('Unable to find button.');
      }

      this.name = element.querySelector('[data-name]');
      if (!this.name) {
        throw new Error('Unable to find name element.');
      }

      this.isPlaying = false;
      this.src = element.dataset.src;
      this.name.innerHTML = this.src

      console.log(`Track with src ${this.src} created.`);

      this.onClickEvents = [];

      this.element.addEventListener('click', e => {
        console.log(`Track with src ${this.src} clicked.`);
        this.onClickEvents.forEach(fn => fn(this));
      });
    }

    play() {
      this.button.classList.remove(BUTTON_PLAY_CLASS);
      this.button.classList.add(BUTTON_PAUSE_CLASS);
    }

    stop() {
      this.button.classList.remove(BUTTON_PAUSE_CLASS);
      this.button.classList.add(BUTTON_PLAY_CLASS);
    }

    onClick(fn) {
      this.onClickEvents.push(fn);
    }
  }

  // TODO: handle slider movements via onchange
  class Slider {
    constructor(element) {
      this.slider = element;
      if (!this.slider)  {
        throw new Error('Cannot start. No slider element');
      }

      this.time = this.slider.querySelector('[data-time]');
      this.range = this.slider.querySelector('input');
    }

    setTime(audio) {
      const {mins, remaining} = audio;
      let secs = audio.secs;

      if (secs < 10) {
        secs = `0${secs}`;
      }

      this.time.innerHTML = `${mins}:${secs}`;
      this.range.value = audio.initial; // FIXME: this is not working on chrome mobile
    }
  }

  // TODO: add track name
  // TODO: remember player positions via local storage
  class Player {
    constructor(trackElements, playerElement, sliderElement) {
      console.log('Player constructed');

      this.audio = new AudioX();
      this.isPlaying = false;
      this.track = null;

      this.tracks = Array.from(trackElements).map(e => new Track(e));
      this.tracks.forEach(t => {
        t.onClick(t => this.play(t));
      });

      this.player = playerElement;
      this.playEl = this.player.querySelector('[data-play]');
      this.stopEl = this.player.querySelector('[data-stop]');
      this.backEl = this.player.querySelector('[data-back]');
      this.fwdEl = this.player.querySelector('[data-fwd]');

      this.playEl.addEventListener('click', e => {
        this.play(this.track);
      });

      this.stopEl.addEventListener('click', e => {
        this.stop();
      });

      this.backEl.addEventListener('click', e => {
        this.audio.back(15);
      });

      this.fwdEl.addEventListener('click', e => {
        this.audio.fwd(15);
      });

      this.slider = new Slider(sliderElement);

      this.audio.onTick(time => {
        if (this.track) {
          this.slider.setTime(this.audio);
        }
      });
    }

    play(track) {
      if (!track) {
        console.log('Cannot play. No track provided.');
        return;
      }

      if (this.isPlaying) {
        // Same track clicked,
        if (track === this.track) {
          console.log('This track is already playing.');
          return;
        } else {
          this.stop();
        }
      }

      console.log(`Playing track ${track.src}.`);

      // Keep current location of track if same track is played
      if (track !== this.track) {
        this.audio.src = track.src;
      }

      this.audio.play();
      this.isPlaying = true;
      this.track = track;

      // TODO: handle loading
      // TODO: handled ended event for restarting track or something
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended
    }

    stop() {
      if (this.isPlaying) {
        console.log(`Stopping track ${this.track.src}.`);
        clearInterval(this.timer);

        this.audio.pause();
        this.isPlaying = false;
      }
    }
  }
  const p = new Player(
    document.querySelectorAll('div[data-track]'),
    document.querySelector('div[data-player]'),
    document.querySelector('[data-slider]')
  );
  window.p = p;
})();
