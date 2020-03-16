import {
  directive, AttributePart, PropertyPart,
  DirectiveFn
} from 'lit-html';


export const ifString = directive((value: string | null | undefined): DirectiveFn => (part) => {
  if (!(part instanceof AttributePart) || part instanceof PropertyPart) {
    throw new Error('ifString directive can only be used in attribute binding');
  }

  if (value === undefined || value === null) {
    part.committer.element.removeAttribute(part.committer.name);
  } else {
    part.committer.element.setAttribute(part.committer.name, value);
  }
});
