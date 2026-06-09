import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { GaebViewer } from '@/components/gaeb-viewer';
import { sampleGaebXml } from '@/test/fixtures/sample-gaeb';

describe('GaebViewer', () => {
  it('zeigt eine Drag-and-Drop-Zone für GAEB-Dateien an', () => {
    render(<GaebViewer />);

    expect(screen.getByRole('heading', { name: /gaeb viewer/i })).toBeInTheDocument();
    expect(screen.getByText(/gaeb-datei hier ablegen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gaeb-datei auswählen/i)).toBeInTheDocument();
  });

  it('zeigt nach dem Upload genau zwei Arbeitsbereiche: Baum links und Details rechts', async () => {
    const user = userEvent.setup();
    render(<GaebViewer />);

    await user.upload(
      screen.getByLabelText(/gaeb-datei auswählen/i),
      new File([sampleGaebXml], 'Zaunbau.x82', { type: 'text/xml' }),
    );

    const treePanel = await screen.findByRole('region', { name: /gaeb baumstruktur/i });
    const detailPanel = screen.getByRole('region', { name: /details zum ausgewählten baumelement/i });

    expect(treePanel).toBeInTheDocument();
    expect(detailPanel).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /metadaten/i })).not.toBeInTheDocument();
  });

  it('begrenzt linkes und rechtes Panel auf die Browserhöhe, macht beide vertikal scrollbar und hält die Header sticky', async () => {
    const user = userEvent.setup();
    render(<GaebViewer />);

    await user.upload(
      screen.getByLabelText(/gaeb-datei auswählen/i),
      new File([sampleGaebXml], 'Zaunbau.x82', { type: 'text/xml' }),
    );

    const treePanel = await screen.findByRole('region', { name: /gaeb baumstruktur/i });
    const detailPanel = screen.getByRole('region', { name: /details zum ausgewählten baumelement/i });
    const treeHeader = within(treePanel).getByRole('heading', { name: /baumstruktur/i }).closest('div');
    const detailHeader = within(detailPanel).getByRole('heading', { name: /inhalte/i }).closest('div');

    expect(treePanel.className).toContain('max-h-[');
    expect(treePanel.className).toContain('overflow-y-auto');
    expect(treePanel.className).toContain('pane-scrollbar');
    expect(detailPanel.className).toContain('max-h-[');
    expect(detailPanel.className).toContain('overflow-y-auto');
    expect(detailPanel.className).toContain('pane-scrollbar');
    expect(treeHeader?.className).toContain('sticky');
    expect(treeHeader?.className).toContain('top-0');
    expect(detailHeader?.className).toContain('sticky');
    expect(detailHeader?.className).toContain('top-0');
  });

  it('stellt links eine explorer-ähnliche Baumstruktur mit Gruppen-/Positionsicons und OZ-Nummern dar', async () => {
    const user = userEvent.setup();
    render(<GaebViewer />);

    await user.upload(
      screen.getByLabelText(/gaeb-datei auswählen/i),
      new File([sampleGaebXml], 'Zaunbau.x82', { type: 'text/xml' }),
    );

    const treePanel = await screen.findByRole('region', { name: /gaeb baumstruktur/i });

    expect(within(treePanel).getAllByText('📁').length).toBeGreaterThan(0);
    expect(within(treePanel).getAllByText('📄').length).toBeGreaterThan(0);
    expect(within(treePanel).getByText('31')).toBeInTheDocument();
    expect(within(treePanel).getByText('31.22')).toBeInTheDocument();
    expect(within(treePanel).getByText('31.22.0100')).toBeInTheDocument();
    expect(within(treePanel).getByRole('button', { name: /knoten metallbauarbeiten zuklappen/i })).toBeInTheDocument();
  });

  it('bricht lange Titel im linken Baum sauber um, statt OZ und Kurztext zu überlagern', async () => {
    const user = userEvent.setup();
    render(<GaebViewer />);

    await user.upload(
      screen.getByLabelText(/gaeb-datei auswählen/i),
      new File([sampleGaebXml], 'Zaunbau.x82', { type: 'text/xml' }),
    );

    const itemButton = await screen.findByRole('button', {
      name: /eintrag baustelleneinrichtung für zaun- und toranlage auswählen/i,
    });
    const titleSpan = within(itemButton).getByText('Baustelleneinrichtung für Zaun- und Toranlage');

    expect(titleSpan.className).toContain('break-words');
    expect(titleSpan.className).not.toContain('truncate');
  });

  it('klappt Gruppen im Baum auf und zu', async () => {
    const user = userEvent.setup();
    render(<GaebViewer />);

    await user.upload(
      screen.getByLabelText(/gaeb-datei auswählen/i),
      new File([sampleGaebXml], 'Zaunbau.x82', { type: 'text/xml' }),
    );

    const categoryButton = await screen.findByRole('button', { name: /knoten metallbauarbeiten zuklappen/i });
    expect(screen.getByText('Zäune / Türen / Tore / Fensterelemente')).toBeInTheDocument();

    await user.click(categoryButton);

    expect(screen.queryByText('Zäune / Türen / Tore / Fensterelemente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /knoten metallbauarbeiten aufklappen/i })).toBeInTheDocument();
  });

  it('zeigt rechts für das selektierte Baumelement Kurztext, Langtext, OZ, Menge, Einheit, EP und GP an', async () => {
    const user = userEvent.setup();
    render(<GaebViewer />);

    await user.upload(
      screen.getByLabelText(/gaeb-datei auswählen/i),
      new File([sampleGaebXml], 'Zaunbau.x82', { type: 'text/xml' }),
    );

    await user.click(
      await screen.findByRole('button', {
        name: /eintrag baustelleneinrichtung für zaun- und toranlage auswählen/i,
      }),
    );

    const detailPanel = screen.getByRole('region', { name: /details zum ausgewählten baumelement/i });

    expect(within(detailPanel).getByText(/kurztext/i)).toBeInTheDocument();
    expect(within(detailPanel).getByText(/langtext/i)).toBeInTheDocument();
    expect(within(detailPanel).getByText(/oz/i)).toBeInTheDocument();
    expect(within(detailPanel).getByText(/menge/i)).toBeInTheDocument();
    expect(within(detailPanel).getByText(/einheit/i)).toBeInTheDocument();
    expect(within(detailPanel).getAllByText('500.00').length).toBeGreaterThanOrEqual(2);
    expect(within(detailPanel).getByText('31.22.0100')).toBeInTheDocument();
    expect(within(detailPanel).getByText('1.000')).toBeInTheDocument();
    expect(within(detailPanel).getByText('psch')).toBeInTheDocument();
    expect(within(detailPanel).getAllByText('Baustelleneinrichtung für Zaun- und Toranlage').length).toBeGreaterThan(0);
    expect(within(detailPanel).getByText(/einrichten, vorhalten und räumen der baustelle/i)).toBeInTheDocument();
  });
});
