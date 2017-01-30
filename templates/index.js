(() => {
  'use strict';

  const BUTTON_PLAY_CLASS = 'glyphicon-play';
  const BUTTON_PAUSE_CLASS = 'glyphicon-pause';

  class Track {
    constructor(element) {
      this.element = element;

      this.button = element.querySelector('[data-button]');
      if (!this.button) {
        throw new Error('Unable to find button.');
      }


      this.progress = element.querySelector('[data-progress]');
      if (!this.progress) {
        throw new Error('Unable to find progress bar.');
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

    setTime(duration, currentTime) {
      const rem = parseInt(duration - currentTime, 10);
      const mins = Math.floor(rem / 60, 10);
      let secs = rem - mins * 60;

      if (secs < 10) {
        secs = `0${secs}`;
      }

      // console.log(mins, secs);

      const t = 100 - ((currentTime / duration) * 100);
      this.progress.style.width = `${t}%`;
      this.progress.innerHTML = `${mins}:${secs}`;
    }
  }

  class Player {
    constructor(elements) {
      console.log('Player constructed');

      this.isPlaying = false;
      this.track = null;
      this.audio = new Audio();

      this.tracks = Array.from(elements).map(e => new Track(e));
      this.tracks.forEach(t => {
        t.onClick(t => this.play(t));
      });
    }

    play(track) {

      if (this.isPlaying) {
        this.stop();

        // Same track clicked,
        if (track === this.track) {
          return;
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
      this.track.play();

      this.timer = setInterval(() => {
        track.setTime(this.audio.duration, this.audio.currentTime);
      }, 1e3);

      // TODO: handle loading
      // TODO: handled ended event for calling stop.
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended
    }

    stop() {
      if (this.isPlaying) {
        console.log(`Stopping track ${this.track.src}.`);
        clearInterval(this.timer);

        this.track.stop();
        this.audio.pause();
        this.isPlaying = false;
      }
    }

    // TODO: add step back 15sec
  }
  const p = new Player(document.querySelectorAll('div[data-track]'));
  window.p = p;
})();