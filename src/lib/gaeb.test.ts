import { describe, expect, it } from 'vitest';

import { parseGaebXml } from '@/lib/gaeb';
import { sampleGaebXml } from '@/test/fixtures/sample-gaeb';

describe('parseGaebXml', () => {
  it('liest Projekt, LV, Baumstruktur sowie Kurztext/Langtext und Preise aus', () => {
    const document = parseGaebXml(sampleGaebXml);

    expect(document.projectName).toBe('096-56 Südallee Sanierung');
    expect(document.boqName).toBe('Zaunbau');
    expect(document.dp).toBe('82');
    expect(document.nodes).toHaveLength(2);

    const category = document.nodes[1];
    const nestedCategory = category.children[0];
    const item = nestedCategory.children[0];

    expect(category.title).toBe('Metallbauarbeiten');
    expect(category.rNoPart).toBe('31');
    expect(nestedCategory.title).toBe('Zäune / Türen / Tore / Fensterelemente');
    expect(nestedCategory.rNoPart).toBe('22');
    expect(item.title).toBe('Baustelleneinrichtung für Zaun- und Toranlage');
    expect(item.shortText).toBe('Baustelleneinrichtung für Zaun- und Toranlage');
    expect(item.detailText).toBe('Einrichten, Vorhalten und Räumen der Baustelle.');
    expect(item.quantity).toBe('1.000');
    expect(item.unit).toBe('psch');
    expect(item.unitPrice).toBe('500.00');
    expect(item.totalPrice).toBe('500.00');
  });
});
