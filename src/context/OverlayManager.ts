type OverlayState = 'none' | 'loading' | 'offline';

type Listener = (state: OverlayState) => void;

class OverlayManagerClass {
  private state: OverlayState = 'none';
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state); // Immediately notify of current state
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  showLoading() {
    // Only set to loading if we aren't currently forcing an offline screen
    if (this.state !== 'offline') {
      this.state = 'loading';
      this.notify();
    }
  }

  hideLoading() {
    if (this.state === 'loading') {
      this.state = 'none';
      this.notify();
    }
  }

  showOffline() {
    this.state = 'offline';
    this.notify();
  }

  hideOffline() {
    if (this.state === 'offline') {
      this.state = 'none';
      this.notify();
    }
  }

  getState() {
    return this.state;
  }
}

export const OverlayManager = new OverlayManagerClass();
