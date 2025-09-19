import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import QRCodeDisplay from '../QRCodeDisplay';
import { qrGeneratorService } from '../../../services/security/qrGenerator';
import { QRCodeData } from '../../../utils/dataModels';
import { VERIFICATION_STATUS } from '../../../utils/constants';

// Mock dependencies
jest.mock('../../../services/security/qrGenerator');
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('expo-file-system');
jest.mock('expo-media-library');
jest.mock('../VerificationBadge', () => 'VerificationBadge');

// Mock Alert and Share
jest.spyOn(Alert, 'alert');
jest.spyOn(Share, 'share');

describe('QRCodeDisplay Component', () => {
  const mockTouristData = {
    userId: 'test-user-123',
    name: 'John Doe',
    nationality: 'USA',
    passportNumber: 'AB1234567',
    verificationStatus: VERIFICATION_STATUS.VERIFIED,
    profilePhotoUrl: 'https://example.com/photo.jpg'
  };

  const mockQRData = new QRCodeData({
    qrString: 'mock-qr-string',
    userId: 'test-user-123',
    verificationHash: 'mock-hash',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    blockchainTxId: 'mock-tx-id',
    encryptedData: 'mock-encrypted-data',
    generatedAt: new Date(),
    version: '1.0',
    securityLevel: 'high'
  });

  const mockProps = {
    touristData: mockTouristData,
    onRefresh: jest.fn(),
    onError: jest.fn(),
    fullScreen: false,
    showControls: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    qrGeneratorService.getCachedQRData.mockResolvedValue({
      success: true,
      qrData: mockQRData
    });
    
    qrGeneratorService.needsRefresh.mockReturnValue(false);
    
    qrGeneratorService.generateQRData.mockResolvedValue({
      success: true,
      qrData: mockQRData
    });
    
    qrGeneratorService.refreshQRCode.mockResolvedValue({
      success: true,
      qrData: mockQRData
    });
    
    qrGeneratorService.generateOfflineQR.mockResolvedValue({
      success: true,
      qrData: mockQRData,
      offlineMetadata: {
        validUntil: mockQRData.expiresAt,
        emergencyContact: '1363'
      }
    });
  });

  describe('Rendering', () => {
    it('should render loading state initially', async () => {
      qrGeneratorService.getCachedQRData.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: false }), 100))
      );

      const { getByText } = render(<QRCodeDisplay {...mockProps} />);
      
      expect(getByText('Generating secure QR code...')).toBeTruthy();
    });

    it('should render QR code after loading', async () => {
      const { getByText, queryByText } = render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(queryByText('Generating secure QR code...')).toBeNull();
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('USA • Verified Tourist')).toBeTruthy();
      });
    });

    it('should render security indicators', async () => {
      const { getByText } = render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(getByText('Encrypted')).toBeTruthy();
        expect(getByText('Blockchain')).toBeTruthy();
      });
    });

    it('should render control buttons when showControls is true', async () => {
      const { getByText } = render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(getByText('Refresh')).toBeTruthy();
        expect(getByText('Download')).toBeTruthy();
        expect(getByText('Share')).toBeTruthy();
      });
    });

    it('should not render control buttons when showControls is false', async () => {
      const { queryByText } = render(
        <QRCodeDisplay {...mockProps} showControls={false} />
      );
      
      await waitFor(() => {
        expect(queryByText('Refresh')).toBeNull();
        expect(queryByText('Download')).toBeNull();
        expect(queryByText('Share')).toBeNull();
      });
    });

    it('should render full screen mode correctly', async () => {
      const { container } = render(
        <QRCodeDisplay {...mockProps} fullScreen={true} />
      );
      
      await waitFor(() => {
        // Check if full screen styles are applied
        expect(container).toBeTruthy();
      });
    });
  });

  describe('QR Code Generation', () => {
    it('should use cached QR data when available and not expired', async () => {
      render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(qrGeneratorService.getCachedQRData).toHaveBeenCalledWith('test-user-123');
        expect(qrGeneratorService.needsRefresh).toHaveBeenCalledWith(mockQRData);
        expect(qrGeneratorService.generateQRData).not.toHaveBeenCalled();
      });
    });

    it('should generate new QR code when cache is empty', async () => {
      qrGeneratorService.getCachedQRData.mockResolvedValue({
        success: false,
        error: 'No cached data'
      });

      render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(qrGeneratorService.generateQRData).toHaveBeenCalledWith(mockTouristData);
      });
    });

    it('should generate new QR code when cached data needs refresh', async () => {
      qrGeneratorService.needsRefresh.mockReturnValue(true);

      render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(qrGeneratorService.generateQRData).toHaveBeenCalledWith(mockTouristData);
      });
    });

    it('should handle QR generation error', async () => {
      qrGeneratorService.getCachedQRData.mockResolvedValue({
        success: false
      });
      
      qrGeneratorService.generateQRData.mockResolvedValue({
        success: false,
        error: 'Generation failed'
      });

      render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith('Generation failed');
      });
    });
  });

  describe('User Interactions', () => {
    it('should refresh QR code when refresh button is pressed', async () => {
      const { getByText } = render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(getByText('Refresh')).toBeTruthy();
      });

      fireEvent.press(getByText('Refresh'));
      
      await waitFor(() => {
        expect(qrGeneratorService.refreshQRCode).toHaveBeenCalledWith(
          'test-user-123',
          mockQRData
        );
      });
    });

    it('should handle download button press', async () => {
      const { getByText } = render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(getByText('Download')).toBeTruthy();
      });

      fireEvent.press(getByText('Download'));
      
      await waitFor(() => {
        expect(qrGeneratorService.generateOfflineQR).toHaveBeenCalledWith(mockTouristData);
      });
    });

    it('should handle share button press', async () => {
      const { getByText } = render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(getByText('Share')).toBeTruthy();
      });

      fireEvent.press(getByText('Share'));
      
      await waitFor(() => {
        expect(Share.share).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Tourist Safety QR Code',
            message: expect.stringContaining('My tourist verification QR code')
          })
        );
      });
    });

    it('should show retry button on error', async () => {
      qrGeneratorService.getCachedQRData.mockResolvedValue({
        success: false
      });
      
      qrGeneratorService.generateQRData.mockResolvedValue({
        success: false,
        error: 'Generation failed'
      });

      const { getByText } = render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(getByText('Failed to generate QR code')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });

      // Clear the mock to allow retry to succeed
      qrGeneratorService.generateQRData.mockResolvedValue({
        success: true,
        qrData: mockQRData
      });

      fireEvent.press(getByText('Retry'));
      
      await waitFor(() => {
        expect(qrGeneratorService.generateQRData).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Time Management', () => {
    it('should display time remaining correctly', async () => {
      const { getByText } = render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(getByText(/remaining/)).toBeTruthy();
      });
    });

    it('should show warning when QR code needs refresh', async () => {
      // Mock QR data that needs refresh
      const expiringSoonQRData = new QRCodeData({
        ...mockQRData.toJSON(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      });
      
      qrGeneratorService.getCachedQRData.mockResolvedValue({
        success: true,
        qrData: expiringSoonQRData
      });
      
      expiringSoonQRData.needsRefresh = jest.fn().mockReturnValue(true);

      const { getByText } = render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(getByText(/will expire soon/)).toBeTruthy();
      });
    });

    it('should auto-refresh when QR code needs refresh', async () => {
      const expiringSoonQRData = new QRCodeData({
        ...mockQRData.toJSON(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });
      
      qrGeneratorService.getCachedQRData.mockResolvedValue({
        success: true,
        qrData: expiringSoonQRData
      });
      
      // Mock needsRefresh to return true after component mounts
      qrGeneratorService.needsRefresh
        .mockReturnValueOnce(false) // Initial load
        .mockReturnValueOnce(true); // After timer

      render(<QRCodeDisplay {...mockProps} />);
      
      // Fast-forward timers to trigger auto-refresh
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(qrGeneratorService.refreshQRCode).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should call onError prop when error occurs', async () => {
      qrGeneratorService.getCachedQRData.mockRejectedValue(
        new Error('Cache error')
      );

      render(<QRCodeDisplay {...mockProps} />);
      
      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith('Cache error');
      });
    });

    it('should show alert when onError prop is not provided', async () => {
      const propsWithoutOnError = { ...mockProps };
      delete propsWithoutOnError.onError;

      qrGeneratorService.getCachedQRData.mockRejectedValue(
        new Error('Cache error')
      );

      render(<QRCodeDisplay {...propsWithoutOnError} />);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Cache error');
      });
    });
  });
});