import { ClickCapture } from '../../src/events/click';
import type { AnalyticsEvent } from '../../src/types';

describe('ClickCapture', () => {
  let capture: ClickCapture;
  let capturedEvents: AnalyticsEvent[];

  beforeEach(() => {
    capturedEvents = [];
    capture = new ClickCapture(
      (event) => capturedEvents.push(event),
      () => 'test-session-id',
    );
  });

  afterEach(() => {
    capture.stop();
  });

  it('should capture click events', () => {
    capture.start();

    const button = document.createElement('button');
    button.textContent = 'Click me';
    document.body.appendChild(button);
    button.click();

    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0].type).toBe('click');
    expect(capturedEvents[0].sessionId).toBe('test-session-id');
    expect(capturedEvents[0].properties).toHaveProperty('tagName', 'button');
    expect(capturedEvents[0].properties).toHaveProperty('text', 'Click me');

    document.body.removeChild(button);
  });

  it('should include coordinates', () => {
    capture.start();

    const div = document.createElement('div');
    document.body.appendChild(div);

    const event = new MouseEvent('click', {
      bubbles: true,
      clientX: 100,
      clientY: 200,
    });
    div.dispatchEvent(event);

    expect(capturedEvents[0].properties).toHaveProperty('x', 100);
    expect(capturedEvents[0].properties).toHaveProperty('y', 200);

    document.body.removeChild(div);
  });

  it('should stop capturing after stop()', () => {
    capture.start();
    capture.stop();

    const button = document.createElement('button');
    document.body.appendChild(button);
    button.click();

    expect(capturedEvents).toHaveLength(0);
    document.body.removeChild(button);
  });
});
