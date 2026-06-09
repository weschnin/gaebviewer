export type GaebNodeKind = 'remark' | 'category' | 'item';

export type GaebNode = {
  id: string;
  kind: GaebNodeKind;
  title: string;
  shortText?: string;
  detailText?: string;
  rNoPart?: string;
  quantity?: string;
  unit?: string;
  unitPrice?: string;
  totalPrice?: string;
  children: GaebNode[];
};

export type GaebDocument = {
  projectName: string;
  boqName: string;
  dp: string;
  nodes: GaebNode[];
};

const GAEB_NS = 'http://www.gaeb.de/GAEB_DA_XML/DA82/3.3';

export function parseGaebXml(xml: string): GaebDocument {
  const parser = new DOMParser();
  const document = parser.parseFromString(xml, 'application/xml');
  const parseError = document.getElementsByTagName('parsererror')[0];

  if (parseError) {
    throw new Error('Die GAEB-Datei konnte nicht als XML gelesen werden.');
  }

  return {
    projectName: getFirstText(document, 'NamePrj'),
    boqName: getFirstText(document, 'Name'),
    dp: getFirstText(document, 'DP'),
    nodes: parseBoqBody(document),
  };
}

function parseBoqBody(document: Document): GaebNode[] {
  const boqBody = document.getElementsByTagNameNS(GAEB_NS, 'BoQBody')[0];

  if (!boqBody) {
    return [];
  }

  return boqBodyChildren(boqBody);
}

function boqBodyChildren(parent: Element): GaebNode[] {
  const nodes: GaebNode[] = [];

  for (const child of Array.from(parent.children)) {
    if (child.localName === 'Remark') {
      nodes.push(parseRemark(child));
    }

    if (child.localName === 'BoQCtgy') {
      nodes.push(parseCategory(child));
    }

    if (child.localName === 'Itemlist') {
      nodes.push(...Array.from(child.children).filter(isElementNamed('Item')).map(parseItem));
    }
  }

  return nodes;
}

function parseRemark(element: Element): GaebNode {
  const shortText = getNestedText(element, ['TextOutlTxt']) || 'Hinweistext';

  return {
    id: element.getAttribute('ID') ?? crypto.randomUUID(),
    kind: 'remark',
    title: shortText,
    shortText,
    detailText: getNestedText(element, ['DetailTxt']) || undefined,
    children: [],
  };
}

function parseCategory(element: Element): GaebNode {
  const childBoqBody = directChild(element, 'BoQBody');
  const shortText = getNestedText(element, ['LblTx']) || 'LV-Gruppe';

  return {
    id: element.getAttribute('ID') ?? crypto.randomUUID(),
    kind: 'category',
    title: shortText,
    shortText,
    rNoPart: element.getAttribute('RNoPart') ?? undefined,
    children: childBoqBody ? boqBodyChildren(childBoqBody) : [],
  };
}

function parseItem(element: Element): GaebNode {
  const shortText =
    getNestedText(element, ['TextOutlTxt']) ||
    getNestedText(element, ['DetailTxt']) ||
    'Position';
  const quantity = getDirectText(element, 'Qty') || undefined;
  const unitPrice = getDirectText(element, 'UP') || undefined;

  return {
    id: element.getAttribute('ID') ?? crypto.randomUUID(),
    kind: 'item',
    title: shortText,
    shortText,
    rNoPart: element.getAttribute('RNoPart') ?? undefined,
    quantity,
    unit: getDirectText(element, 'QU') || undefined,
    unitPrice,
    totalPrice: getDirectText(element, 'IT') || computeTotalPrice(quantity, unitPrice),
    detailText: getNestedText(element, ['DetailTxt']) || undefined,
    children: [],
  };
}

function computeTotalPrice(quantity?: string, unitPrice?: string): string | undefined {
  if (!quantity || !unitPrice) {
    return undefined;
  }

  const qty = Number(quantity.replace(',', '.'));
  const up = Number(unitPrice.replace(',', '.'));

  if (!Number.isFinite(qty) || !Number.isFinite(up)) {
    return undefined;
  }

  return (qty * up).toFixed(2);
}

function getFirstText(document: Document, localName: string): string {
  const element = document.getElementsByTagNameNS(GAEB_NS, localName)[0];
  return cleanText(element?.textContent ?? '');
}

function getDirectText(parent: Element, localName: string): string {
  const child = directChild(parent, localName);
  return cleanText(child?.textContent ?? '');
}

function getNestedText(parent: Element, localNames: string[]): string {
  for (const localName of localNames) {
    const match = findFirstDescendant(parent, localName);
    const text = cleanText(match?.textContent ?? '');

    if (text) {
      return text;
    }
  }

  return '';
}

function findFirstDescendant(parent: Element, localName: string): Element | undefined {
  return Array.from(parent.getElementsByTagNameNS(GAEB_NS, localName))[0];
}

function directChild(parent: Element, localName: string): Element | undefined {
  return Array.from(parent.children).find((child) => child.localName === localName);
}

function isElementNamed(localName: string) {
  return (element: Element) => element.localName === localName;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
