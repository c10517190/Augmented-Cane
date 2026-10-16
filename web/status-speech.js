// User-initiated speech; automatic announcements track status changes, not every sample.
class StatusSpeech {
  constructor({ readButton, autoButton, stopButton, feedback, getSnapshot }) {
    Object.assign(this, { readButton, autoButton, stopButton, feedback, getSnapshot });
    this.supported = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
    this.autoEnabled = false;
    this.lastKey = '';
    this.previousIssues = [];
    this.pendingRecovery = new Map();
    this.timer = null;
    this.sequence = 0;
    this.utterance = null;
    stopButton.hidden = true;
    if (!this.supported) {
      readButton.disabled = autoButton.disabled = stopButton.disabled = true;
      this.setFeedback('This browser does not support speech. You can use a system screen reader.', true);
      return;
    }
    this.synth = window.speechSynthesis;
    readButton.addEventListener('click', () => this.speakCurrent());
    autoButton.addEventListener('click', () => this.toggleAuto());
    stopButton.addEventListener('click', () => {
      this.cancel();
      this.pendingRecovery.clear();
      this.setFeedback(this.autoEnabled ? 'Speech stopped. Automatic announcements are still enabled.' : 'Speech stopped.');
    });
    window.addEventListener('pagehide', () => this.cancel());
  }
  key(snapshot) {
    return JSON.stringify([snapshot.connected, snapshot.stale, snapshot.distanceState, snapshot.postureState, (snapshot.sensorIssues || []).map(issue => issue.id)]);
  }
  summary(s, includeClimate = false) {
    if (!s.connected) return 'Device disconnected. No live data is available. Please check the connection. Distance and fall monitoring are unavailable.';
    const parts = [s.stale ? 'Device connected. Some data has not updated for more than five seconds. ' : 'Device connected. '];
    const issues = s.sensorIssues || [];
    if (issues.length) parts.push('Sensor alerts. ' + issues.map(issue => issue.detail).join(''));
    else if (includeClimate && s.sensorHealthNote) parts.push(s.sensorHealthNote);
    if (s.distanceState === 'Stale data') parts.push('Distance data is stale. Conditions ahead cannot be determined. ');
    else if (s.distance == null) parts.push(s.distanceState === 'Out of range' ? 'Distance is outside the detection range. Conditions ahead cannot be determined. ' : 'Waiting for distance data. Conditions ahead cannot be determined. ');
    else {
      const distance = 'Distance ' + s.distance + ' centimeters. ';
      if (s.distanceState === 'Very close ahead') parts.push('Warning. An obstacle is very close ahead. ' + distance);
      else if (s.distanceState === 'Obstacle nearby') parts.push('Caution. An obstacle is nearby. ' + distance);
      else if (s.distanceState === 'Confirming') parts.push('A nearby echo was detected. Confirming the reading. ' + distance);
      else parts.push('No nearby obstacle detected. ' + distance);
    }
    if (s.postureState === 'Fall') parts.push('Fall detected. Please check the situation. ');
    else if (s.postureState === 'Normal') parts.push('No fall detected. ');
    else parts.push('Fall monitoring is unavailable. ');
    if (includeClimate) {
      if (s.climateStale) parts.push('Temperature and humidity data is stale. ');
      else {
        if (s.temperature != null) parts.push('Temperature ' + s.temperature + ' degrees Celsius. ');
        if (s.humidity != null) parts.push('Humidity ' + s.humidity + ' percent. ');
      }
    }
    return parts.join('');
  }
  setFeedback(text, visible = false) {
    this.feedback.textContent = text;
    this.feedback.classList.toggle('feedback-error', visible);
  }
  setSpeaking(active) {
    if (!active && document.activeElement === this.stopButton) this.readButton.focus();
    this.stopButton.disabled = !active;
    this.stopButton.hidden = !active;
  }
  cancel() {
    clearTimeout(this.timer);
    this.timer = null;
    this.sequence++;
    if (this.supported) this.synth.cancel();
    this.utterance = null;
    this.setSpeaking(false);
  }
  speak(text) {
    if (!this.supported) return;
    this.cancel(); // Replace stale speech rather than building an outdated queue.
    const sequence = this.sequence;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      const voices = this.synth.getVoices();
      const voice = voices.find(v => /^en[-_]US$/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.volume = 1;
      utterance.onend = () => {
        if (sequence !== this.sequence) return;
        this.utterance = null;
        this.setSpeaking(false);
        this.setFeedback(this.autoEnabled ? 'Automatic announcements enabled. Only state changes will be announced.' : 'Speech finished. Select Read status to hear it again.');
      };
      utterance.onerror = event => {
        if (sequence !== this.sequence || ['canceled', 'interrupted'].includes(event.error)) return;
        this.cancel();
        this.autoEnabled = false;
        this.updateAutoButton();
        this.setFeedback('Speech could not be played. Check browser permissions or system English voices, then try again.', true);
      };
      this.utterance = utterance; // Retain the utterance until completion.
      this.setSpeaking(true);
      this.setFeedback('Reading the current status.');
      this.synth.speak(utterance);
    } catch (error) {
      this.cancel();
      this.autoEnabled = false;
      this.updateAutoButton();
      this.setFeedback('Speech could not be played. Check browser permissions or system English voices, then try again.', true);
    }
  }
  speakCurrent() {
    this.speak(this.summary(this.getSnapshot(), true));
  }
  updateAutoButton() {
    this.autoButton.checked = this.autoEnabled;
    this.autoButton.setAttribute('aria-checked', String(this.autoEnabled));
  }
  toggleAuto() {
    this.autoEnabled = !this.autoEnabled;
    this.updateAutoButton();
    this.lastKey = this.key(this.getSnapshot());
    this.previousIssues = this.getSnapshot().sensorIssues || [];
    this.pendingRecovery.clear();
    if (this.autoEnabled) this.speak('Automatic announcements enabled. ' + this.summary(this.getSnapshot()));
    else {
      this.cancel();
      this.setFeedback('Automatic announcements disabled. You can still select Read status.');
    }
  }
  announce(snapshot) {
    const active = new Set((snapshot.sensorIssues || []).map(issue => issue.id));
    const recovered = snapshot.connected ? [...this.pendingRecovery].filter(([id]) => !active.has(id)).map(([, name]) => name + ' data is updating again. ').join('') : '';
    this.pendingRecovery.clear();
    this.speak(recovered + this.summary(snapshot));
  }
  observe(snapshot) {
    const issues = snapshot.sensorIssues || [];
    const active = new Set(issues.map(issue => issue.id));
    for (const issue of this.previousIssues) {
      if (snapshot.connected && !active.has(issue.id)) this.pendingRecovery.set(issue.id, issue.name);
    }
    for (const issue of issues) this.pendingRecovery.delete(issue.id);
    this.previousIssues = issues;
    const key = this.key(snapshot);
    if (key === this.lastKey) return;
    this.lastKey = key;
    if (!this.autoEnabled) { this.pendingRecovery.clear(); return; }
    const urgent = !snapshot.connected || snapshot.stale || issues.length > 0 || snapshot.distanceState === 'Very close ahead' || snapshot.postureState === 'Fall';
    if (urgent) this.announce(snapshot);
    else {
      // Merge serial lines and recovery notices; never queue outdated sensor summaries.
      clearTimeout(this.timer);
      const announce = () => {
        if (!this.autoEnabled) return;
        if (this.synth.speaking) { this.timer = setTimeout(announce, 400); return; }
        this.timer = null;
        this.announce(this.getSnapshot());
      };
      this.timer = setTimeout(announce, 600);
    }
  }
}
