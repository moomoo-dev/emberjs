type Link = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').Link;
type LinkObject = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').LinkObject;

/*
  This method normalizes a link to an "links object". If the passed link is
  already an object it's returned without any modifications.

  See http://jsonapi.org/format/#document-links for more information.
*/
export default function _normalizeLink(link: Link): LinkObject | null {
  switch (typeof link) {
    case 'object':
      return link;
    case 'string':
      return { href: link };
  }
}
