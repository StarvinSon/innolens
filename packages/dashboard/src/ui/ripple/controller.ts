import { DirectiveFn, AttributePart } from 'lit-html';

import { directiveMethod } from '../directive-method';

import { Ripple } from './ripple';


export class RippleController {
  private _host: HTMLElement | null = null;
  private _ripple: Ripple | null = null;

  private readonly _focusedInputs: Set<number | 'tab'> = new Set();

  private _activeInput: {
    readonly type: 'none';
  } | {
    readonly type: 'pointer';
    readonly pointerId: number;
  } | {
    readonly type: 'key';
    readonly key: string;
  } = {
    type: 'none'
  };

  private _newActiveInput: {
    readonly type: 'none';
  } | {
    readonly type: 'pointer';
    readonly pointerId: number;
    readonly clientX: number;
    readonly clientY: number;
  } | {
    readonly type: 'key';
    readonly key: string;
  } = {
    type: 'none'
  };

  private _scheduledUpdate: Promise<void> | null = null;

  public constructor(host?: HTMLElement) {
    if (host !== undefined) this._host = host;
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerEnter = this._onPointerEnter.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
    this._listenHost();
    this._requestUpdate();
  }

  private _listenHost(): void {
    const { _host: host } = this;
    if (host === null) return;

    if (host.matches(':focus')) this._focusedInputs.add('tab');
    host.addEventListener('focus', this._onFocus, { passive: true });
    host.addEventListener('blur', this._onBlur, { passive: true });
    host.addEventListener('keydown', this._onKeyDown, { passive: true });
    host.addEventListener('keyup', this._onKeyUp, { passive: true });
    host.addEventListener('pointerenter', this._onPointerEnter, { passive: true });
    host.addEventListener('pointerleave', this._onPointerLeave, { passive: true });
    host.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    host.addEventListener('pointerup', this._onPointerUp, { passive: true });
    host.addEventListener('pointercancel', this._onPointerCancel, { passive: true });
    this._requestUpdate();
  }

  private _onFocus(): void {
    if (this._focusedInputs.has('tab')) return;

    this._focusedInputs.add('tab');
    this._requestUpdate();
  }

  private _onBlur(): void {
    if (this._focusedInputs.delete('tab')) {
      this._requestUpdate();
    }
  }

  private _onKeyDown(event: KeyboardEvent): void {
    if (
      (event.key !== ' ' || event.repeat)
      && event.key !== 'Enter'
    ) return;

    this._newActiveInput = {
      type: 'key',
      key: event.key
    };
    this._requestUpdate();
  }

  private _onKeyUp(event: KeyboardEvent): void {
    if (this._activeInput.type === 'key' && this._activeInput.key === event.key) {
      this._activeInput = { type: 'none' };
      this._requestUpdate();
    }
    if (this._newActiveInput.type === 'key' && this._newActiveInput.key === event.key) {
      this._newActiveInput = { type: 'none' };
      this._requestUpdate();
    }
  }

  private _onPointerEnter(event: PointerEvent): void {
    if (this._focusedInputs.has(event.pointerId)) return;

    this._focusedInputs.add(event.pointerId);
    this._requestUpdate();
  }

  private _onPointerLeave(event: PointerEvent): void {
    if (this._focusedInputs.delete(event.pointerId)) {
      this._requestUpdate();
    }

    if (this._activeInput.type === 'pointer' && this._activeInput.pointerId === event.pointerId) {
      this._activeInput = { type: 'none' };
      this._requestUpdate();
    }
    if (this._newActiveInput.type === 'pointer' && this._newActiveInput.pointerId === event.pointerId) {
      this._newActiveInput = { type: 'none' };
      this._requestUpdate();
    }
  }

  private _onPointerDown(event: PointerEvent): void {
    this._newActiveInput = {
      type: 'pointer',
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY
    };
    this._requestUpdate();
  }

  private _onPointerUp(event: PointerEvent): void {
    if (this._activeInput.type === 'pointer' && this._activeInput.pointerId === event.pointerId) {
      this._activeInput = { type: 'none' };
      this._requestUpdate();
    }
    if (this._newActiveInput.type === 'pointer' && this._newActiveInput.pointerId === event.pointerId) {
      this._newActiveInput = { type: 'none' };
      this._requestUpdate();
    }
  }

  private _onPointerCancel(event: PointerEvent): void {
    if (this._focusedInputs.delete(event.pointerId)) {
      this._requestUpdate();
    }

    if (this._activeInput.type === 'pointer' && this._activeInput.pointerId === event.pointerId) {
      this._activeInput = { type: 'none' };
      this._requestUpdate();
    }
    if (this._newActiveInput.type === 'pointer' && this._newActiveInput.pointerId === event.pointerId) {
      this._newActiveInput = { type: 'none' };
      this._requestUpdate();
    }
  }


  private _requestUpdate(): void {
    if (this._scheduledUpdate !== null) {
      return;
    }
    this._scheduledUpdate = Promise.resolve().then(() => {
      this._scheduledUpdate = null;
      this._update();
    });
  }

  private _update(): void {
    const { _host: host, _ripple: ripple } = this;
    if (host === null || ripple === null) return;

    ripple.highlight = this._focusedInputs.size > 0;

    if (this._newActiveInput.type !== 'none') {
      const hostClientRect = host.getBoundingClientRect();
      const radius = Math.sqrt(hostClientRect.width ** 2 + hostClientRect.height ** 2);
      const opts = this._newActiveInput.type === 'key'
        ? {
          left: hostClientRect.width / 2,
          top: hostClientRect.height / 2,
          radius
        }
        : {
          left: this._newActiveInput.clientX - hostClientRect.left,
          top: this._newActiveInput.clientY - hostClientRect.top,
          radius
        };
      ripple.newWave(opts);
      this._activeInput = this._newActiveInput.type === 'key'
        ? { type: 'key', key: this._newActiveInput.key }
        : { type: 'pointer', pointerId: this._newActiveInput.pointerId };
      this._newActiveInput = { type: 'none' };
    }

    if (this._activeInput.type === 'none') {
      ripple.fadeAllWaves();
    }
  }

  @directiveMethod()
  public bindHost(): DirectiveFn {
    return (part) => {
      if (!(part instanceof AttributePart)) {
        throw new Error('RippleController.control directive can only be used in attribute binding');
      }

      const { element } = part.committer;
      if (this._host !== null && this._host !== part.committer.element) {
        throw new Error('RippleController.control directive must always be bound to the same element');
      }
      if (!(element instanceof HTMLElement)) {
        throw new Error('RippleController.control directive can only be bound to HTMLElement');
      }
      if (this._host === null) {
        this._host = element;
        this._listenHost();
        this._requestUpdate();
      }
    };
  }

  @directiveMethod()
  public bindRipple(): DirectiveFn {
    return (part) => {
      if (!(part instanceof AttributePart)) {
        throw new Error('RippleController.control directive can only be used in attribute binding');
      }

      const { element } = part.committer;
      if (this._ripple !== null && this._ripple !== part.committer.element) {
        throw new Error('RippleController.control directive must always be bound to the same element');
      }
      if (!(element instanceof Ripple)) {
        throw new Error('RippleController.control directive can only be bound to inno-ripple element');
      }
      if (this._ripple === null) {
        this._ripple = element;
        this._requestUpdate();
      }
    };
  }
}
