import {
  customElement, LitElement, TemplateResult,
  html, query, PropertyValues, property
} from 'lit-element';

import { ChoiceChip } from '../choice-chip/choice-chip';

import { css, classes } from './choice-chips.scss';


const TAG_NAME = 'inno-choice-chips';

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ChoiceChips;
  }
}

/**
 * @event selected-chip-changed
 */
@customElement(TAG_NAME)
export class ChoiceChips extends LitElement {
  public static readonly styles = css;


  @property({ type: String })
  public selectAttribute: string = '';

  @property({ type: String })
  public selectId: string = '';


  private _selectedChip: ChoiceChip | null = null;


  @query('slot')
  private readonly _slotElem!: HTMLSlotElement;


  public get selectedChip(): ChoiceChip | null {
    return this._selectedChip;
  }

  protected render(): TemplateResult {
    return html`
      <div class="${classes.content}">
        <slot @slotchange="${this._onSlotChange}"></slot>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    this._updateSelectedChip();
  }

  private _updateSelectedChip(): void {
    const chips = this._slotElem
      .assignedElements({ flatten: true })
      .filter((elem): elem is ChoiceChip => elem instanceof ChoiceChip);

    const oriSelectedChip = this._selectedChip;
    this._selectedChip = chips.find((chip) =>
      chip.getAttribute(this.selectAttribute) === this.selectId) ?? null;

    for (const chip of chips) {
      chip.selected = chip === this._selectedChip;
    }

    if (this._selectedChip !== oriSelectedChip) {
      Promise.resolve().then(() => this.dispatchEvent(new Event('selected-chip-changed')));
    }
  }

  private _onSlotChange(): void {
    this.requestUpdate();
  }
}
