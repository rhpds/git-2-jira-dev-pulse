import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import ScanPage from '../ScanPage';

describe('ScanPage', () => {
  it('renders the page title', async () => {
    render(<ScanPage />);
    expect(
      screen.getByText('Select Repositories to Analyze')
    ).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<ScanPage />);
    expect(screen.getByLabelText('Loading repos...')).toBeInTheDocument();
  });

  it('displays repos after loading', async () => {
    render(<ScanPage />);

    await waitFor(() => {
      expect(screen.getByText('test-repo-1')).toBeInTheDocument();
    });
  });

  it('has analyze button disabled when no repos selected', async () => {
    render(<ScanPage />);

    await waitFor(() => {
      const analyzeButton = screen.getByRole('button', {
        name: /Analyze Selected/i,
      });
      expect(analyzeButton).toBeDisabled();
    });
  });
});
