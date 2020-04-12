import {
  customElement, LitElement, TemplateResult,
  html, query, PropertyValues, property
} from 'lit-element';

import { mergeArray } from '../../utils/immutable/array';
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
  public selectId: string | ReadonlyArray<string> | null | false = false;


  private _selectedChips: ReadonlyArray<ChoiceChip> = [];


  @query('slot')
  private readonly _slotElem!: HTMLSlotElement;


  public get selectedChips(): ReadonlyArray<ChoiceChip> {
    return this._selectedChips;
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

    const oldSelectedChips = this._selectedChips;
    let newSelectedChips: ReadonlyArray<ChoiceChip>;
    if (this.selectId === null || this.selectId === false) {
      newSelectedChips = mergeArray(oldSelectedChips, []);
    } else {
      newSelectedChips = mergeArray(oldSelectedChips, chips.filter((chip) => {
        const attr = chip.getAttribute(this.selectAttribute);
        return Array.isArray(this.selectId)
          ? this.selectId.includes(attr)
          : attr === this.selectId;
      }));
    }

    if (oldSelectedChips !== newSelectedChips && this.selectId !== false) {
      this._selectedChips = newSelectedChips;
      for (const chip of chips) {
        chip.selected = newSelectedChips.includes(chip);
      }
      Promise.resolve().then(() => this.dispatchEvent(new Event('selected-chip-changed')));
    }
  }

  private _onSlotChange(): void {
    this.requestUpdate();
  }
}
